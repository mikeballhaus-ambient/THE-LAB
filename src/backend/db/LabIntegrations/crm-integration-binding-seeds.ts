import type { Database } from 'better-sqlite3';
import { AppDatabaseServiceProxy as ChartBuilderDbProxy } from '@/apps/lab-chartbuilder/db/app-db-service';
import { AppDatabaseServiceProxy as FormsBuilderDbProxy } from '@/apps/lab-formsbuilder/db/app-db-service';
import type { DataConnectorsRepository, FormsRepository } from '@/apps/lab-formsbuilder/db/repositories';
import { provisionFormStubInFormsBuilderDb } from '../../lab-integrations/lab-integrations-form-stub-provisioner';
import { CRM_INTEGRATION_MANIFEST } from '@/shared/lab-integrations/crm-integration-manifest-builder';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import { applyManifestDefaultPlacementToBindingConfig } from '@/shared/lab-integrations/resolve-slot-default-placement';
import { FORMS_BUILDER_APP_ID } from '@/shared/config/forms-builder-url';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import appsService from '../Apps/apps-service';
import { appsRepository } from '../Apps/apps-repository';
import { buildRegistryDiscoveryContract } from '../../lab-integrations/build-registry-discovery-contract';
import { resolveIntegrationAppIdForService } from '@/shared/lab-integrations/resolve-integration-connector-server-url';
import {
  defaultChartKeyForStub,
  provisionChartStubInChartBuilderDb,
} from '../../lab-integrations/lab-integrations-chart-stub-provisioner';
import { LabIntegrationsError } from './lab-integrations-service';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';
import { CRM_TASK_FORM_KEY } from '@/apps/lab-crm/shared/config/task-form-keys';
import { CRM_TICKET_FORM_KEY } from '@/apps/lab-crm/shared/config/ticket-form-keys';
import { buildPlatformDiscoveryContract } from '@/shared/lab-integrations/build-platform-discovery-contract';
import { platformCatalogFormKey } from '@/shared/config/platform-catalog-form-keys';
import { catalogFormKey } from '@/shared/config/catalog-form-keys';
import {
  PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS,
  PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
  platformCatalogServiceDescriptorByServiceId,
} from '@/shared/lab-integrations/platform-catalog-integration-services';
import { isPlatformHostedIntegrationServiceId } from '@/shared/lab-integrations/platform-integration-service-ids';
import {
  CRM_APPROVAL_INTEGRATION_SLOTS,
  CRM_APPROVAL_SUBMIT_SLOT_LEGACY,
  CRM_LEDGER_INTEGRATION_SLOTS,
  CRM_LEDGER_POST_SLOT_LEGACY,
} from '@/apps/lab-crm/shared/constants/crm-integration-slots';

const CRM_HOST_APP_ID = 'app-lab-crm';

function resolveCrmManifestForSeeds(): AppLabIntegrationManifestV1 {
  try {
    const fromDb = appsRepository.getIntegrationManifest(CRM_HOST_APP_ID);
    if (fromDb) {
      return fromDb;
    }
  } catch {
    /* apps repository may be uninitialized in isolated seed tests */
  }
  return CRM_INTEGRATION_MANIFEST;
}

/** Published Forms Builder form (platform-forms-seed-data). */
export const CRM_QUOTES_INTEGRATION_FORM_KEY = 'form_1790963590212_43zxb2u';

const QUOTES_DIALOG_SLOTS = [
  'crm.quotes.create.dialog',
  'crm.quotes.edit.dialog',
  'crm.quotes.delete.dialog',
] as const;

/** Published Forms Builder forms (platform-forms-seed-data / task-list + help-desk). */
export const CRM_TASK_INTEGRATION_FORM_KEY = CRM_TASK_FORM_KEY;
export const CRM_TICKET_INTEGRATION_FORM_KEY = CRM_TICKET_FORM_KEY;

const CRM_TASK_DIALOG_SLOTS = [
  'crm.task.create.dialog',
  'crm.task.edit.dialog',
  'crm.task.delete.dialog',
] as const;

const CRM_TICKET_DIALOG_SLOTS = [
  'crm.ticket.create.dialog',
  'crm.ticket.edit.dialog',
  'crm.ticket.delete.dialog',
] as const;

