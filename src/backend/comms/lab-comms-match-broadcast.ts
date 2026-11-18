import type { Server as SocketIOServer } from 'socket.io';
import { LAB_COMMS_EVENTS } from '@/shared/types/lab-comms-events';

export type LabCommsMatchStatePayload = {
  matchId: string;
  match: Record<string, unknown>;
};

let labCommsIo: SocketIOServer | null = null;

export function registerLabCommsMatchBroadcast(io: SocketIOServer): void {
  labCommsIo = io;
}

/**
 * Ephemeral match sync for Time Wasters human PvP (not persisted, no unread).
 * Delivered to each player's `user:{id}` inbox room (auto-joined on connect).
 */
export function broadcastLabCommsMatchState(
  recipientUserIds: number[],
  payload: LabCommsMatchStatePayload,
): void {
  if (!labCommsIo) {
    return;
  }
  const nsp = labCommsIo.of('/lab-comms');
  const unique = [...new Set(recipientUserIds.filter((id) => id > 0))];
  for (const userId of unique) {
    nsp.to(`user:${userId}`).emit(LAB_COMMS_EVENTS.MATCH_STATE, payload);
  }
}
