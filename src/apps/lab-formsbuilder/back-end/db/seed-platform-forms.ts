import type { Database } from 'better-sqlite3';
import {
  APP_SEED_BOOT_FLAG_KEYS,
  isAppSeedBootDisabled,
  setAppSeedBootDisabled,
} from '@/shared/config/app-seed-boot-flags';
import { CRM_ENTITY_FORM_KEYS } from '@/apps/lab-crm/shared/config/entity-form-keys';
import { CRM_TASK_FORM_KEY } from '@/apps/lab-crm/shared/config/task-form-keys';
import { TASK_FORM_KEY, TASK_LIST_FORM_KEY } from '@/apps/lab-tasklist/front-end/config/form-keys';

const HELP_DESK_TICKET_FORM_KEY = 'form_1791054325120_stz7jkl';
import {
  PLATFORM_FORMS_SEED_CONNECTORS,
  PLATFORM_FORMS_SEED_FORMS,
} from './platform-forms-seed-data';

export const PLATFORM_FORMS_PACK_ID = 'forms-builder-platform-forms';

export const REQUIRED_PLATFORM_FORM_KEYS: readonly string[] = [
  TASK_LIST_FORM_KEY,
  TASK_FORM_KEY,
  HELP_DESK_TICKET_FORM_KEY,
  CRM_TASK_FORM_KEY,
  ...Object.values(CRM_ENTITY_FORM_KEYS).filter((k): k is string => Boolean(k?.trim())),
  'form_1790963590212_43zxb2u', // Quotes (CRM connector)
];

export function hasPlatformFormsDataset(db: Database): boolean {
  for (const key of REQUIRED_PLATFORM_FORM_KEYS) {
    const row = db.prepare('SELECT 1 FROM forms WHERE form_key = ? LIMIT 1').get(key);
    if (!row) {
      return false;
    }
  }
  return true;
}

function findConnectorId(
  db: Database,
  appName: string,
  entityName: string,
): number | null {
  const row = db
    .prepare(
      `SELECT id FROM data_connectors WHERE app_name = ? AND entity_name = ? ORDER BY id LIMIT 1`,
    )
    .get(appName, entityName) as { id: number } | undefined;
  return row?.id ?? null;
}

export interface PlatformFormsSeedOptions {
  /** Settings admin Apply — ignores boot suppress flags. */
  adminApply?: boolean;
}

/** Remove all forms, submissions, and connectors (greenfield / integration pilot). */
export function clearAllFormsBuilderCatalog(db: Database): {
  removedForms: number;
  removedConnectors: number;
  removedSubmissions: number;
} {
  const forms = (db.prepare('SELECT COUNT(*) AS c FROM forms').get() as { c: number }).c;
  const connectors = (db.prepare('SELECT COUNT(*) AS c FROM data_connectors').get() as { c: number })
    .c;
  let submissions = 0;
  try {
    submissions = (db.prepare('SELECT COUNT(*) AS c FROM form_submissions').get() as { c: number }).c;
    db.prepare('DELETE FROM form_submissions').run();
  } catch {
    /* table optional on older DBs */
  }
  db.prepare('DELETE FROM forms').run();
  db.prepare('DELETE FROM data_connectors').run();
  setAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.FORMS_BUILDER_PLATFORM, true);
  return { removedForms: forms, removedConnectors: connectors, removedSubmissions: submissions };
}

export function seedPlatformFormsIfMissing(
  db: Database,
  options?: PlatformFormsSeedOptions,
): { insertedConnectors: number; insertedForms: number } {
  if (
    !options?.adminApply &&
    isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.FORMS_BUILDER_PLATFORM)
  ) {
    return { insertedConnectors: 0, insertedForms: 0 };
  }
  let insertedConnectors = 0;
  let insertedForms = 0;
  const legacyConnectorIdToNew = new Map<number, number>();

  for (const row of PLATFORM_FORMS_SEED_CONNECTORS) {
    const appName = String(row.app_name);
    const entityName = String(row.entity_name);
    const legacyId = Number(row.id);
    let connectorId = findConnectorId(db, appName, entityName);
    if (connectorId == null) {
      const result = db
        .prepare(
          `INSERT INTO data_connectors (
            app_name, entity_name, discovery_url, discovery_type, entity_model, endpoints,
            capabilities, is_active, last_verified_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          appName,
          entityName,
          row.discovery_url,
          row.discovery_type ?? 'GET',
          row.entity_model ?? null,
          row.endpoints ?? null,
          row.capabilities ?? null,
          row.is_active ?? 1,
          row.last_verified_at ?? null,
          row.created_at ?? new Date().toISOString(),
          row.updated_at ?? new Date().toISOString(),
        );
      connectorId = Number(result.lastInsertRowid);
      insertedConnectors += 1;
    }
    legacyConnectorIdToNew.set(legacyId, connectorId);
  }

  for (const row of PLATFORM_FORMS_SEED_FORMS) {
    const formKey = String(row.form_key);
    const exists = db.prepare('SELECT 1 FROM forms WHERE form_key = ? LIMIT 1').get(formKey);
    if (exists) {
      continue;
    }
    const legacyConnectorId = Number(row.data_connector_id);
    const connectorId = legacyConnectorIdToNew.get(legacyConnectorId) ?? legacyConnectorId;
    db.prepare(
      `INSERT INTO forms (
        form_key, name, description, data_connector_id, schema_json, components_json,
        validation_json, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      formKey,
      row.name,
      row.description ?? null,
      connectorId,
      row.schema_json,
      row.components_json,
      row.validation_json ?? null,
      row.is_active ?? 1,
      row.created_at ?? new Date().toISOString(),
      row.updated_at ?? new Date().toISOString(),
    );
    insertedForms += 1;
  }

  return { insertedConnectors, insertedForms };
}