function resolveApiHostBase(): string {
  const raw = process.env.BACKEND_URL ?? process.env.VITE_API_BASE_URL ?? 'http://localhost';
  return raw.replace(/\/$/, '').replace(/:\d+$/, '');
}

function buildDiscoveryContractForCrmSeed(serviceId: string): FormsBuilderContract {
  if (isPlatformHostedIntegrationServiceId(serviceId)) {
    const descriptor = platformCatalogServiceDescriptorByServiceId(serviceId);
    if (!descriptor) {
      throw new Error(`Platform integration service not found: ${serviceId}`);
    }
    return buildPlatformDiscoveryContract(CRM_HOST_APP_ID, descriptor, resolveApiHostBase());
  }
  return buildRegistryDiscoveryForSeed(CRM_HOST_APP_ID, serviceId);
}

function buildRegistryDiscoveryForSeed(hostAppId: string, serviceId: string): FormsBuilderContract {
  const manifest =
    hostAppId === CRM_HOST_APP_ID
      ? resolveCrmManifestForSeeds()
      : appsRepository.getIntegrationManifest(hostAppId);
  if (!manifest) {
    throw new Error(`Integration manifest not found for ${hostAppId}`);
  }
  const service = manifest.integrationServices?.find((row) => row.serviceId === serviceId);
  if (!service) {
    throw new Error(`Integration service not found: ${serviceId}`);
  }
  const connectorAppId = resolveIntegrationAppIdForService(hostAppId, serviceId);
  const app = appsService.getAppById(connectorAppId);
  const serverPort =
    app?.serverPort ?? app?.server?.port ?? (typeof app?.requiresPort === 'number' ? app.requiresPort : undefined);
  if (serverPort == null) {
    throw new Error(`App server port not configured for ${connectorAppId}`);
  }
  return buildRegistryDiscoveryContract(service, {
    appId: connectorAppId,
    serverPort,
    apiHostBase: resolveApiHostBase(),
  });
}

function seedBindingIdForSlot(slot: string): string {
  return `seed-binding-${slot.replace(/\./g, '-')}`;
}

