/**
 * @see plans/rm-58-notification-hub/architecture.md
 */
import type { LabNotificationAction } from '@/shared/types/lab-notification-action';

export const LAB_DOMAIN_EVENT_SCHEMA_VERSION = 1;

export interface LabDomainEventEnvelopeV1 {
  schemaVersion: number;
  id: string;
  type: string;
  sourceAppId: string;
  occurredAt: string;
  actorUserId?: number;
  payload: Record<string, unknown>;
}

export interface LabUserNotification {
  id: string;
  userId: number;
  eventId: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
  /** Optional call-to-action buttons (launch app, open Settings panel, …). */
  actions?: LabNotificationAction[];
}

export function buildLabEventType(sourceAppId: string, entity: string, action: string): string {
  return `${sourceAppId}.${entity}.${action}`;
}
