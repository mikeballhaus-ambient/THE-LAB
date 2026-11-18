import type { Database } from 'better-sqlite3';

import { DEFAULT_ENTITY_SEEDS } from './seed-default-entities';

import { backfillAccountsFromContactCompanies } from './backfill-accounts';

import { hasDemoDataset, seedDemoRecords, seedDemoQuoteRecords } from './seed-demo-records';

import {
  appendMissingPropertiesFromSeeds,
  backfillDemoLabUserFields,
} from './entity-property-sync';
import {
  APP_SEED_BOOT_FLAG_KEYS,
  isAppSeedBootDisabled,
} from '@/shared/config/app-seed-boot-flags';
import { DEMO_APPROVAL_POLICY_ID } from '@/shared/utils/demo-workflow-seed-catalog';



const MIGRATION_V1_SCHEMA = 'v1_crm_entity_schema';

const MIGRATION_V2_DEMO = 'v2_crm_demo_records';

const MIGRATION_V3_DEMO_BACKFILL = 'v3_crm_demo_backfill';

const MIGRATION_V4_LOOKUP_DISPLAY = 'v4_entity_lookup_display_property';

const MIGRATION_V5_LOOKUP_FORMAT = 'v5_entity_lookup_display_format';

const MIGRATION_V6_TASKS_ENTITY = 'v6_crm_tasks_entity_definition';

const MIGRATION_V7_LAB_USER_PROPERTIES = 'v7_crm_lab_user_properties';

const MIGRATION_V8_DEMO_LAB_USER_BACKFILL = 'v8_crm_demo_lab_user_backfill';

const MIGRATION_V9_TICKETS_ENTITY = 'v9_crm_tickets_entity_definition';

const MIGRATION_V10_CONTACT_LOOKUP_LABEL = 'v10_crm_strip_contact_lookup_label_property';

const MIGRATION_V11_QUOTES_ENTITY = 'v11_crm_quotes_entity_and_demo';

/** Gold-source accounts: `accounts` entity + `contacts.companyId` backfill. */
const MIGRATION_V12_ACCOUNTS_ENTITY = 'v12_crm_accounts_entity_and_company_backfill';
const MIGRATION_V13_FORM_BINDING_APPROVAL = 'v13_entity_form_bindings_approval_purpose';
const MIGRATION_V14_REVOKE_FORM_BINDING_APPROVAL = 'v14_entity_form_bindings_remove_approval_purpose';
const MIGRATION_V15_APPROVAL_STATUS_PROPERTY = 'v15_crm_sales_quotes_approval_status_property';



function entityDefinitionsTableExists(db: Database): boolean {
  return Boolean(
    db
      .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'entity_definitions' LIMIT 1`)
      .get(),
  );
}

function ensureLookupDisplayPropertyColumn(db: Database): void {
  // Fresh DB: `applyV1Schema()` has not created the table yet. `CREATE TABLE` already
  // includes these columns, so there is nothing to add.
  if (!entityDefinitionsTableExists(db)) {
    return;
  }

  const columns = db.prepare('PRAGMA table_info(entity_definitions)').all() as { name: string }[];

  if (!columns.some((c) => c.name === 'lookup_display_property')) {
    db.exec('ALTER TABLE entity_definitions ADD COLUMN lookup_display_property TEXT');
  }
}

function ensureLookupDisplayFormatColumn(db: Database): void {
  if (!entityDefinitionsTableExists(db)) {
    return;
  }

  const columns = db.prepare('PRAGMA table_info(entity_definitions)').all() as { name: string }[];

  if (!columns.some((c) => c.name === 'lookup_display_format')) {
    db.exec('ALTER TABLE entity_definitions ADD COLUMN lookup_display_format TEXT');
  }
}



function hasMigration(db: Database, name: string): boolean {

  return Boolean(

    db.prepare('SELECT 1 FROM crm_migrations WHERE migration_name = ?').get(name),

  );

}



function markMigration(db: Database, name: string, description: string): void {

  db.prepare('INSERT INTO crm_migrations (migration_name, description) VALUES (?, ?)').run(

    name,

    description,

  );

}



/** Idempotent DDL — runs every boot so a dropped table is repaired even when migrations are recorded. */
function ensureCrmCoreTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      properties_json TEXT NOT NULL,
      lookup_display_property TEXT,
      lookup_display_format TEXT,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entity_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_definition_id INTEGER NOT NULL REFERENCES entity_definitions(id) ON DELETE RESTRICT,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_entity_records_definition ON entity_records(entity_definition_id);

    CREATE TABLE IF NOT EXISTS entity_form_bindings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_definition_id INTEGER NOT NULL REFERENCES entity_definitions(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK(purpose IN ('create','edit','view')),
      form_key TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 1,
      UNIQUE(entity_definition_id, purpose, form_key)
    );
  `);
}

