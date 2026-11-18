import { z } from 'zod';
import type { DmChannelId, LabChannelId } from '../lab-comms';
import { LAB_COMMS_MAX_MESSAGE_LENGTH } from '../lab-comms';

const DM_CHANNEL_REGEX = /^dm:(\d+):(\d+)$/;
const USER_CHANNEL_REGEX = /^user:(\d+)$/;
const ROOM_CHANNEL_REGEX = /^room:([0-9a-f-]{36})$/i;

export function dmChannelId(a: number, b: number): DmChannelId {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) {
    throw new Error('dmChannelId requires positive integer user ids');
  }
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return `dm:${lo}:${hi}`;
}

export type ParsedChannelId =
  | { kind: 'dm'; channelId: DmChannelId; userLo: number; userHi: number }
  | { kind: 'user'; channelId: `user:${number}`; userId: number }
  | { kind: 'room'; channelId: `room:${string}`; roomId: string };

export function parseChannelId(raw: string): ParsedChannelId | null {
  const dm = DM_CHANNEL_REGEX.exec(raw);
  if (dm) {
    const userLo = parseInt(dm[1], 10);
    const userHi = parseInt(dm[2], 10);
    if (userLo >= userHi) {
      return null;
    }
    return {
      kind: 'dm',
      channelId: raw as DmChannelId,
      userLo,
      userHi,
    };
  }
  const user = USER_CHANNEL_REGEX.exec(raw);
  if (user) {
    const userId = parseInt(user[1], 10);
    if (userId <= 0) {
      return null;
    }
    return { kind: 'user', channelId: raw as `user:${number}`, userId };
  }
  const room = ROOM_CHANNEL_REGEX.exec(raw);
  if (room) {
    return { kind: 'room', channelId: raw as `room:${string}`, roomId: room[1] };
  }
  return null;
}

export function isLabChannelId(value: string): value is LabChannelId {
  return parseChannelId(value) !== null;
}

export const DmTextPayloadSchema = z.object({
  text: z.string().min(1).max(LAB_COMMS_MAX_MESSAGE_LENGTH),
});

export const CommsSendSchema = z.object({
  targetUserId: z.number().int().positive(),
  text: z.string().min(1).max(LAB_COMMS_MAX_MESSAGE_LENGTH),
});

export const CommsSubscribeSchema = z.object({
  channelIds: z.array(z.string().min(1)).min(1),
});

export const CommsUnsubscribeSchema = CommsSubscribeSchema;

export const CommsHistoryRequestSchema = z.object({
  channelId: z.string().min(1),
  limit: z.number().int().positive().max(100).optional(),
  before: z.string().optional(),
});

export const CommsMarkReadSchema = z.object({
  channelId: z.string().min(1),
});

export const CommsClearHistorySchema = CommsMarkReadSchema;

export const LabEnvelopeSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().min(1),
  type: z.string().min(1),
  senderUserId: z.number().int().positive(),
  sentAt: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  replyTo: z.string().uuid().optional(),
});