/** CRM seed bindings reference user id 1; isolated tests may only insert other users. */
function ensureCreatedByUserId(db: Database, userId: number): void {
  const exists = db.prepare(`SELECT 1 AS ok FROM users WHERE id = ? LIMIT 1`).get(userId);
  if (exists) {
    return;
  }
  try {
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (?, 'integration-seed@lab.local', 'Integration seed', 'admin', 'active')`,
    ).run(userId);
  } catch {
    /* users table absent in minimal harnesses */
  }
}

function insertBindingIfMissing(
  db: Database,
  input: {
    slot: string;
    kind: 'form.surface' | 'chart.surface';
    providerAppId: string;
    providerRef: string;
    createdByUserId: number;
  },
): void {
  const bindingId = seedBindingIdForSlot(input.slot);
  const hostCandidates = [CRM_HOST_APP_ID, 'app-crm'];
  for (const hostAppId of hostCandidates) {
    const row = db
      .prepare(`SELECT id FROM lab_integration_bindings WHERE host_app_id = ? AND slot = ? LIMIT 1`)
      .get(hostAppId, input.slot) as { id: string } | undefined;
    if (row) {
      if (hostAppId !== CRM_HOST_APP_ID) {
        db.prepare(`UPDATE lab_integration_bindings SET host_app_id = ? WHERE id = ?`).run(
          CRM_HOST_APP_ID,
          row.id,
        );
      }
      return;
    }
  }
  const byId = db
    .prepare(`SELECT host_app_id FROM lab_integration_bindings WHERE id = ? LIMIT 1`)
    .get(bindingId) as { host_app_id: string } | undefined;
  if (byId) {
    if (byId.host_app_id !== CRM_HOST_APP_ID) {
      db.prepare(`UPDATE lab_integration_bindings SET host_app_id = ? WHERE id = ?`).run(
        CRM_HOST_APP_ID,
        bindingId,
      );
    }
    return;
  }

  const manifest = resolveCrmManifestForSeeds();
  const config = applyManifestDefaultPlacementToBindingConfig(
    manifest,
    input.slot,
    input.kind,
    { schemaVersion: 1 },
  );

  ensureCreatedByUserId(db, input.createdByUserId);

  db.prepare(
    `INSERT INTO lab_integration_bindings (
      id, host_app_id, slot, kind, provider_app_id, provider_ref, config_json, enabled, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  ).run(
    bindingId,
    CRM_HOST_APP_ID,
    input.slot,
    input.kind,
    input.providerAppId,
    input.providerRef,
    JSON.stringify(config),
    input.createdByUserId,
  );
}

/**
 * Idempotent lab_integration_bindings for CRM quotes (rm-64).
 * Inserts only when a slot has no row; does not overwrite user bindings.
 */
function syncCrmFormDialogBindingSeeds(
  db: Database,
  slots: readonly string[],
  formKey: string,
  createdByUserId: number,
): void {
  const trimmed = formKey.trim();
  if (!trimmed) {
    return;
  }
  for (const slot of slots) {
    insertBindingIfMissing(db, {
      slot,
      kind: 'form.surface',
      providerAppId: FORMS_BUILDER_APP_ID,
      providerRef: trimmed,
      createdByUserId,
    });
  }
}

async function ensureCrmSharedDialogFormStub(
  input: {
    serviceId: string;
    provisionSlot: string;
    suggestedFormKey: string;
    formName: string;
  },
  repos: { connectors: DataConnectorsRepository; forms: FormsRepository },
): Promise<string> {
  const suggestedFormKey = input.suggestedFormKey.trim();
  if (!suggestedFormKey) {
    return '';
  }
  const existingForm = await repos.forms.findByKey(suggestedFormKey);
  if (existingForm?.id) {
    return suggestedFormKey;
  }
  const contract = buildDiscoveryContractForCrmSeed(input.serviceId);
  try {
    const result = await provisionFormStubInFormsBuilderDb(
      {
        hostAppId: CRM_HOST_APP_ID,
        serviceId: input.serviceId,
        slot: input.provisionSlot,
        suggestedFormKey,
        publish: true,
        overwrite: false,
        contract,
        formName: input.formName,
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

async function resolveFormKeyWithStubProvision(
  input: {
    serviceId: string;
    provisionSlot: string;
    suggestedFormKey: string;
    formName: string;
  },
): Promise<string> {
  try {
    await FormsBuilderDbProxy.getInstance().initialize();
    const proxy = FormsBuilderDbProxy.getInstance();
    return await ensureCrmSharedDialogFormStub(input, {
      connectors: proxy.getDataConnectorsRepository(),
      forms: proxy.getFormsRepository(),
    });
  } catch {
    return input.suggestedFormKey.trim();
  }
}

export async function syncCrmQuotesIntegrationBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  const formKey = await resolveFormKeyWithStubProvision({
    serviceId: 'crm.quotes',
    provisionSlot: 'crm.quotes.create.dialog',
    suggestedFormKey: CRM_QUOTES_INTEGRATION_FORM_KEY,
    formName: 'CRM quote',
  });
  syncCrmFormDialogBindingSeeds(db, QUOTES_DIALOG_SLOTS, formKey, createdByUserId);
}

/** Related tasks on CRM records — slots use Task List service via `peerConnectorUrls`. */
export async function syncCrmTaskIntegrationBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  const formKey = await resolveFormKeyWithStubProvision({
    serviceId: 'task-list.tasks',
    provisionSlot: 'crm.task.create.dialog',
    suggestedFormKey: CRM_TASK_INTEGRATION_FORM_KEY,
    formName: 'CRM related task',
  });
  syncCrmFormDialogBindingSeeds(db, CRM_TASK_DIALOG_SLOTS, formKey, createdByUserId);
}

/** Related Help Desk tickets on CRM records. */
export async function syncCrmTicketIntegrationBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  const formKey = await resolveFormKeyWithStubProvision({
    serviceId: 'help-desk.tickets',
    provisionSlot: 'crm.ticket.create.dialog',
    suggestedFormKey: CRM_TICKET_INTEGRATION_FORM_KEY,
    formName: 'CRM related support ticket',
  });
  syncCrmFormDialogBindingSeeds(db, CRM_TICKET_DIALOG_SLOTS, formKey, createdByUserId);
}

async function resolveCrmPlatformBridgeFormKey(
  input: { serviceId: string; provisionSlot: string; formName: string },
): Promise<string> {
  const suggestedFormKey = platformCatalogFormKey(CRM_HOST_APP_ID, input.provisionSlot);
  try {
    await FormsBuilderDbProxy.getInstance().initialize();
    const proxy = FormsBuilderDbProxy.getInstance();
    return await ensureCrmSharedDialogFormStub(
      {
        serviceId: input.serviceId,
        provisionSlot: input.provisionSlot,
        suggestedFormKey,
        formName: input.formName,
      },
      {
        connectors: proxy.getDataConnectorsRepository(),
        forms: proxy.getFormsRepository(),
      },
    );
  } catch {
    return suggestedFormKey;
  }
}

/** Platform Approvals on CRM records (decide dialog only; submit is event-driven). */
export async function syncCrmApprovalIntegrationBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  db.prepare(
    `DELETE FROM lab_integration_bindings WHERE host_app_id = ? AND slot = ?`,
  ).run(CRM_HOST_APP_ID, CRM_APPROVAL_SUBMIT_SLOT_LEGACY);

  const decideKey = await resolveCrmPlatformBridgeFormKey({
    serviceId: PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS,
    provisionSlot: CRM_APPROVAL_INTEGRATION_SLOTS.decide,
    formName: 'CRM approval decide',
  });
  syncCrmFormDialogBindingSeeds(
    db,
    [CRM_APPROVAL_INTEGRATION_SLOTS.decide],
    decideKey,
    createdByUserId,
  );
}

/** Platform Financial Ledger — account create only; journal post is event-driven on deal records. */
export async function syncCrmLedgerIntegrationBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  db.prepare(
    `DELETE FROM lab_integration_bindings WHERE host_app_id = ? AND slot = ?`,
  ).run(CRM_HOST_APP_ID, CRM_LEDGER_POST_SLOT_LEGACY);

  const accountKey = await resolveCrmPlatformBridgeFormKey({
    serviceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
    provisionSlot: CRM_LEDGER_INTEGRATION_SLOTS.createAccount,
    formName: 'CRM ledger account',
  });
  syncCrmFormDialogBindingSeeds(
    db,
    [CRM_LEDGER_INTEGRATION_SLOTS.createAccount],
    accountKey,
    createdByUserId,
  );
}

