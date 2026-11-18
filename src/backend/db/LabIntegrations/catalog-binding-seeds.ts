import type { Database } from 'better-sqlite3';
import { AppDatabaseServiceProxy as FormsBuilderDbProxy } from '@/apps/lab-formsbuilder/db/app-db-service';
import type { DataConnectorsRepository, FormsRepository } from '@/apps/lab-formsbuilder/db/repositories';
import { AppDatabaseServiceProxy as ChartBuilderDbProxy } from '@/apps/lab-chartbuilder/db/app-db-service';
import type {
  ChartsRepository as ChartBuilderChartsRepository,
  DataConnectorsRepository as ChartBuilderConnectorsRepository,
} from '@/apps/lab-chartbuilder/db/repositories';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import { catalogChartKey } from '@/shared/config/catalog-chart-keys';
import { FORMS_BUILDER_APP_ID } from '@/shared/config/forms-builder-url';
import { catalogFormKey } from '@/shared/config/catalog-form-keys';
import { provisionChartStubInChartBuilderDb } from '../../lab-integrations/lab-integrations-chart-stub-provisioner';
import { buildCatalogAppDiscoveryContract } from '@/shared/lab-integrations/build-catalog-app-discovery-contract';
import {
  CATALOG_HOST_APP_IDS,
  OBSOLETE_CATALOG_SLOTS,
  catalogServiceDescriptor,
} from '@/shared/lab-integrations/catalog-manifests';
import { applyManifestDefaultPlacementToBindingConfig } from '@/shared/lab-integrations/resolve-slot-default-placement';
import { appsRepository } from '../Apps/apps-repository';
import { provisionFormStubInFormsBuilderDb } from '../../lab-integrations/lab-integrations-form-stub-provisioner';
import { LabIntegrationsError } from './lab-integrations-service';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';

function resolveApiHostBase(): string {
  const raw = process.env.BACKEND_URL ?? process.env.VITE_API_BASE_URL ?? 'http://localhost';
  return raw.replace(/\/$/, '').replace(/:\d+$/, '');
}

function manifestForHost(hostAppId: string): AppLabIntegrationManifestV1 | null {
  try {
    return appsRepository.getIntegrationManifest(hostAppId);
  } catch {
    return null;
  }
}

function resolveHostAppPort(hostAppId: string): number {
  const app = appsRepository.getAppsById(hostAppId);
  const port = app?.server?.port;
  if (typeof port === 'number' && port > 0) {
    return port;
  }
  return 4117;
}

function seedBindingIdForSlot(hostAppId: string, slot: string): string {
  return `seed-binding-${hostAppId.replace(/^app-/, '')}-${slot.replace(/\./g, '-')}`;
}

