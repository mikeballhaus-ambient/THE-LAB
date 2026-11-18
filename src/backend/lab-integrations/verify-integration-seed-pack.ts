import type { Database } from 'better-sqlite3';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { labIntegrationsRepository } from '@/backend/db/LabIntegrations/lab-integrations-repository';
import {
  GOLDEN_CRM_FORM_DIALOG_SLOTS,
  GOLDEN_INTEGRATION_BINDING_HOST_IDS,
  GOLDEN_INTEGRATION_MANIFEST_HOST_IDS,
  type LabIntegrationSeedPackVerifyResult,
} from '@/shared/types/lab-integration-seed-pack';

function bindingCountForHost(db: Database, hostAppId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM lab_integration_bindings WHERE host_app_id = ?`)
    .get(hostAppId) as { c: number };
  return row.c;
}

function totalBindingCount(db: Database): number {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM lab_integration_bindings`).get() as { c: number };
  return row.c;
}

const INTEGRATION_PROVIDER_HOST_IDS = new Set(['app-lab-formsbuilder', 'app-lab-chartbuilder']);

export function verifyIntegrationManifestSeeds(): string[] {
  const errors: string[] = [];
  for (const hostAppId of GOLDEN_INTEGRATION_MANIFEST_HOST_IDS) {
    try {
      const manifest = appsRepository.getIntegrationManifest(hostAppId);
      if (!manifest) {
        errors.push(`Missing integration manifest for ${hostAppId}`);
        continue;
      }
      const isProvider = INTEGRATION_PROVIDER_HOST_IDS.has(hostAppId);
      const hasHostSlots = (manifest.accepts?.length ?? 0) > 0;
      const hasOffers = (manifest.offers?.length ?? 0) > 0;
      if (isProvider) {
        if (!hasOffers) {
          errors.push(`${hostAppId}: provider manifest has no offers`);
        }
      } else if (!hasHostSlots) {
        errors.push(`${hostAppId}: host manifest has no accepts slots`);
      }
      const hasServices = (manifest.integrationServices?.length ?? 0) > 0;
      if (!isProvider && !hasServices) {
        errors.push(`${hostAppId}: host manifest has no integrationServices`);
      }
    } catch (err) {
      errors.push(
        `${hostAppId}: manifest read failed — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return errors;
}

/**
 * Hosts whose `form.surface` slots are deliberately **not** bound.
 *
 * Chart Builder renders `chart.designer.metadata` and `chart.designer.connector` inline with its
 * own native `ChartDesignerForm`; a generated stub there would replace a working editor. Every
 * other `form.surface` a host accepts is expected to have a binding — that invariant is what was
 * missing when every Chart Builder connector became uneditable (the slots were declared and
 * unit-tested, but no seeder ran for that host, so nothing was ever bound and no check noticed).
 */
const UNBOUND_FORM_SLOT_EXCEPTIONS: Record<string, readonly string[]> = {
  'app-lab-chartbuilder': ['chart.designer.metadata', 'chart.designer.connector'],
};

/**
 * Every `form.surface` a golden host **accepts** must have a binding row.
 *
 * This is the guard the Chart Builder defect needed: the existing checks only proved a host had
 * *some* binding, so a host with one bound slot and three dead ones passed. A host that is a
 * provider-and-host (Chart Builder) also passed every list membership check, because it appeared in
 * neither seeder's host list and nothing asserted that it must.
 */
function verifyAcceptedFormSlotsAreBound(db: Database): string[] {
  const errors: string[] = [];
  for (const hostAppId of GOLDEN_INTEGRATION_MANIFEST_HOST_IDS) {
    let manifest;
    try {
      manifest = appsRepository.getIntegrationManifest(hostAppId);
    } catch {
      continue; // manifest-read failures are reported by verifyIntegrationManifestSeeds
    }
    const accepted = (manifest?.accepts ?? [])
      .filter((row) => row.kind === 'form.surface')
      .map((row) => row.slot);
    if (accepted.length === 0) {
      continue;
    }
    const exceptions = UNBOUND_FORM_SLOT_EXCEPTIONS[hostAppId] ?? [];
    const bound = new Set(
      (
        db
          .prepare(`SELECT slot FROM lab_integration_bindings WHERE host_app_id = ? AND enabled = 1`)
          .all(hostAppId) as { slot: string }[]
      ).map((row) => row.slot),
    );
    for (const slot of accepted) {
      if (exceptions.includes(slot)) {
        continue;
      }
      if (!bound.has(slot)) {
        errors.push(
          `${hostAppId}: accepted form slot ${slot} has no enabled binding — ` +
            `check that a seeder covers this host (catalog / platform-catalog / pilot)`,
        );
      }
    }
  }
  return errors;
}

export function verifyIntegrationBindingSeeds(db: Database): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const total = totalBindingCount(db);
  if (total < 40) {
    warnings.push(
      `Only ${total} lab_integration_bindings rows — catalog/platform stubs may be skipped when Forms Builder / Chart Builder app DBs are unavailable.`,
    );
  }

  for (const hostAppId of GOLDEN_INTEGRATION_BINDING_HOST_IDS) {
    const count = bindingCountForHost(db, hostAppId);
    if (count === 0) {
      errors.push(`${hostAppId}: no integration bindings after seed sync`);
    }
  }

  // Stricter than "has at least one binding": every accepted form slot must be bound.
  errors.push(...verifyAcceptedFormSlotsAreBound(db));

  for (const slot of GOLDEN_CRM_FORM_DIALOG_SLOTS) {
    const row = db
      .prepare(
        `SELECT 1 FROM lab_integration_bindings WHERE host_app_id = 'app-lab-crm' AND slot = ? LIMIT 1`,
      )
      .get(slot);
    if (!row) {
      errors.push(`app-lab-crm: missing seeded binding for slot ${slot}`);
    }
  }

  const orphanIds = (
    db
      .prepare(
        `SELECT id FROM lab_integration_bindings WHERE id NOT LIKE 'seed-%' AND id NOT LIKE 'seed-binding-%' LIMIT 20`,
      )
      .all() as { id: string }[]
  ).map((r) => r.id);
  if (orphanIds.length > 0) {
    warnings.push(
      `Bindings with non-seed ids (wizard/manual): ${orphanIds.slice(0, 5).join(', ')}${
        orphanIds.length > 5 ? '…' : ''
      }`,
    );
  }

  return { errors, warnings };
}

/**
 * Bootstrap an in-memory main DB the same way startup does, then verify manifests + bindings.
 */
export async function verifyIntegrationSeedPackFromBootstrap(): Promise<LabIntegrationSeedPackVerifyResult> {
  const Database = (await import('better-sqlite3')).default;
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY); INSERT INTO users (id) VALUES (1);`);

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    await appsRepository.bootstrap(db);
    await appsRepository.initialize();
    errors.push(...verifyIntegrationManifestSeeds());

    await labIntegrationsRepository.bootstrap(db);
    await labIntegrationsRepository.initialize();

    const bindingCheck = verifyIntegrationBindingSeeds(db);
    errors.push(...bindingCheck.errors);
    warnings.push(...bindingCheck.warnings);

    const stats = {
      bindingCount: totalBindingCount(db),
      manifestHostsChecked: GOLDEN_INTEGRATION_MANIFEST_HOST_IDS.length,
      bindingHostsChecked: GOLDEN_INTEGRATION_BINDING_HOST_IDS.length,
    };

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      stats,
    };
  } finally {
    labIntegrationsRepository.close();
    appsRepository.close();
    db.close();
  }
}

export interface IntegrationBindingExportRow {
  id: string;
  hostAppId: string;
  slot: string;
  kind: string;
  providerAppId: string;
  providerRef: string;
  enabled: number;
}

/** Read-only export of current bindings (golden lab snapshot / drift report). */
export function readIntegrationBindingsForExport(db: Database): IntegrationBindingExportRow[] {
  return (
    db
      .prepare(
        `SELECT id, host_app_id AS hostAppId, slot, kind, provider_app_id AS providerAppId,
                provider_ref AS providerRef, enabled
         FROM lab_integration_bindings
         ORDER BY host_app_id, slot`,
      )
      .all() as IntegrationBindingExportRow[]
  );
}
