import type { Database } from 'better-sqlite3';

export const createPlatformAppTagsTable = `
  CREATE TABLE IF NOT EXISTS platform_app_tags (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createAppTagAssignmentsTable = `
  CREATE TABLE IF NOT EXISTS app_tag_assignments (
    app_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (app_id, position),
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES platform_app_tags(id) ON DELETE RESTRICT,
    UNIQUE (app_id, tag_id)
  );
`;

export const createAppTagsIndexes = `
  CREATE INDEX IF NOT EXISTS idx_platform_app_tags_sort ON platform_app_tags(sort_order);
  CREATE INDEX IF NOT EXISTS idx_app_tag_assignments_tag ON app_tag_assignments(tag_id);
  CREATE INDEX IF NOT EXISTS idx_app_tag_assignments_app ON app_tag_assignments(app_id);
`;

export function bootstrapAppTagsSchema(db: Database): void {
  db.exec(createPlatformAppTagsTable);
  db.exec(createAppTagAssignmentsTable);
  db.exec(createAppTagsIndexes);
}

export const AppTagsSQLStatementKeys = {
  tags_all: 'tags_all',
  tag_by_id: 'tag_by_id',
  tags_count: 'tags_count',
  tag_insert: 'tag_insert',
  tag_update: 'tag_update',
  tag_delete: 'tag_delete',
  tag_max_sort: 'tag_max_sort',
  apps_using_tag: 'apps_using_tag',
  assignments_for_app: 'assignments_for_app',
  assignments_all: 'assignments_all',
  assignments_delete_for_app: 'assignments_delete_for_app',
  assignment_insert: 'assignment_insert',
  app_exists: 'app_exists',
} as const;

export type AppTagsSQLStatementKey = keyof typeof AppTagsSQLStatementKeys;

export const createAppTagsSQLStatements = (
  db: Database,
): Record<AppTagsSQLStatementKey, ReturnType<Database['prepare']>> => {
  const q = (sql: string) => db.prepare(sql);

  return {
    [AppTagsSQLStatementKeys.tags_all]: q(`
      SELECT id, label, description, sort_order, created_at, updated_at
      FROM platform_app_tags
      ORDER BY sort_order ASC, label ASC
    `),
    [AppTagsSQLStatementKeys.tag_by_id]: q(`
      SELECT id, label, description, sort_order, created_at, updated_at
      FROM platform_app_tags
      WHERE id = ?
    `),
    [AppTagsSQLStatementKeys.tags_count]: q(`
      SELECT COUNT(*) AS c FROM platform_app_tags
    `),
    [AppTagsSQLStatementKeys.tag_insert]: q(`
      INSERT INTO platform_app_tags (id, label, description, sort_order, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `),
    [AppTagsSQLStatementKeys.tag_update]: q(`
      UPDATE platform_app_tags
      SET label = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    [AppTagsSQLStatementKeys.tag_delete]: q(`
      DELETE FROM platform_app_tags WHERE id = ?
    `),
    [AppTagsSQLStatementKeys.tag_max_sort]: q(`
      SELECT MAX(sort_order) AS m FROM platform_app_tags
    `),
    [AppTagsSQLStatementKeys.apps_using_tag]: q(`
      SELECT a.id AS appId, a.name AS appName
      FROM app_tag_assignments ata
      JOIN apps a ON a.id = ata.app_id
      WHERE ata.tag_id = ?
      ORDER BY a.name ASC
    `),
    [AppTagsSQLStatementKeys.assignments_for_app]: q(`
      SELECT tag_id FROM app_tag_assignments
      WHERE app_id = ?
      ORDER BY position ASC
    `),
    [AppTagsSQLStatementKeys.assignments_all]: q(`
      SELECT app_id, tag_id, position FROM app_tag_assignments
      ORDER BY app_id, position ASC
    `),
    [AppTagsSQLStatementKeys.assignments_delete_for_app]: q(`
      DELETE FROM app_tag_assignments WHERE app_id = ?
    `),
    [AppTagsSQLStatementKeys.assignment_insert]: q(`
      INSERT OR IGNORE INTO app_tag_assignments (app_id, tag_id, position) VALUES (?, ?, ?)
    `),
    [AppTagsSQLStatementKeys.app_exists]: q(`
      SELECT id FROM apps WHERE id = ?
    `),
  };
};
