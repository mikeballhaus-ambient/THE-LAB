import type { Server as SocketIOServer } from 'socket.io';
import type { LabEnvelope } from '@/shared/types/lab-comms';
import { LAB_COMMS_EVENTS } from '@/shared/types/lab-comms-events';
import { labCommsService } from './lab-comms-service';

/** Mirror socket fan-out after `labCommsService.sendDmText` (workflow / server-initiated DMs). */
export function broadcastLabCommsDmEnvelope(
  io: SocketIOServer | undefined,
  fromUserId: number,
  toUserId: number,
  envelope: LabEnvelope,
): void {
  if (!io) {
    return;
  }
  const nsp = io.of('/lab-comms');
  nsp.to(envelope.channelId).emit(LAB_COMMS_EVENTS.MESSAGE, envelope);
  nsp.to(`user:${toUserId}`).emit(LAB_COMMS_EVENTS.MESSAGE, envelope);
  nsp.to(`user:${fromUserId}`).emit(LAB_COMMS_EVENTS.MESSAGE, envelope);
  nsp
    .to(`user:${toUserId}`)
    .emit(LAB_COMMS_EVENTS.UNREAD_SUMMARY, labCommsService.unreadSummary(toUserId));
}
