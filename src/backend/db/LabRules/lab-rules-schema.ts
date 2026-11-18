import type { Database } from 'better-sqlite3';

export const createLabRulesTable = `
  CREATE TABLE IF NOT EXISTS lab_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    scope TEXT NOT NULL CHECK(scope IN ('global', 'user')),
    owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    enabled INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 100,
    definition_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createLabRuleExecutionsTable = `
  CREATE TABLE IF NOT EXISTS lab_rule_executions (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL REFERENCES lab_rules(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    status TEXT NOT NULL,
    detail_json TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createLabRulesIndexes = `
  CREATE INDEX IF NOT EXISTS idx_lab_rules_scope_enabled_priority ON lab_rules(scope, enabled, priority);
  CREATE INDEX IF NOT EXISTS idx_lab_rules_owner_enabled ON lab_rules(owner_user_id, enabled, priority);
`;

export function bootstrapLabRulesSchema(db: Database): void {
  db.exec(createLabRulesTable);
  db.exec(createLabRuleExecutionsTable);
  db.exec(createLabRulesIndexes);
}

export const LabRulesSQLStatementKeys = {
  rules_all: 'rules_all',
  rule_by_id: 'rule_by_id',
  count_enabled_global: 'count_enabled_global',
  count_enabled_for_owner: 'count_enabled_for_owner',
  rule_insert: 'rule_insert',
  rule_update: 'rule_update',
  rule_delete: 'rule_delete',
  enabled_rules_for_evaluation: 'enabled_rules_for_evaluation',
} as const;

export type LabRulesSQLStatementKey = keyof typeof LabRulesSQLStatementKeys;

export const createLabRulesSQLStatements = (
  db: Database,
): Record<LabRulesSQLStatementKey, ReturnType<Database['prepare']>> => {
  const q = (sql: string) => db.prepare(sql);

  return {
    [LabRulesSQLStatementKeys.rules_all]: q(`
      SELECT id, name, description, scope, owner_user_id, created_by_user_id, enabled, priority, definition_json, created_at, updated_at
      FROM lab_rules
      ORDER BY priority ASC, created_at DESC
    `),
    [LabRulesSQLStatementKeys.rule_by_id]: q(`
      SELECT id, name, description, scope, owner_user_id, created_by_user_id, enabled, priority, definition_json, created_at, updated_at
      FROM lab_rules
      WHERE id = ?
    `),
    [LabRulesSQLStatementKeys.count_enabled_global]: q(`
      SELECT COUNT(*) AS c FROM lab_rules WHERE scope = 'global' AND enabled = 1
    `),
    [LabRulesSQLStatementKeys.count_enabled_for_owner]: q(`
      SELECT COUNT(*) AS c FROM lab_rules WHERE scope = 'user' AND owner_user_id = ? AND enabled = 1
    `),
    [LabRulesSQLStatementKeys.rule_insert]: q(`
      INSERT INTO lab_rules (id, name, description, scope, owner_user_id, created_by_user_id, enabled, priority, definition_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    [LabRulesSQLStatementKeys.rule_update]: q(`
      UPDATE lab_rules
      SET name = ?,
          description = ?,
          scope = ?,
          owner_user_id = ?,
          enabled = ?,
          priority = ?,
          definition_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    [LabRulesSQLStatementKeys.rule_delete]: q(`
      DELETE FROM lab_rules WHERE id = ?
    `),
    [LabRulesSQLStatementKeys.enabled_rules_for_evaluation]: q(`
      SELECT id, name, description, scope, owner_user_id, created_by_user_id, enabled, priority, definition_json, created_at, updated_at
      FROM lab_rules
      WHERE enabled = 1
        AND (
          scope = 'global'
          OR (scope = 'user' AND owner_user_id = ?)
        )
      ORDER BY priority ASC, created_at ASC
      LIMIT 50
    `),
  };
};