function applyV1Schema(db: Database): void {
  ensureCrmCoreTables(db);

  const insertDef = db.prepare(`

    INSERT INTO entity_definitions (

      entity_key, name, description, icon, sort_order, properties_json, lookup_display_property, lookup_display_format, is_system

    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)

  `);



  for (const seed of DEFAULT_ENTITY_SEEDS) {

    insertDef.run(

      seed.entityKey,

      seed.name,

      seed.description,

      seed.icon,

      seed.sortOrder,

      JSON.stringify(seed.properties),

      seed.lookupDisplayProperty ?? null,

      seed.lookupDisplayFormat ?? null,

    );

  }



  markMigration(

    db,

    MIGRATION_V1_SCHEMA,

    'CRM entity_definitions, entity_records, entity_form_bindings + six system seeds',

  );

}



export async function bootstrapCrmDatabase(db: Database): Promise<void> {

  db.exec(`

    CREATE TABLE IF NOT EXISTS crm_migrations (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      migration_name TEXT NOT NULL UNIQUE,

      applied_at TEXT NOT NULL DEFAULT (datetime('now')),

      description TEXT

    )

  `);

  ensureCrmCoreTables(db);

  ensureLookupDisplayPropertyColumn(db);

  ensureLookupDisplayFormatColumn(db);



  if (!hasMigration(db, MIGRATION_V1_SCHEMA)) {

    applyV1Schema(db);

  }



  if (!hasMigration(db, MIGRATION_V2_DEMO)) {

    seedDemoRecords(db);

    markMigration(

      db,

      MIGRATION_V2_DEMO,

      'Demo entity_records with valid lookup linkages (skipped if records already exist)',

    );

  }



  if (!hasMigration(db, MIGRATION_V3_DEMO_BACKFILL)) {

    applyV3DemoBackfill(db);

    markMigration(

      db,

      MIGRATION_V3_DEMO_BACKFILL,

      'Backfill demo rows when v2 skipped due to pre-existing stub records',

    );

  }



  if (!hasMigration(db, MIGRATION_V4_LOOKUP_DISPLAY)) {

    applyV4LookupDisplayDefaults(db);

    markMigration(

      db,

      MIGRATION_V4_LOOKUP_DISPLAY,

      'Entity lookup_display_property column + system entity defaults',

    );

  }



  if (!hasMigration(db, MIGRATION_V5_LOOKUP_FORMAT)) {

    applyV5LookupDisplayFormatDefaults(db);

    markMigration(

      db,

      MIGRATION_V5_LOOKUP_FORMAT,

      'Entity lookup_display_format column + contacts name template',

    );

  }

  if (!hasMigration(db, MIGRATION_V6_TASKS_ENTITY)) {
    applySystemEntitySeedFromDefaults(db, 'tasks');
    markMigration(
      db,
      MIGRATION_V6_TASKS_ENTITY,
      'System entity definition for CRM task form bindings (tasks)',
    );
  }

  if (!hasMigration(db, MIGRATION_V7_LAB_USER_PROPERTIES)) {
    appendMissingPropertiesFromSeeds(db, ['contacts', 'sales', 'service']);
    markMigration(
      db,
      MIGRATION_V7_LAB_USER_PROPERTIES,
      'Add labUser fields (accountOwnerId, ownerId, assignedTo) to system entities',
    );
  }

  if (!hasMigration(db, MIGRATION_V8_DEMO_LAB_USER_BACKFILL)) {
    backfillDemoLabUserFields(db);
    markMigration(
      db,
      MIGRATION_V8_DEMO_LAB_USER_BACKFILL,
      'Backfill demo CRM records with seeded THE-LAB user ids',
    );
  }

  if (!hasMigration(db, MIGRATION_V9_TICKETS_ENTITY)) {
    applySystemEntitySeedFromDefaults(db, 'tickets');
    markMigration(
      db,
      MIGRATION_V9_TICKETS_ENTITY,
      'System entity definition for CRM Help Desk ticket form bindings (tickets)',
    );
  }

  if (!hasMigration(db, MIGRATION_V10_CONTACT_LOOKUP_LABEL)) {
    applyV10StripContactLookupLabelProperty(db);
    markMigration(
      db,
      MIGRATION_V10_CONTACT_LOOKUP_LABEL,
      'Remove stale contactId lookupLabelProperty overrides (use contacts lookup display format)',
    );
  }

  if (!hasMigration(db, MIGRATION_V11_QUOTES_ENTITY)) {
    applyV11QuotesEntityAndDemo(db);
    markMigration(
      db,
      MIGRATION_V11_QUOTES_ENTITY,
      'System quotes entity + demo quote rows when demo dataset present',
    );
  }

  if (!hasMigration(db, MIGRATION_V12_ACCOUNTS_ENTITY)) {
    applyV12AccountsEntity(db);
    markMigration(
      db,
      MIGRATION_V12_ACCOUNTS_ENTITY,
      'System accounts entity + contacts.companyId backfill from company strings',
    );
  }

  if (!hasMigration(db, MIGRATION_V13_FORM_BINDING_APPROVAL)) {
    applyV13EntityFormBindingsApprovalPurpose(db);
    markMigration(
      db,
      MIGRATION_V13_FORM_BINDING_APPROVAL,
      'Form binding purpose approval (policy id per entity for Submit approval)',
    );
  }

  if (!hasMigration(db, MIGRATION_V14_REVOKE_FORM_BINDING_APPROVAL)) {
    applyV14RemoveEntityFormBindingsApprovalPurpose(db);
    markMigration(
      db,
      MIGRATION_V14_REVOKE_FORM_BINDING_APPROVAL,
      'Remove approval form-binding purpose; submit uses domain events + Workflow Studio',
    );
  }

  if (!hasMigration(db, MIGRATION_V15_APPROVAL_STATUS_PROPERTY)) {
    appendMissingPropertiesFromSeeds(db, ['sales', 'quotes']);
    markMigration(
      db,
      MIGRATION_V15_APPROVAL_STATUS_PROPERTY,
      'Add approvalStatus enum on sales and quotes for workflow outcome updates',
    );
  }
}

