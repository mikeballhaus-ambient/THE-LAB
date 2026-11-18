import { labEventsRepository } from './lab-events-repository';
import { loadDeclaredDomainEventCatalogEntries } from '@/backend/lab-events/declared-domain-event-catalog';
import type { LabDomainEventEnvelopeV1, LabUserNotification } from '@/shared/types/lab-domain-event';
import { buildLabDomainEventCatalogResponse } from '@/shared/services/lab-domain-event-catalog';
import type { LabDomainEventCatalogResponse } from '@/shared/types/lab-domain-event-catalog';
import { parseLabNotificationActionsJson } from '@/shared/utils/lab-notification-actions';

export interface PublishEventResult {
  eventId: string;
}

export class LabEventsService {
  private static instance: LabEventsService | null = null;

  private constructor() {}

  static getInstance(): LabEventsService {
    if (!LabEventsService.instance) {
      LabEventsService.instance = new LabEventsService();
    }
    return LabEventsService.instance;
  }

  /** Persist domain event only. Inbox notifications are created by workflow steps. */
  async publish(
    envelope: LabDomainEventEnvelopeV1,
    actorUserId?: number,
  ): Promise<PublishEventResult> {
    const eventId = envelope.id;
    const payloadJson = JSON.stringify(envelope.payload);

    await labEventsRepository.publishEvent(
      eventId,
      envelope.type,
      envelope.sourceAppId,
      envelope.occurredAt,
      actorUserId ?? null,
      payloadJson,
    );

    return { eventId };
  }

  async listNotificationsForUser(userId: number, limit?: number): Promise<LabUserNotification[]> {
    const rows = await labEventsRepository.listNotificationsForUser(userId, limit ?? 50);
    return rows.map((row) =>
      mapNotificationRow({
        id: row.id,
        userId: row.userId,
        eventId: row.eventId,
        title: row.title,
        body: row.body,
        readAt: row.readAt,
        createdAt: row.createdAt,
        actionsJson: row.actionsJson,
      }),
    );
  }

  async markNotificationRead(userId: number, notificationId: string): Promise<void> {
    const now = new Date().toISOString();
    await labEventsRepository.markNotificationRead(userId, notificationId, now);
  }

  async deleteNotification(userId: number, notificationId: string): Promise<void> {
    const removed = await labEventsRepository.deleteNotificationForUser(userId, notificationId);
    if (removed === 0) {
      // Report a miss rather than pretending success: a silent no-op looks identical to a broken
      // delete button to whoever pressed it.
      throw new Error('Notification not found');
    }
  }

  /**
   * Delete several of the caller's notifications, returning how many were removed.
   *
   * Does **not** throw when some ids are missing. The UI deletes a selection it just rendered, so a
   * row removed by another tab between render and click is expected; failing the whole batch would
   * make the visible rows undeletable.
   */
  async deleteNotifications(userId: number, notificationIds: readonly string[]): Promise<number> {
    return labEventsRepository.deleteNotificationsForUser(userId, notificationIds);
  }

  async countUnreadNotificationsForUser(userId: number): Promise<number> {
    return labEventsRepository.countUnreadNotificationsForUser(userId);
  }

  async listRecentEventsForAdmin(limit?: number): Promise<LabDomainEventEnvelopeV1[]> {
    const rows = await labEventsRepository.listRecentEventsForAdmin(limit ?? 100);
    return rows.map((row) => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(row.payloadJson) as Record<string, unknown>;
      } catch {
        payload = {};
      }
      return {
        schemaVersion: 1,
        id: row.id,
        type: row.type,
        sourceAppId: row.sourceAppId,
        occurredAt: row.occurredAt,
        actorUserId: row.actorUserId ?? undefined,
        payload,
      };
    });
  }

  getEventCatalog(): LabDomainEventCatalogResponse {
    const observed = labEventsRepository.listDistinctEventTypes(200);
    const declared = [...loadDeclaredDomainEventCatalogEntries()];
    return buildLabDomainEventCatalogResponse(observed, declared);
  }
}

function mapNotificationRow(row: {
  id: string;
  userId: number;
  eventId: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  actionsJson?: string | null;
}): LabUserNotification {
  return {
    id: row.id,
    userId: row.userId,
    eventId: row.eventId,
    title: row.title,
    body: row.body,
    readAt: row.readAt ?? undefined,
    createdAt: row.createdAt,
    actions: parseLabNotificationActionsJson(row.actionsJson),
  };
}

export const labEventsService = LabEventsService.getInstance();
