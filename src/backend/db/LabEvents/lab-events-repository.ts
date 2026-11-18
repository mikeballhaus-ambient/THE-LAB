import { Repository } from '../Repository';
import {
  LabEventsSQLStatementKeys,
  bootstrapLabEventsSchema,
  createLabEventsSQLStatements,
  type LabEventsSQLStatementKey,
} from './lab-events-schema';

export interface LabDomainEventRow {
  id: string;
  type: string;
  sourceAppId: string;
  occurredAt: string;
  actorUserId: number | null;
  payloadJson: string;
  createdAt: string;
}

export interface LabUserNotificationRow {
  id: string;
  userId: number;
  eventId: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  actionsJson: string | null;
}

type DomainEventDbRow = {
  id: string;
  type: string;
  source_app_id: string;
  occurred_at: string;
  actor_user_id: number | null;
  payload_json: string;
  created_at: string;
};

type NotificationDbRow = {
  id: string;
  user_id: number;
  event_id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  actions_json: string | null;
};

function mapDomainEventRow(row: DomainEventDbRow): LabDomainEventRow {
  return {
    id: row.id,
    type: row.type,
    sourceAppId: row.source_app_id,
    occurredAt: row.occurred_at,
    actorUserId: row.actor_user_id,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
  };
}

function mapNotificationRow(row: NotificationDbRow): LabUserNotificationRow {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
    actionsJson: row.actions_json,
  };
}

export class LabEventsRepository extends Repository {
  private statements: Partial<Record<LabEventsSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    bootstrapLabEventsSchema(this.db);
    this.statements = createLabEventsSQLStatements(this.db);
  }

  private stmt(key: LabEventsSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`LabEvents SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  async publishEvent(
    id: string,
    type: string,
    sourceAppId: string,
    occurredAt: string,
    actorUserId: number | null,
    payloadJson: string,
  ): Promise<LabDomainEventRow> {
    this.stmt(LabEventsSQLStatementKeys.event_insert).run(
      id,
      type,
      sourceAppId,
      occurredAt,
      actorUserId,
      payloadJson,
    );
    const row = this.stmt(LabEventsSQLStatementKeys.event_by_id).get(id) as DomainEventDbRow;
    return mapDomainEventRow(row);
  }

  async getEventById(id: string): Promise<LabDomainEventRow | null> {
    const row = this.stmt(LabEventsSQLStatementKeys.event_by_id).get(id) as DomainEventDbRow | undefined;
    return row ? mapDomainEventRow(row) : null;
  }

  async getNotificationById(id: string): Promise<LabUserNotificationRow | null> {
    const row = this.stmt(LabEventsSQLStatementKeys.notification_by_id).get(id) as
      | NotificationDbRow
      | undefined;
    return row ? mapNotificationRow(row) : null;
  }

  async listNotificationsForUser(
    userId: number,
    limit: number = 50,
  ): Promise<LabUserNotificationRow[]> {
    const rows = this.stmt(LabEventsSQLStatementKeys.notifications_for_user).all(
      userId,
      limit,
    ) as NotificationDbRow[];
    return rows.map(mapNotificationRow);
  }

  async markNotificationRead(userId: number, notificationId: string, readAt: string): Promise<void> {
    this.stmt(LabEventsSQLStatementKeys.notification_mark_read).run(readAt, notificationId, userId);
  }

  /**
   * Dismiss one of the caller's notifications.
   *
   * Scoped by `user_id` as well as `id` so a notification id is not a capability: without it, any
   * authenticated user who observed an id could delete someone else's notification. Returns the
   * number of rows removed so the caller can report a genuine 404 rather than a silent success.
   */
  async deleteNotificationForUser(userId: number, notificationId: string): Promise<number> {
    const result = this.stmt(LabEventsSQLStatementKeys.notification_delete_for_user).run(
      notificationId,
      userId,
    );
    return result.changes;
  }

  /**
   * Delete several of the caller's notifications.
   *
   * The id list is passed as a **single JSON parameter** and expanded by `json_each` inside the
   * statement, so the SQL is fixed and every value is still bound — no interpolation, no
   * re-preparation per call. Scoped by `user_id` for the same reason as the single-row delete: an id
   * is not a capability.
   *
   * An empty list is a no-op rather than an `IN ()` syntax error.
   */
  async deleteNotificationsForUser(
    userId: number,
    notificationIds: readonly string[],
  ): Promise<number> {
    if (notificationIds.length === 0) {
      return 0;
    }
    const result = this.stmt(LabEventsSQLStatementKeys.notification_delete_many_for_user).run(
      userId,
      JSON.stringify(notificationIds),
    );
    return result.changes;
  }

  async listRecentEventsForAdmin(limit: number = 100): Promise<LabDomainEventRow[]> {
    const rows = this.stmt(LabEventsSQLStatementKeys.recent_events_for_admin).all(
      limit,
    ) as DomainEventDbRow[];
    return rows.map(mapDomainEventRow);
  }

  listDistinctEventTypes(limit: number = 200): {
    eventType: string;
    sourceAppId: string;
    lastSeenAt: string;
    publishCount: number;
  }[] {
    type Row = {
      type: string;
      source_app_id: string;
      last_seen_at: string;
      publish_count: number;
    };
    const rows = this.stmt(LabEventsSQLStatementKeys.distinct_event_types).all(limit) as Row[];
    return rows.map((row) => ({
      eventType: row.type,
      sourceAppId: row.source_app_id,
      lastSeenAt: row.last_seen_at,
      publishCount: row.publish_count,
    }));
  }

  insertNotification(
    id: string,
    userId: number,
    eventId: string,
    title: string,
    body: string,
    readAt: string | null,
    actionsJson: string | null = null,
  ): void {
    this.stmt(LabEventsSQLStatementKeys.notification_insert).run(
      id,
      userId,
      eventId,
      title,
      body,
      readAt,
      actionsJson,
    );
  }

  /** Test-only helper — clear event tables between cases (see agent-handoff backend-sqlite-test-hygiene.md). */
  clearAllEventDataForTests(): void {
    if (!this.db) {
      return;
    }
    this.db.prepare('DELETE FROM lab_user_notifications').run();
    this.db.prepare('DELETE FROM lab_domain_events').run();
  }

  async countUnreadNotificationsForUser(userId: number): Promise<number> {
    const row = this.stmt(LabEventsSQLStatementKeys.notification_count_unread).get(userId) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  async getNotificationsForEvent(eventId: string): Promise<LabUserNotificationRow[]> {
    const rows = this.stmt(LabEventsSQLStatementKeys.notifications_for_event).all(eventId) as NotificationDbRow[];
    return rows.map(mapNotificationRow);
  }
}

export const labEventsRepository = new LabEventsRepository();