/**
 * Gold-source accounts: register the `accounts` entity, then turn each distinct
 * `contacts.company` string into an account row and link it via `companyId`.
 *
 * The `company` string is retained as a display mirror — existing forms and charts keep
 * working, and the lookup is additive.
 */
function applyV12AccountsEntity(db: Database): void {
  applySystemEntitySeedFromDefaults(db, 'accounts');

  // contacts definition gained `companyId`; sync properties without clobbering custom ones.
  try {
    appendMissingPropertiesFromSeeds(db, ['contacts']);
  } catch {
    /* sync helper is best-effort; the backfill below is what matters */
  }

  try {
    const result = backfillAccountsFromContactCompanies(db);
    if (result.accountsCreated > 0 || result.contactsLinked > 0) {
      console.log(
        `[crm] accounts backfill — created=${result.accountsCreated} linked=${result.contactsLinked}`,
      );
    }
  } catch (err) {
    console.warn(
      '[crm] accounts backfill skipped:',
      err instanceof Error ? err.message : err,
    );
  }
}

/** Expand entity_form_bindings.purpose CHECK to include `approval` (policy UUID in form_key). */
function applyV13EntityFormBindingsApprovalPurpose(db: Database): void {
  if (!entityDefinitionsTableExists(db)) {
    return;
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_form_bindings_v13 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_definition_id INTEGER NOT NULL REFERENCES entity_definitions(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK(purpose IN ('create','edit','view','approval')),
      form_key TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 1,
      UNIQUE(entity_definition_id, purpose, form_key)
    );
    INSERT INTO entity_form_bindings_v13 (id, entity_definition_id, purpose, form_key, is_default)
      SELECT id, entity_definition_id, purpose, form_key, is_default FROM entity_form_bindings;
    DROP TABLE entity_form_bindings;
    ALTER TABLE entity_form_bindings_v13 RENAME TO entity_form_bindings;
  `);

  const insertApproval = db.prepare(`
    INSERT INTO entity_form_bindings (entity_definition_id, purpose, form_key, is_default)
    SELECT id, 'approval', ?, 1
    FROM entity_definitions
    WHERE entity_key = ?
      AND NOT EXISTS (
        SELECT 1 FROM entity_form_bindings b
        WHERE b.entity_definition_id = entity_definitions.id AND b.purpose = 'approval'
      )
  `);
  for (const entityKey of ['sales', 'quotes']) {
    insertApproval.run(DEMO_APPROVAL_POLICY_ID, entityKey);
  }
}

/** Drop legacy `approval` purpose rows; policies live in Workflow Studio demo graphs. */
function applyV14RemoveEntityFormBindingsApprovalPurpose(db: Database): void {
  if (!entityDefinitionsTableExists(db)) {
    return;
  }
  db.exec(`DELETE FROM entity_form_bindings WHERE purpose = 'approval'`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_form_bindings_v14 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_definition_id INTEGER NOT NULL REFERENCES entity_definitions(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK(purpose IN ('create','edit','view')),
      form_key TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 1,
      UNIQUE(entity_definition_id, purpose, form_key)
    );
    INSERT INTO entity_form_bindings_v14 (id, entity_definition_id, purpose, form_key, is_default)
      SELECT id, entity_definition_id, purpose, form_key, is_default FROM entity_form_bindings;
    DROP TABLE entity_form_bindings;
    ALTER TABLE entity_form_bindings_v14 RENAME TO entity_form_bindings;
  `);
}



