import type { Database } from 'better-sqlite3';

export const createLabDomainEventCatalogTable = `
  CREATE TABLE IF NOT EXISTS lab_domain_event_catalog (
    event_type TEXT PRIMARY KEY,
    source_app_id TEXT NOT NULL,
    publisher_kind TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    payload_fields_json TEXT NOT NULL,
    dynamic_payload INTEGER NOT NULL DEFAULT 0,
    registered_at TEXT NOT NULL,
    content_hash TEXT NOT NULL
  );
`;

export const createLabDomainEventCatalogIndexes = `
  CREATE INDEX IF NOT EXISTS idx_lab_domain_event_catalog_source
    ON lab_domain_event_catalog(source_app_id);
`;

export function bootstrapLabDomainEventCatalogSchema(db: Database): void {
  db.exec(createLabDomainEventCatalogTable);
  db.exec(createLabDomainEventCatalogIndexes);
}

export const LabDomainEventCatalogSQLStatementKeys = {
  catalog_list_all: 'catalog_list_all',
  catalog_upsert: 'catalog_upsert',
  catalog_delete_except: 'catalog_delete_except',
  catalog_count: 'catalog_count',
} as const;

export type LabDomainEventCatalogSQLStatementKey = keyof typeof LabDomainEventCatalogSQLStatementKeys;

export const createLabDomainEventCatalogSQLStatements = (
  db: Database,
): Record<LabDomainEventCatalogSQLStatementKey, ReturnType<Database['prepare']>> => {
  const q = (sql: string) => db.prepare(sql);

  return {
    [LabDomainEventCatalogSQLStatementKeys.catalog_list_all]: q(`
      SELECT event_type, source_app_id, publisher_kind, label, description,
             payload_fields_json, dynamic_payload, registered_at, content_hash
      FROM lab_domain_event_catalog
      ORDER BY source_app_id, event_type
    `),
    [LabDomainEventCatalogSQLStatementKeys.catalog_upsert]: q(`
      INSERT INTO lab_domain_event_catalog (
        event_type, source_app_id, publisher_kind, label, description,
        payload_fields_json, dynamic_payload, registered_at, content_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_type) DO UPDATE SET
        source_app_id = excluded.source_app_id,
        publisher_kind = excluded.publisher_kind,
        label = excluded.label,
        description = excluded.description,
        payload_fields_json = excluded.payload_fields_json,
        dynamic_payload = excluded.dynamic_payload,
        registered_at = excluded.registered_at,
        content_hash = excluded.content_hash
      WHERE lab_domain_event_catalog.content_hash != excluded.content_hash
    `),
    [LabDomainEventCatalogSQLStatementKeys.catalog_delete_except]: q(`
      DELETE FROM lab_domain_event_catalog
      WHERE event_type NOT IN (SELECT value FROM json_each(?))
    `),
    [LabDomainEventCatalogSQLStatementKeys.catalog_count]: q(`
      SELECT COUNT(*) AS c FROM lab_domain_event_catalog
    `),
  };
};