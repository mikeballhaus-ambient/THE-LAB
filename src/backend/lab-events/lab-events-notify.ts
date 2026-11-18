import type { Server as SocketIOServer } from 'socket.io';
import { LAB_EVENTS_SOCKET } from '@/shared/types/lab-events-socket-events';
import type { LabUserNotification } from '@/shared/types/lab-domain-event';

export const LAB_EVENTS_SOCKET_NAMESPACE = '/lab-events';

function userRoom(userId: number): string {
  return `user:${userId}`;
}

export function emitLabNotificationToUser(
  io: SocketIOServer,
  userId: number,
  payload: LabUserNotification,
): void {
  io.of(LAB_EVENTS_SOCKET_NAMESPACE).to(userRoom(userId)).emit(LAB_EVENTS_SOCKET.NOTIFICATION, payload);
}

export function emitLabUnreadCount(io: SocketIOServer, userId: number, count: number): void {
  io.of(LAB_EVENTS_SOCKET_NAMESPACE)
    .to(userRoom(userId))
    .emit(LAB_EVENTS_SOCKET.UNREAD_COUNT, { userId, count });
}

export function emitLabApprovalsInboxChanged(io: SocketIOServer, userId: number): void {
  io.of(LAB_EVENTS_SOCKET_NAMESPACE)
    .to(userRoom(userId))
    .emit(LAB_EVENTS_SOCKET.APPROVALS_INBOX_CHANGED, { userId });
}

/** Notify all connected lab-events clients to reload journal entries and account balances. */
export function emitLabLedgerJournalChanged(io: SocketIOServer): void {
  io.of(LAB_EVENTS_SOCKET_NAMESPACE).emit(LAB_EVENTS_SOCKET.LEDGER_JOURNAL_CHANGED, {
    occurredAt: new Date().toISOString(),
  });
}