/** Chart stubs in Chart Builder + bindings for CRM dashboard `reports.*` slots. */
export async function syncCrmChartIntegrationBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  const crmManifest = resolveCrmManifestForSeeds();
  const chartAccepts = crmManifest.accepts?.filter((row) => row.kind === 'chart.surface') ?? [];
  if (chartAccepts.length === 0) {
    return;
  }

  await ChartBuilderDbProxy.getInstance().initialize();
  const proxy = ChartBuilderDbProxy.getInstance();
  const repos = {
    connectors: proxy.getDataConnectorsRepository(),
    charts: proxy.getChartsRepository(),
  };

  for (const accept of chartAccepts) {
    const slot = accept.slot;
    const serviceId = accept.requiresServiceId;
    if (!serviceId) {
      continue;
    }

    const exists = db
      .prepare(
        `SELECT 1 FROM lab_integration_bindings WHERE host_app_id = ? AND slot = ? LIMIT 1`,
      )
      .get(CRM_HOST_APP_ID, slot);
    if (exists) {
      continue;
    }

    let chartKey = defaultChartKeyForStub(CRM_HOST_APP_ID, serviceId, slot);
    try {
      const contract = buildDiscoveryContractForCrmSeed(serviceId);
      const result = await provisionChartStubInChartBuilderDb(
        {
          hostAppId: CRM_HOST_APP_ID,
          serviceId,
          slot,
          publish: true,
          overwrite: false,
          contract,
          chartName: accept.label ?? slot,
        },
        repos,
      );
      chartKey = result.chartKey;
    } catch (err) {
      if (!(err instanceof LabIntegrationsError && err.code === 'CONFLICT')) {
        throw err;
      }
    }

    insertBindingIfMissing(db, {
      slot,
      kind: 'chart.surface',
      providerAppId: CHART_BUILDER_APP_ID,
      providerRef: chartKey,
      createdByUserId,
    });
  }
}

