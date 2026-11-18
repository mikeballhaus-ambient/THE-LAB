import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { User } from '@/shared/types/user';
import { LAB_COMMS_EVENTS } from '@/shared/types/lab-comms-events';
import {
  CommsHistoryRequestSchema,
  CommsClearHistorySchema,
  CommsMarkReadSchema,
  CommsSendSchema,
  CommsSubscribeSchema,
  CommsUnsubscribeSchema,
} from '@/shared/types/schemas/lab-comms-schema';
import { CommsGameInviteEnvelopeSchema as CommsSendEnvelopeSchema } from '@/shared/types/schemas/lab-comms-game-invite-schema';
import { authSocketMiddleware } from '../middleware/auth';
import {
  canAccessDmHistory,
  canMarkRead,
  canSubscribe,
} from './lab-comms-acl';
import { labCommsService } from './lab-comms-service';
import { isLabPlatformSystemUserId } from '@/shared/config/lab-platform-system-user';
import { checkCommsSendRateLimit } from './lab-comms-rate-limit';
import {
  allPresenceStates,
  presenceStateForUser,
  recordActivity,
  removePresenceSocket,
  touchPresence,
} from './lab-comms-presence';

type AuthSocket = Socket & {
  user?: User;
  userId?: string;
};

function resolveUserId(socket: AuthSocket): number | null {
  const raw = socket.user?.userId ?? socket.userId;
  if (raw == null) {
    return null;
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function emitError(socket: AuthSocket, code: string, message: string): void {
  socket.emit(LAB_COMMS_EVENTS.ERROR, { code, message });
}

function pushUnreadSummary(socket: AuthSocket, userId: number): void {
  socket.emit(LAB_COMMS_EVENTS.UNREAD_SUMMARY, labCommsService.unreadSummary(userId));
}

export function registerLabCommsSocket(io: SocketIOServer): void {
  const nsp = io.of('/lab-comms');

  nsp.use(authSocketMiddleware);
  nsp.use((socket, next) => {
    const userId = resolveUserId(socket as AuthSocket);
    if (!userId) {
      return next(new Error('Authentication required for lab comms'));
    }
    next();
  });

  nsp.on('connection', (socket: AuthSocket) => {
    const userId = resolveUserId(socket);
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    const inboxChannel = `user:${userId}`;
    socket.join(inboxChannel);
    touchPresence(userId, socket.id);
    recordActivity(userId);

    pushUnreadSummary(socket, userId);
    socket.emit(LAB_COMMS_EVENTS.PRESENCE_SNAPSHOT, allPresenceStates());
    nsp.emit(LAB_COMMS_EVENTS.PRESENCE_UPDATE, presenceStateForUser(userId));

    socket.on(LAB_COMMS_EVENTS.SUBSCRIBE, (payload: unknown) => {
      const parsed = CommsSubscribeSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, 'INVALID_PAYLOAD', 'Invalid subscribe payload');
        return;
      }
      for (const channelId of parsed.data.channelIds) {
        if (!canSubscribe(userId, channelId)) {
          emitError(socket, 'FORBIDDEN', `Cannot subscribe to ${channelId}`);
          continue;
        }
        socket.join(channelId);
      }
    });

    socket.on(LAB_COMMS_EVENTS.UNSUBSCRIBE, (payload: unknown) => {
      const parsed = CommsUnsubscribeSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, 'INVALID_PAYLOAD', 'Invalid unsubscribe payload');
        return;
      }
      for (const channelId of parsed.data.channelIds) {
        socket.leave(channelId);
      }
    });

    socket.on(LAB_COMMS_EVENTS.SEND, (payload: unknown) => {
      const parsed = CommsSendSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, 'INVALID_PAYLOAD', 'Invalid send payload');
        return;
      }
      if (isLabPlatformSystemUserId(parsed.data.targetUserId)) {
        emitError(socket, 'SYSTEM_DM_READONLY', 'Cannot send messages to THE-LAB automation');
        return;
      }
      const rate = checkCommsSendRateLimit(userId);
      if (!rate.allowed) {
        emitError(socket, 'RATE_LIMIT', 'Too many messages; try again shortly');
        return;
      }
      recordActivity(userId);
      const result = labCommsService.sendDmText(
        userId,
        parsed.data.targetUserId,
        parsed.data.text,
      );
      if (!result.success) {
        emitError(socket, result.code, result.message);
        return;
      }
      const { envelope } = result;
      nsp.to(envelope.channelId).emit(LAB_COMMS_EVENTS.MESSAGE, envelope);
      nsp.to(`user:${parsed.data.targetUserId}`).emit(LAB_COMMS_EVENTS.MESSAGE, envelope);
      nsp.to(`user:${userId}`).emit(LAB_COMMS_EVENTS.MESSAGE, envelope);

      pushUnreadSummary(socket, userId);
      nsp
        .to(`user:${parsed.data.targetUserId}`)
        .emit(
          LAB_COMMS_EVENTS.UNREAD_SUMMARY,
          labCommsService.unreadSummary(parsed.data.targetUserId),
        );
    });

    socket.on(LAB_COMMS_EVENTS.SEND_ENVELOPE, (payload: unknown) => {
      const parsed = CommsSendEnvelopeSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, 'INVALID_PAYLOAD', 'Invalid envelope send payload');
        return;
      }
      if (isLabPlatformSystemUserId(parsed.data.targetUserId)) {
        emitError(socket, 'SYSTEM_DM_READONLY', 'Cannot send messages to THE-LAB automation');
        return;
      }
      const rate = checkCommsSendRateLimit(userId);
      if (!rate.allowed) {
        emitError(socket, 'RATE_LIMIT', 'Too many messages; try again shortly');
        return;
      }
      recordActivity(userId);
      const result = labCommsService.sendDmEnvelope(
        userId,
        parsed.data.targetUserId,
        parsed.data.type,
        parsed.data.payload,
      );
      if (!result.success) {
        emitError(socket, result.code, result.message);
        return;
      }
      const { envelope } = result;
      nsp.to(envelope.channelId).emit(LAB_COMMS_EVENTS.MESSAGE, envelope);
      nsp.to(`user:${parsed.data.targetUserId}`).emit(LAB_COMMS_EVENTS.MESSAGE, envelope);
      nsp.to(`user:${userId}`).emit(LAB_COMMS_EVENTS.MESSAGE, envelope);

      pushUnreadSummary(socket, userId);
      nsp
        .to(`user:${parsed.data.targetUserId}`)
        .emit(
          LAB_COMMS_EVENTS.UNREAD_SUMMARY,
          labCommsService.unreadSummary(parsed.data.targetUserId),
        );
    });

    socket.on(LAB_COMMS_EVENTS.HISTORY_REQUEST, (payload: unknown) => {
      const parsed = CommsHistoryRequestSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, 'INVALID_PAYLOAD', 'Invalid history request');
        return;
      }
      if (!canAccessDmHistory(userId, parsed.data.channelId)) {
        emitError(socket, 'FORBIDDEN', 'Cannot read this channel');
        return;
      }
      const messages = labCommsService.listHistory(
        userId,
        parsed.data.channelId,
        parsed.data.limit,
        parsed.data.before,
      );
      socket.emit(LAB_COMMS_EVENTS.HISTORY_RESPONSE, {
        channelId: parsed.data.channelId,
        messages,
      });
    });

    socket.on(LAB_COMMS_EVENTS.CHANNELS_REQUEST, () => {
      const channels = labCommsService.listDmChannelsForUser(userId);
      socket.emit(LAB_COMMS_EVENTS.CHANNELS_RESPONSE, { channels });
    });

    socket.on(LAB_COMMS_EVENTS.CLEAR_HISTORY, (payload: unknown) => {
      const parsed = CommsClearHistorySchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, 'INVALID_PAYLOAD', 'Invalid clear-history payload');
        return;
      }
      if (!canAccessDmHistory(userId, parsed.data.channelId)) {
        emitError(socket, 'FORBIDDEN', 'Cannot clear this channel');
        return;
      }
      labCommsService.clearChannelHistoryForUser(userId, parsed.data.channelId);
      pushUnreadSummary(socket, userId);
      socket.emit(LAB_COMMS_EVENTS.CLEAR_HISTORY_RESPONSE, {
        channelId: parsed.data.channelId,
      });
    });

    socket.on(LAB_COMMS_EVENTS.MARK_READ, (payload: unknown) => {
      const parsed = CommsMarkReadSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, 'INVALID_PAYLOAD', 'Invalid mark-read payload');
        return;
      }
      if (!canMarkRead(userId, parsed.data.channelId)) {
        emitError(socket, 'FORBIDDEN', 'Cannot mark this channel read');
        return;
      }
      labCommsService.markChannelRead(userId, parsed.data.channelId);
      pushUnreadSummary(socket, userId);
    });

    socket.on(LAB_COMMS_EVENTS.ACTIVITY, () => {
      recordActivity(userId);
      nsp.emit(LAB_COMMS_EVENTS.PRESENCE_UPDATE, presenceStateForUser(userId));
    });

    socket.on('disconnect', () => {
      removePresenceSocket(userId, socket.id);
      nsp.emit(LAB_COMMS_EVENTS.PRESENCE_UPDATE, presenceStateForUser(userId));
    });
  });
}
