import type { Database } from 'better-sqlite3';
import { AppDatabaseServiceProxy as ChartBuilderDbProxy } from '@/apps/lab-chartbuilder/db/app-db-service';
import { AppDatabaseServiceProxy as FormsBuilderDbProxy } from '@/apps/lab-formsbuilder/db/app-db-service';
import type { DataConnectorsRepository, FormsRepository } from '@/apps/lab-formsbuilder/db/repositories';
import { FORMS_BUILDER_APP_ID } from '@/shared/config/forms-builder-url';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import {
  LEDGER_ACCOUNT_BALANCES_CHART_KEY,
  LEDGER_ACTIVITY_CHART_KEY,
  LEDGER_POSTINGS_BY_CREDIT_CHART_KEY,
  platformCatalogFormKey,
} from '@/shared/config/platform-catalog-form-keys';
import { buildPlatformDiscoveryContract } from '@/shared/lab-integrations/build-platform-discovery-contract';
import { platformCatalogServiceDescriptorByServiceId } from '@/shared/lab-integrations/platform-catalog-integration-services';
import {
  PLATFORM_APP_BUILDER_APP_ID,
  PLATFORM_APPROVALS_APP_ID,
  FINANCIAL_LEDGER_INTEGRATION_MANIFEST,
  PLATFORM_LEDGER_APP_ID,
} from '@/shared/lab-integrations/platform-catalog-manifests';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import { applyManifestDefaultPlacementToBindingConfig } from '@/shared/lab-integrations/resolve-slot-default-placement';
import { appsRepository } from '../Apps/apps-repository';
import { provisionFormStubInFormsBuilderDb } from '../../lab-integrations/lab-integrations-form-stub-provisioner';
import {
  defaultChartKeyForStub,
  provisionChartStubInChartBuilderDb,
} from '../../lab-integrations/lab-integrations-chart-stub-provisioner';
import { LabIntegrationsError } from './lab-integrations-service';
import { LAB_LEDGER_CHART_SLOTS } from '@/shared/lab-integrations/platform-catalog-integration-services';

const PLATFORM_CATALOG_HOSTS = [
  PLATFORM_APPROVALS_APP_ID,
  PLATFORM_LEDGER_APP_ID,
  PLATFORM_APP_BUILDER_APP_ID,
] as const;

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
    .prepare(
      `SELECT 1 FROM lab_integration_bindings WHERE host_app_id = ? AND slot = ? LIMIT 1`,
    )
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
  const descriptor = platformCatalogServiceDescriptorByServiceId(serviceId);
  if (!descriptor) {
    return '';
  }
  const suggestedFormKey = platformCatalogFormKey(hostAppId, slot);
  const contract = buildPlatformDiscoveryContract(hostAppId, descriptor, resolveApiHostBase());
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
    const descriptor = platformCatalogServiceDescriptorByServiceId(serviceId);
    if (!descriptor) {
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

const LEDGER_CHART_KEY_BY_SLOT: Record<string, string> = {
  [LAB_LEDGER_CHART_SLOTS.activityByDebit]: LEDGER_ACTIVITY_CHART_KEY,
  [LAB_LEDGER_CHART_SLOTS.postingsByCredit]: LEDGER_POSTINGS_BY_CREDIT_CHART_KEY,
  [LAB_LEDGER_CHART_SLOTS.accountBalances]: LEDGER_ACCOUNT_BALANCES_CHART_KEY,
};

async function syncLedgerJournalChartStubsAndBindings(
  db: Database,
  createdByUserId: number,
): Promise<void> {
  const chartAccepts =
    FINANCIAL_LEDGER_INTEGRATION_MANIFEST.accepts?.filter((row) => row.kind === 'chart.surface') ?? [];
  if (chartAccepts.length === 0) {
    return;
  }

  await ChartBuilderDbProxy.getInstance().initialize();
  const proxy = ChartBuilderDbProxy.getInstance();
  const repos = {
    connectors: proxy.getDataConnectorsRepository(),
    charts: proxy.getChartsRepository(),
  };
  const hostAppId = PLATFORM_LEDGER_APP_ID;

  for (const accept of chartAccepts) {
    const slot = accept.slot;
    const serviceId = accept.requiresServiceId;
    if (!serviceId) {
      continue;
    }
    const suggestedChartKey = LEDGER_CHART_KEY_BY_SLOT[slot] ?? defaultChartKeyForStub(hostAppId, serviceId, slot);
    const descriptor = platformCatalogServiceDescriptorByServiceId(serviceId);
    if (!descriptor) {
      continue;
    }
    const existing = repos.charts.findByKey(suggestedChartKey);
    try {
      const contract = buildPlatformDiscoveryContract(hostAppId, descriptor, resolveApiHostBase());
      await provisionChartStubInChartBuilderDb(
        {
          hostAppId,
          serviceId,
          slot,
          suggestedChartKey,
          publish: true,
          overwrite: Boolean(existing),
          contract,
          chartName: accept.label ?? slot,
        },
        repos,
      );
    } catch (err) {
      console.warn(`[platform-catalog-binding-seeds] Ledger chart stub skipped (${slot}):`, err);
    }

    insertBindingIfMissing(db, {
      hostAppId,
      slot,
      kind: 'chart.surface',
      providerAppId: CHART_BUILDER_APP_ID,
      providerRef: suggestedChartKey,
      createdByUserId,
    });
  }
}

/**
 * Wave B — platform catalog apps: connector-backed FB stubs (create/edit/delete) + bindings.
 */
function disableObsoleteSampleDialogBindings(db: Database): void {
  const hosts = [...PLATFORM_CATALOG_HOSTS];
  for (const hostAppId of hosts) {
    db.prepare(
      `UPDATE lab_integration_bindings SET enabled = 0
       WHERE host_app_id = ? AND slot LIKE '%.sample.dialog' AND enabled = 1`,
    ).run(hostAppId);
  }
}

export async function syncPlatformCatalogBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  disableObsoleteSampleDialogBindings(db);
  try {
    await FormsBuilderDbProxy.getInstance().initialize();
    const proxy = FormsBuilderDbProxy.getInstance();
    const repos = {
      connectors: proxy.getDataConnectorsRepository(),
      forms: proxy.getFormsRepository(),
    };

    for (const hostAppId of PLATFORM_CATALOG_HOSTS) {
      await syncHostDialogStubsAndBindings(db, hostAppId, createdByUserId, repos);
    }
  } catch (err) {
    console.warn('[platform-catalog-binding-seeds] Form stub/bindings skipped:', err);
  }

  try {
    await syncLedgerJournalChartStubsAndBindings(db, createdByUserId);
  } catch (err) {
    console.warn('[platform-catalog-binding-seeds] Ledger chart bindings skipped:', err);
  }
}