function insertBindingIfMissing(
  db: Database,
  input: {
    hostAppId: string;
    slot: string;
    kind: 'form.surface' | 'chart.surface';
    providerAppId: string;
    providerRef: string;
    createdByUserId: number;
  },
): void {
  const exists = db
    .prepare(`SELECT 1 FROM lab_integration_bindings WHERE host_app_id = ? AND slot = ? LIMIT 1`)
    .get(input.hostAppId, input.slot);
  if (exists) {
    return;
  }

  const manifest = manifestForHost(input.hostAppId);
  const config = manifest
    ? applyManifestDefaultPlacementToBindingConfig(manifest, input.slot, input.kind, {
        schemaVersion: 1,
      })
    : { schemaVersion: 1 };

  db.prepare(
    `INSERT INTO lab_integration_bindings (
      id, host_app_id, slot, kind, provider_app_id, provider_ref, config_json, enabled, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  ).run(
    seedBindingIdForSlot(input.hostAppId, input.slot),
    input.hostAppId,
    input.slot,
    input.kind,
    input.providerAppId,
    input.providerRef,
    JSON.stringify(config),
    input.createdByUserId,
  );
}

async function ensureFormStubForSlot(
  hostAppId: string,
  serviceId: string,
  slot: string,
  formName: string,
  repos: { connectors: DataConnectorsRepository; forms: FormsRepository },
): Promise<string> {
  const descriptor = catalogServiceDescriptor(serviceId);
  if (!descriptor) {
    return '';
  }
  const appFolder = hostAppId.replace(/^app-/, '');
  const port = resolveHostAppPort(hostAppId);
  const suggestedFormKey = catalogFormKey(hostAppId, slot);
  const contract = buildCatalogAppDiscoveryContract(
    appFolder,
    descriptor,
    resolveApiHostBase(),
    port,
  );
  const existing = await repos.forms.findByKey(suggestedFormKey);
  const overwrite = Boolean(existing?.formKey);
  try {
    const result = await provisionFormStubInFormsBuilderDb(
      {
        hostAppId,
        serviceId,
        slot,
        suggestedFormKey,
        publish: true,
        overwrite,
        contract,
        formName,
      },
      repos,
    );
    return result.formKey;
  } catch (err) {
    if (err instanceof LabIntegrationsError && err.code === 'CONFLICT') {
      return suggestedFormKey;
    }
    throw err;
  }
}

async function syncHostDialogStubsAndBindings(
  db: Database,
  hostAppId: string,
  createdByUserId: number,
  repos: { connectors: DataConnectorsRepository; forms: FormsRepository },
): Promise<void> {
  const manifest = manifestForHost(hostAppId);
  if (!manifest?.accepts?.length) {
    return;
  }
  for (const accept of manifest.accepts) {
    if (accept.kind !== 'form.surface') {
      continue;
    }
    const serviceId = accept.requiresServiceId;
    if (!serviceId) {
      continue;
    }
    const slot = accept.slot;
    const formKey = await ensureFormStubForSlot(
      hostAppId,
      serviceId,
      slot,
      accept.label ?? slot,
      repos,
    );
    if (!formKey) {
      continue;
    }
    insertBindingIfMissing(db, {
      hostAppId,
      slot,
      kind: 'form.surface',
      providerAppId: FORMS_BUILDER_APP_ID,
      providerRef: formKey,
      createdByUserId,
    });
  }
}

async function ensureChartStubForSlot(
  hostAppId: string,
  serviceId: string,
  slot: string,
  chartName: string,
  repos: {
    connectors: ChartBuilderConnectorsRepository;
    charts: ChartBuilderChartsRepository;
  },
): Promise<string> {
  const descriptor = catalogServiceDescriptor(serviceId);
  if (!descriptor) {
    return '';
  }
  const appFolder = hostAppId.replace(/^app-/, '');
  const port = resolveHostAppPort(hostAppId);
  const suggestedChartKey = catalogChartKey(hostAppId, slot);
  const contract = buildCatalogAppDiscoveryContract(
    appFolder,
    descriptor,
    resolveApiHostBase(),
    port,
  );
  const existing = repos.charts.findByKey(suggestedChartKey);
  try {
    await provisionChartStubInChartBuilderDb(
      {
        hostAppId,
        serviceId,
        slot,
        suggestedChartKey,
        publish: true,
        overwrite: Boolean(existing),
        contract,
        chartName,
      },
      repos,
    );
    return suggestedChartKey;
  } catch (err) {
    console.warn(`[catalog-binding-seeds] chart stub ${hostAppId} ${slot}:`, err);
    return suggestedChartKey;
  }
}

async function syncHostChartStubsAndBindings(
  db: Database,
  hostAppId: string,
  createdByUserId: number,
  repos: {
    connectors: ChartBuilderConnectorsRepository;
    charts: ChartBuilderChartsRepository;
  },
): Promise<void> {
  const manifest = manifestForHost(hostAppId);
  if (!manifest?.accepts?.length) {
    return;
  }
  for (const accept of manifest.accepts) {
    if (accept.kind !== 'chart.surface') {
      continue;
    }
    const serviceId = accept.requiresServiceId;
    if (!serviceId) {
      continue;
    }
    const slot = accept.slot;
    const chartKey = await ensureChartStubForSlot(
      hostAppId,
      serviceId,
      slot,
      accept.label ?? slot,
      repos,
    );
    if (!chartKey) {
      continue;
    }
    insertBindingIfMissing(db, {
      hostAppId,
      slot,
      kind: 'chart.surface',
      providerAppId: CHART_BUILDER_APP_ID,
      providerRef: chartKey,
      createdByUserId,
    });
  }
}

/**
 * Delete seed-created bindings for slots that no longer exist in a manifest.
 *
 * Only rows whose id matches `seedBindingIdForSlot()` are removed, so a binding an admin
 * re-pointed by hand at another provider is left alone.
 */
function pruneObsoleteSeedBindings(db: Database): number {
  let removed = 0;
  for (const { hostAppId, slot } of OBSOLETE_CATALOG_SLOTS) {
    const seedId = seedBindingIdForSlot(hostAppId, slot);
    const result = db
      .prepare('DELETE FROM lab_integration_bindings WHERE id = ? AND host_app_id = ?')
      .run(seedId, hostAppId);
    removed += result.changes;
  }
  return removed;
}

export async function syncCatalogBindingSeeds(db: Database): Promise<void> {
  await FormsBuilderDbProxy.getInstance().initialize();
  const proxy = FormsBuilderDbProxy.getInstance();
  const connectors = proxy.getDataConnectorsRepository();
  const forms = proxy.getFormsRepository();
  const createdByUserId = 1;

  for (const hostAppId of CATALOG_HOST_APP_IDS) {
    try {
      await syncHostDialogStubsAndBindings(db, hostAppId, createdByUserId, {
        connectors,
        forms,
      });
    } catch (err) {
      console.warn(`[catalog-binding-seeds] ${hostAppId} form skipped:`, err);
    }
  }

  pruneObsoleteSeedBindings(db);

  try {
    await ChartBuilderDbProxy.getInstance().initialize();
    const chartProxy = ChartBuilderDbProxy.getInstance();
    const chartRepos = {
      connectors: chartProxy.getDataConnectorsRepository(),
      charts: chartProxy.getChartsRepository(),
    };
    for (const hostAppId of CATALOG_HOST_APP_IDS) {
      try {
        await syncHostChartStubsAndBindings(db, hostAppId, createdByUserId, chartRepos);
      } catch (err) {
        console.warn(`[catalog-binding-seeds] ${hostAppId} chart skipped:`, err);
      }
    }
  } catch (err) {
    console.warn('[catalog-binding-seeds] Chart Builder init skipped:', err);
  }
}
