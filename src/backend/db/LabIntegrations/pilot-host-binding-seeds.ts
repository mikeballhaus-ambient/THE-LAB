import type { Database } from 'better-sqlite3';
import { AppDatabaseServiceProxy as FormsBuilderDbProxy } from '@/apps/lab-formsbuilder/db/app-db-service';
import type { DataConnectorsRepository, FormsRepository } from '@/apps/lab-formsbuilder/db/repositories';
import { AppDatabaseServiceProxy as ChartBuilderDbProxy } from '@/apps/lab-chartbuilder/db/app-db-service';
import type {
  ChartsRepository as ChartBuilderChartsRepository,
  DataConnectorsRepository as ChartBuilderConnectorsRepository,
} from '@/apps/lab-chartbuilder/db/repositories';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import { FORMS_BUILDER_APP_ID } from '@/shared/config/forms-builder-url';
import { catalogChartKey } from '@/shared/config/catalog-chart-keys';
import { catalogFormKey } from '@/shared/config/catalog-form-keys';
import { applyManifestDefaultPlacementToBindingConfig } from '@/shared/lab-integrations/resolve-slot-default-placement';
import { GOLDEN_INTEGRATION_PILOT_HOST_IDS } from '@/shared/types/lab-integration-seed-pack';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import { appsRepository } from '../Apps/apps-repository';
import { buildRegistryDiscoveryContract } from '../../lab-integrations/build-registry-discovery-contract';
import { provisionFormStubInFormsBuilderDb } from '../../lab-integrations/lab-integrations-form-stub-provisioner';
import { provisionChartStubInChartBuilderDb } from '../../lab-integrations/lab-integrations-chart-stub-provisioner';

/**
 * Pilot hosts (Task List, Help Desk) are Wave A apps, so they are not part of the Wave C
 * catalog manifest list. Their services live in their own registry manifests rather than
 * `CATALOG_MANIFEST_SEEDS`, which is why `catalogServiceDescriptor()` cannot resolve them.
 *
 * These seeds therefore build the discovery contract from each host's **own** manifest and
 * provision the Forms Builder / Chart Builder stubs the host renders at runtime. Without
 * them the host's `openSlot()` opens an empty dialog, because every slot in these apps is
 * binding-driven (`LabIntegrationSurface` renders nothing when no binding exists).
 */

const DEFAULT_PILOT_APP_PORTS: Record<string, number> = {
  'app-lab-tasklist': 3005,
  'app-lab-helpdesk': 3012,
  // Discovery contract for the connector stubs points at this port, so it must be right even when
  // the registry row is unavailable (isolated seed tests).
  'app-lab-chartbuilder': 3013,
};

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
  try {
    const app = appsRepository.getAppsById(hostAppId);
    const port = app?.server?.port;
    if (typeof port === 'number' && port > 0) {
      return port;
    }
  } catch {
    /* registry may be uninitialized in isolated seed tests */
  }
  return DEFAULT_PILOT_APP_PORTS[hostAppId] ?? 3000;
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

/** Build the discovery contract for a pilot host service from that host's own manifest. */
function buildPilotDiscoveryContract(
  hostAppId: string,
  serviceId: string,
): FormsBuilderContract {
  const manifest = manifestForHost(hostAppId);
  if (!manifest) {
    throw new Error(`Integration manifest not found for ${hostAppId}`);
  }
  const service = manifest.integrationServices?.find((row) => row.serviceId === serviceId);
  if (!service) {
    throw new Error(`Integration service not found: ${hostAppId} / ${serviceId}`);
  }
  return buildRegistryDiscoveryContract(service, {
    appId: hostAppId,
    serverPort: resolveHostAppPort(hostAppId),
    apiHostBase: resolveApiHostBase(),
  });
}

async function ensureFormStubForSlot(
  hostAppId: string,
  serviceId: string,
  slot: string,
  formName: string,
  repos: { connectors: DataConnectorsRepository; forms: FormsRepository },
): Promise<string> {
  const suggestedFormKey = catalogFormKey(hostAppId, slot);
  const existing = await repos.forms.findByKey(suggestedFormKey);
  const contract = buildPilotDiscoveryContract(hostAppId, serviceId);
  await provisionFormStubInFormsBuilderDb(
    {
      hostAppId,
      serviceId,
      slot,
      suggestedFormKey,
      publish: true,
      overwrite: Boolean(existing?.formKey),
      contract,
      formName,
    },
    repos,
  );
  return suggestedFormKey;
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
  const suggestedChartKey = catalogChartKey(hostAppId, slot);
  const contract = buildPilotDiscoveryContract(hostAppId, serviceId);
  await provisionChartStubInChartBuilderDb(
    {
      hostAppId,
      serviceId,
      slot,
      suggestedChartKey,
      publish: true,
      overwrite: Boolean(repos.charts.findByKey(suggestedChartKey)),
      contract,
      chartName,
    },
    repos,
  );
  return suggestedChartKey;
}

