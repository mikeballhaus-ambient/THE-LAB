import type { Server as SocketIOServer } from 'socket.io';
import type { LabUserNotification } from '@/shared/types/lab-domain-event';
import { labEventsService } from '../db/LabEvents/lab-events-service';
import { emitLabNotificationToUser, emitLabUnreadCount } from './lab-events-notify';

/** Socket + unread badge updates for workflow-created inbox rows. */
export async function fanOutLabNotifications(
  io: SocketIOServer | undefined,
  notifications: LabUserNotification[],
): Promise<void> {
  if (!io || notifications.length === 0) {
    return;
  }
  const affectedUserIds = new Set<number>();
  for (const notification of notifications) {
    emitLabNotificationToUser(io, notification.userId, notification);
    affectedUserIds.add(notification.userId);
  }
  for (const userId of affectedUserIds) {
    const unreadCount = await labEventsService.countUnreadNotificationsForUser(userId);
    emitLabUnreadCount(io, userId, unreadCount);
  }
}
