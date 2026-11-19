import type { Server as SocketIOServer } from 'socket.io';
import { LAB_EVENTS_SOCKET } from '@/shared/types/lab-events-socket-events';
import type { LabShellToastPayload } from '@/shared/types/lab-shell-toast';
import { LAB_EVENTS_SOCKET_NAMESPACE } from './lab-events-notify';

function userRoom(userId: number): string {
  return `user:${userId}`;
}

export function emitLabShellToastToUser(
  io: SocketIOServer | undefined,
  userId: number,
  payload: LabShellToastPayload,
): void {
  if (!io) {
    return;
  }
  io.of(LAB_EVENTS_SOCKET_NAMESPACE)
    .to(userRoom(userId))
    .emit(LAB_EVENTS_SOCKET.USER_TOAST, { userId, ...payload });
}