/**
 * Optional per-host allowlist of `form.surface` slots to seed.
 *
 * Chart Builder needs this. Its manifest declares **five** form slots, but only the three
 * connector slots are meant to be binding-driven: `chart.designer.metadata` and
 * `chart.designer.connector` are rendered inline by the app's own `ChartDesignerForm`. Binding
 * those two would swap a working native editor for a generated stub — a regression dressed up as
 * a fix. Listing the connector slots explicitly keeps the seeder honest about what it owns.
 */
const PILOT_FORM_SLOT_ALLOWLIST: Record<string, readonly string[]> = {
  'app-lab-chartbuilder': [
    'chart.connector.create.dialog',
    'chart.connector.edit.dialog',
    'chart.connector.delete.dialog',
    // Chart delete is binding-driven too (`onChartRequestDelete` → `tryOpenIntegrationSlot`), so
    // without this it falls through to `notifyUnboundSlot` and deleting a chart does nothing.
    'chart.delete.dialog',
  ],
};

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
  const allowlist = PILOT_FORM_SLOT_ALLOWLIST[hostAppId];
  for (const accept of manifest.accepts) {
    if (accept.kind !== 'form.surface') {
      continue;
    }
    if (allowlist && !allowlist.includes(accept.slot)) {
      continue;
    }
    const serviceId = accept.requiresServiceId;
    if (!serviceId) {
      console.warn(`[pilot-host-binding-seeds] ${hostAppId} ${accept.slot}: no requiresServiceId`);
      continue;
    }
    const formKey = await ensureFormStubForSlot(
      hostAppId,
      serviceId,
      accept.slot,
      accept.label ?? accept.slot,
      repos,
    );
    insertBindingIfMissing(db, {
      hostAppId,
      slot: accept.slot,
      kind: 'form.surface',
      providerAppId: FORMS_BUILDER_APP_ID,
      providerRef: formKey,
      createdByUserId,
    });
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
      console.warn(`[pilot-host-binding-seeds] ${hostAppId} ${accept.slot}: no requiresServiceId`);
      continue;
    }
    const chartKey = await ensureChartStubForSlot(
      hostAppId,
      serviceId,
      accept.slot,
      accept.label ?? accept.slot,
      repos,
    );
    insertBindingIfMissing(db, {
      hostAppId,
      slot: accept.slot,
      kind: 'chart.surface',
      providerAppId: CHART_BUILDER_APP_ID,
      providerRef: chartKey,
      createdByUserId,
    });
  }
}

/**
 * Idempotent bindings + provider stubs for the pilot hosts that render `LabIntegrationSurface`
 * but are not Wave C catalog hosts. Inserts only when a slot has no row, so wizard edits win.
 */
export async function syncPilotHostBindingSeeds(db: Database): Promise<void> {
  const createdByUserId = 1;

  try {
    await FormsBuilderDbProxy.getInstance().initialize();
    const proxy = FormsBuilderDbProxy.getInstance();
    const repos = {
      connectors: proxy.getDataConnectorsRepository(),
      forms: proxy.getFormsRepository(),
    };
    for (const hostAppId of GOLDEN_INTEGRATION_PILOT_HOST_IDS) {
      try {
        await syncHostDialogStubsAndBindings(db, hostAppId, createdByUserId, repos);
      } catch (err) {
        console.warn(`[pilot-host-binding-seeds] ${hostAppId} form skipped:`, err);
      }
    }
  } catch (err) {
    console.warn('[pilot-host-binding-seeds] Forms Builder init skipped:', err);
  }

  try {
    await ChartBuilderDbProxy.getInstance().initialize();
    const chartProxy = ChartBuilderDbProxy.getInstance();
    const repos = {
      connectors: chartProxy.getDataConnectorsRepository(),
      charts: chartProxy.getChartsRepository(),
    };
    for (const hostAppId of GOLDEN_INTEGRATION_PILOT_HOST_IDS) {
      try {
        await syncHostChartStubsAndBindings(db, hostAppId, createdByUserId, repos);
      } catch (err) {
        console.warn(`[pilot-host-binding-seeds] ${hostAppId} chart skipped:`, err);
      }
    }
  } catch (err) {
    console.warn('[pilot-host-binding-seeds] Chart Builder init skipped:', err);
  }
}
