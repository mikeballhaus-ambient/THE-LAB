import type { Server as SocketIOServer } from 'socket.io';
import { SOCKET_EVENTS } from '../../shared/types';

let io: SocketIOServer | null = null;

export function registerCrmSocket(server: SocketIOServer): void {
  io = server;
}

export function emitEntityRecordsChanged(entityKey: string): void {
  io?.emit(SOCKET_EVENTS.ENTITY_RECORDS_CHANGED, {
    entityKey,
    timestamp: new Date().toISOString(),
  });
}
