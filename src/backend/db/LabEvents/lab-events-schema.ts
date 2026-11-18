import type { Database } from 'better-sqlite3';
import { ensureLabUserNotificationsActionsColumn } from './lab-events-migration';

export const createLabDomainEventsTable = `
  CREATE TABLE IF NOT EXISTS lab_domain_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source_app_id TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    actor_user_id INTEGER,
    payload_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createLabUserNotificationsTable = `
  CREATE TABLE IF NOT EXISTS lab_user_notifications (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES lab_domain_events(id) ON DELETE CASCADE
  );
`;

export const createLabEventsIndexes = `
  CREATE INDEX IF NOT EXISTS idx_lab_domain_events_type ON lab_domain_events(type);
  CREATE INDEX IF NOT EXISTS idx_lab_domain_events_source_app ON lab_domain_events(source_app_id);
  CREATE INDEX IF NOT EXISTS idx_lab_domain_events_occurred_at ON lab_domain_events(occurred_at DESC);
  CREATE INDEX IF NOT EXISTS idx_lab_user_notifications_user ON lab_user_notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_lab_user_notifications_read_at ON lab_user_notifications(user_id, read_at DESC);
`;

export function bootstrapLabEventsSchema(db: Database): void {
  db.exec(createLabDomainEventsTable);
  db.exec(createLabUserNotificationsTable);
  db.exec(createLabEventsIndexes);
  ensureLabUserNotificationsActionsColumn(db);
}

export const LabEventsSQLStatementKeys = {
  events_all: 'events_all',
  event_by_id: 'event_by_id',
  events_count: 'events_count',
  event_insert: 'event_insert',
  event_update: 'event_update',
  event_delete: 'event_delete',
  notifications_for_user: 'notifications_for_user',
  notification_by_id: 'notification_by_id',
  notification_insert: 'notification_insert',
  notification_update: 'notification_update',
  notification_mark_read: 'notification_mark_read',
  notification_delete: 'notification_delete',
  notification_delete_for_user: 'notification_delete_for_user',
  notification_delete_many_for_user: 'notification_delete_many_for_user',
  notification_count_unread: 'notification_count_unread',
  notifications_for_event: 'notifications_for_event',
  recent_events_for_admin: 'recent_events_for_admin',
  distinct_event_types: 'distinct_event_types',
} as const;

export type LabEventsSQLStatementKey = keyof typeof LabEventsSQLStatementKeys;

export const createLabEventsSQLStatements = (
  db: Database,
): Record<LabEventsSQLStatementKey, ReturnType<Database['prepare']>> => {
  const q = (sql: string) => db.prepare(sql);

  return {
    [LabEventsSQLStatementKeys.events_all]: q(`
      SELECT id, type, source_app_id, occurred_at, actor_user_id, payload_json, created_at
      FROM lab_domain_events
      ORDER BY occurred_at DESC
    `),
    [LabEventsSQLStatementKeys.event_by_id]: q(`
      SELECT id, type, source_app_id, occurred_at, actor_user_id, payload_json, created_at
      FROM lab_domain_events
      WHERE id = ?
    `),
    [LabEventsSQLStatementKeys.events_count]: q(`
      SELECT COUNT(*) AS c FROM lab_domain_events
    `),
    [LabEventsSQLStatementKeys.event_insert]: q(`
      INSERT INTO lab_domain_events (id, type, source_app_id, occurred_at, actor_user_id, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    [LabEventsSQLStatementKeys.event_update]: q(`
      UPDATE lab_domain_events
      SET type = ?, source_app_id = ?, occurred_at = ?, actor_user_id = ?, payload_json = ?
      WHERE id = ?
    `),
    [LabEventsSQLStatementKeys.event_delete]: q(`
      DELETE FROM lab_domain_events WHERE id = ?
    `),
    [LabEventsSQLStatementKeys.notifications_for_user]: q(`
      SELECT id, user_id, event_id, title, body, read_at, created_at, actions_json
      FROM lab_user_notifications
      WHERE user_id = ?
      ORDER BY rowid DESC
      LIMIT ?
    `),
    [LabEventsSQLStatementKeys.notification_by_id]: q(`
      SELECT id, user_id, event_id, title, body, read_at, created_at, actions_json
      FROM lab_user_notifications
      WHERE id = ?
    `),
    [LabEventsSQLStatementKeys.notification_insert]: q(`
      INSERT INTO lab_user_notifications (id, user_id, event_id, title, body, read_at, actions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    [LabEventsSQLStatementKeys.notification_update]: q(`
      UPDATE lab_user_notifications
      SET read_at = ?
      WHERE id = ?
    `),
    [LabEventsSQLStatementKeys.notification_mark_read]: q(`
      UPDATE lab_user_notifications
      SET read_at = ?
      WHERE id = ? AND user_id = ?
    `),
    [LabEventsSQLStatementKeys.notification_delete]: q(`
      DELETE FROM lab_user_notifications WHERE id = ?
    `),
    /*
     * Owner-scoped delete. The unscoped statement above is for admin/sweep paths; a user-initiated
     * dismiss must carry `user_id`, or an id alone becomes a capability to delete someone else's
     * notification.
     */
    [LabEventsSQLStatementKeys.notification_delete_for_user]: q(`
      DELETE FROM lab_user_notifications WHERE id = ? AND user_id = ?
    `),
    /*
     * Bulk delete. `user_id` scoping is identical to the single-row statement above — the only
     * difference is the id list, so a caller cannot reach another user's rows by passing ids.
     *
     * The list arrives as a **JSON array parameter** expanded by `json_each`, not as generated `?`
     * placeholders. A statement ending in `IN` is incomplete SQL and throws when prepared at
     * bootstrap time (`SQLITE_ERROR: incomplete input`), which broke backend init; building the
     * placeholder list at call time instead would mean re-preparing per call and losing the
     * injection safety that comes from a fixed, bound statement.
     */
    [LabEventsSQLStatementKeys.notification_delete_many_for_user]: q(`
      DELETE FROM lab_user_notifications
      WHERE user_id = ? AND id IN (SELECT value FROM json_each(?))
    `),
    [LabEventsSQLStatementKeys.recent_events_for_admin]: q(`
      SELECT id, type, source_app_id, occurred_at, actor_user_id, payload_json, created_at
      FROM lab_domain_events
      ORDER BY occurred_at DESC
      LIMIT ?
    `),
    [LabEventsSQLStatementKeys.notification_count_unread]: q(`
      SELECT COUNT(*) AS count
      FROM lab_user_notifications
      WHERE user_id = ? AND read_at IS NULL
    `),
    [LabEventsSQLStatementKeys.notifications_for_event]: q(`
      SELECT id, user_id, event_id, title, body, read_at, created_at, actions_json
      FROM lab_user_notifications
      WHERE event_id = ?
      ORDER BY rowid DESC
    `),
    [LabEventsSQLStatementKeys.distinct_event_types]: q(`
      SELECT type, source_app_id, MAX(occurred_at) AS last_seen_at, COUNT(*) AS publish_count
      FROM lab_domain_events
      GROUP BY type, source_app_id
      ORDER BY last_seen_at DESC
      LIMIT ?
    `),
  };
};