/**
 * Per-entity create/edit/delete dialogs (`crm.<entityKey>.{create,edit,delete}.dialog`).
 *
 * These slots are generated from the CRM entity list, so they cannot be enumerated as constants —
 * which is exactly why they were missed: the named-slot seeds above cover quotes/task/ticket and the
 * platform bridges, and nothing iterated the *generated* accepts. `openEntityCreate()` in
 * `useCrmIntegrations.ts` returns early when the slot has no enabled binding, so every entity's
 * **New / Edit / Delete** button was silently inert.
 *
 * Driven off the manifest's own `accepts`, so an entity added later is seeded without touching this
 * function. Only `form.surface` slots that have a `requiresServiceId` are handled; the explicit
 * bridge slots are already seeded by the functions above and are skipped via the `skip` set.
 */
export async function syncCrmEntityFormIntegrationBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  const crmManifest = resolveCrmManifestForSeeds();
  const explicitSlots = new Set<string>([
    ...QUOTES_DIALOG_SLOTS,
    ...CRM_TASK_DIALOG_SLOTS,
    ...CRM_TICKET_DIALOG_SLOTS,
    CRM_APPROVAL_INTEGRATION_SLOTS.decide,
    CRM_APPROVAL_SUBMIT_SLOT_LEGACY,
    CRM_LEDGER_INTEGRATION_SLOTS.createAccount,
    CRM_LEDGER_POST_SLOT_LEGACY,
  ]);

  const entityAccepts = (crmManifest.accepts ?? []).filter(
    (row) =>
      row.kind === 'form.surface'
      && !explicitSlots.has(row.slot)
      && Boolean(row.requiresServiceId),
  );
  if (entityAccepts.length === 0) {
    return;
  }

  let formsProxy: ReturnType<typeof FormsBuilderDbProxy.getInstance> | null = null;
  try {
    await FormsBuilderDbProxy.getInstance().initialize();
    formsProxy = FormsBuilderDbProxy.getInstance();
  } catch {
    formsProxy = null;
  }

  for (const accept of entityAccepts) {
    const serviceId = accept.requiresServiceId as string;
    const suggestedFormKey = catalogFormKey(CRM_HOST_APP_ID, accept.slot).trim();
    if (!suggestedFormKey) {
      continue;
    }

    let formKey = suggestedFormKey;
    if (formsProxy) {
      try {
        formKey = await ensureCrmSharedDialogFormStub(
          {
            serviceId,
            provisionSlot: accept.slot,
            suggestedFormKey,
            formName: accept.label ?? accept.slot,
          },
          {
            connectors: formsProxy.getDataConnectorsRepository(),
            forms: formsProxy.getFormsRepository(),
          },
        );
      } catch (err) {
        // Keep the binding even if the stub could not be written — an unbound slot is inert,
        // whereas a binding with a missing form surfaces a load error the owner can act on.
        console.warn(`[crm-integration-binding-seeds] stub ${accept.slot}:`, err);
      }
    }

    insertBindingIfMissing(db, {
      slot: accept.slot,
      kind: 'form.surface',
      providerAppId: FORMS_BUILDER_APP_ID,
      providerRef: formKey,
      createdByUserId,
    });
  }
}

/** Host-wide CRM dialogs (quotes + related tasks/tickets on any entity record). */
export async function syncCrmSharedFormIntegrationBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  await syncCrmQuotesIntegrationBindingSeeds(db, createdByUserId);
  await syncCrmTaskIntegrationBindingSeeds(db, createdByUserId);
  await syncCrmTicketIntegrationBindingSeeds(db, createdByUserId);
  await syncCrmApprovalIntegrationBindingSeeds(db, createdByUserId);
  await syncCrmLedgerIntegrationBindingSeeds(db, createdByUserId);
  await syncCrmEntityFormIntegrationBindingSeeds(db, createdByUserId);
}

export async function syncCrmIntegrationBindingSeeds(
  db: Database,
  createdByUserId = 1,
): Promise<void> {
  await syncCrmSharedFormIntegrationBindingSeeds(db, createdByUserId);
  await syncCrmChartIntegrationBindingSeeds(db, createdByUserId);
}