/** v2 could mark applied while seed skipped (e.g. a lone Jane Doe). Replace small stub datasets only. */

function applyV3DemoBackfill(db: Database): void {

  if (process.env.CRM_SKIP_DEMO_SEED === '1') {

    return;

  }

  if (isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.CRM_DEMO)) {

    return;

  }

  if (hasDemoDataset(db)) {

    return;

  }



  const { c: recordCount } = db.prepare('SELECT COUNT(*) AS c FROM entity_records').get() as {

    c: number;

  };

  if (recordCount === 0) {

    seedDemoRecords(db);

    return;

  }

  if (recordCount >= 5) {

    return;

  }



  db.exec('DELETE FROM entity_records');

  seedDemoRecords(db);

}



function applyV4LookupDisplayDefaults(db: Database): void {

  const update = db.prepare(

    `UPDATE entity_definitions SET lookup_display_property = ? WHERE entity_key = ?`,

  );

  for (const seed of DEFAULT_ENTITY_SEEDS) {

    if (seed.lookupDisplayProperty) {

      update.run(seed.lookupDisplayProperty, seed.entityKey);

    }

  }

}



function applySystemEntitySeedFromDefaults(db: Database, entityKey: string): void {
  const seed = DEFAULT_ENTITY_SEEDS.find((s) => s.entityKey === entityKey);
  if (!seed) {
    return;
  }
  const exists = db
    .prepare('SELECT 1 FROM entity_definitions WHERE entity_key = ? LIMIT 1')
    .get(seed.entityKey);
  if (exists) {
    return;
  }
  db.prepare(
    `INSERT INTO entity_definitions (
      entity_key, name, description, icon, sort_order, properties_json, lookup_display_property, lookup_display_format, is_system
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(
    seed.entityKey,
    seed.name,
    seed.description,
    seed.icon,
    seed.sortOrder,
    JSON.stringify(seed.properties),
    seed.lookupDisplayProperty ?? null,
    seed.lookupDisplayFormat ?? null,
  );
}

function applyV5LookupDisplayFormatDefaults(db: Database): void {

  const update = db.prepare(

    `UPDATE entity_definitions SET lookup_display_format = ? WHERE entity_key = ?`,

  );

  for (const seed of DEFAULT_ENTITY_SEEDS) {

    if (seed.lookupDisplayFormat) {

      update.run(seed.lookupDisplayFormat, seed.entityKey);

    }

  }

}

/** Stale per-field overrides (e.g. contactId → lastName) hid contacts name template. */
function loadRecordIdsForEntity(db: Database, entityKey: string): number[] {
  const def = db
    .prepare('SELECT id FROM entity_definitions WHERE entity_key = ? LIMIT 1')
    .get(entityKey) as { id: number } | undefined;
  if (!def) {
    return [];
  }
  const rows = db
    .prepare(
      `SELECT id FROM entity_records WHERE entity_definition_id = ? ORDER BY id ASC`,
    )
    .all(def.id) as { id: number }[];
  return rows.map((r) => r.id);
}

function applyV11QuotesEntityAndDemo(db: Database): void {
  applySystemEntitySeedFromDefaults(db, 'quotes');
  if (!hasDemoDataset(db)) {
    return;
  }
  seedDemoQuoteRecords(db, {
    contactIds: loadRecordIdsForEntity(db, 'contacts'),
    leadIds: loadRecordIdsForEntity(db, 'leads'),
    productIds: loadRecordIdsForEntity(db, 'products'),
  });
}

function applyV10StripContactLookupLabelProperty(db: Database): void {
  const rows = db.prepare('SELECT id, properties_json FROM entity_definitions').all() as {
    id: number;
    properties_json: string;
  }[];
  const update = db.prepare(
    `UPDATE entity_definitions SET properties_json = ?, updated_at = datetime('now') WHERE id = ?`,
  );

  for (const row of rows) {
    let props: Array<Record<string, unknown>>;
    try {
      props = JSON.parse(row.properties_json) as Array<Record<string, unknown>>;
    } catch {
      continue;
    }
    let changed = false;
    const next = props.map((prop) => {
      if (
        prop.type === 'lookup' &&
        prop.lookupEntityKey === 'contacts' &&
        prop.lookupLabelProperty != null
      ) {
        changed = true;
        const { lookupLabelProperty, ...rest } = prop;
        void lookupLabelProperty;
        return rest;
      }
      return prop;
    });
    if (changed) {
      update.run(JSON.stringify(next), row.id);
    }
  }
}


