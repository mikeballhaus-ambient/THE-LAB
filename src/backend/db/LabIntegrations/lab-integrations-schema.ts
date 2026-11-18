import type { Database } from 'better-sqlite3';

export const createLabIntegrationBindingsTable = `
  CREATE TABLE IF NOT EXISTS lab_integration_bindings (
    id TEXT PRIMARY KEY,
    host_app_id TEXT NOT NULL,
    slot TEXT NOT NULL,
    kind TEXT NOT NULL,
    provider_app_id TEXT NOT NULL,
    provider_ref TEXT NOT NULL,
    config_json TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(host_app_id, slot)
  );
`;

export const createLabIntegrationsIndexes = `
  CREATE INDEX IF NOT EXISTS idx_lab_integration_bindings_host ON lab_integration_bindings(host_app_id);
  CREATE INDEX IF NOT EXISTS idx_lab_integration_bindings_provider ON lab_integration_bindings(provider_app_id);
`;

export function bootstrapLabIntegrationsSchema(db: Database): void {
  db.exec(createLabIntegrationBindingsTable);
  db.exec(createLabIntegrationsIndexes);
}

export const LabIntegrationsSQLStatementKeys = {
  bindings_by_host: 'bindings_by_host',
  binding_by_id: 'binding_by_id',
  binding_by_host_slot: 'binding_by_host_slot',
  bindings_by_provider: 'bindings_by_provider',
  binding_insert: 'binding_insert',
  binding_update: 'binding_update',
  binding_delete: 'binding_delete',
  bindings_count_by_provider_ref: 'bindings_count_by_provider_ref',
} as const;

export type LabIntegrationsSQLStatementKey = keyof typeof LabIntegrationsSQLStatementKeys;

export const createLabIntegrationsSQLStatements = (
  db: Database,
): Record<LabIntegrationsSQLStatementKey, ReturnType<Database['prepare']>> => {
  const q = (sql: string) => db.prepare(sql);
  return {
    [LabIntegrationsSQLStatementKeys.bindings_by_host]: q(`
      SELECT * FROM lab_integration_bindings WHERE host_app_id = ? ORDER BY slot
    `),
    [LabIntegrationsSQLStatementKeys.binding_by_id]: q(`
      SELECT * FROM lab_integration_bindings WHERE id = ?
    `),
    [LabIntegrationsSQLStatementKeys.binding_by_host_slot]: q(`
      SELECT * FROM lab_integration_bindings WHERE host_app_id = ? AND slot = ?
    `),
    [LabIntegrationsSQLStatementKeys.bindings_by_provider]: q(`
      SELECT * FROM lab_integration_bindings
      WHERE host_app_id = ? AND provider_app_id = ? AND enabled = 1
    `),
    [LabIntegrationsSQLStatementKeys.binding_insert]: q(`
      INSERT INTO lab_integration_bindings (
        id, host_app_id, slot, kind, provider_app_id, provider_ref,
        config_json, enabled, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `),
    [LabIntegrationsSQLStatementKeys.binding_update]: q(`
      UPDATE lab_integration_bindings SET
        provider_app_id = ?,
        provider_ref = ?,
        config_json = ?,
        enabled = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    [LabIntegrationsSQLStatementKeys.binding_delete]: q(`
      DELETE FROM lab_integration_bindings WHERE id = ?
    `),
    [LabIntegrationsSQLStatementKeys.bindings_count_by_provider_ref]: q(`
      SELECT COUNT(*) as count FROM lab_integration_bindings WHERE provider_ref = ?
    `),
  };
};
