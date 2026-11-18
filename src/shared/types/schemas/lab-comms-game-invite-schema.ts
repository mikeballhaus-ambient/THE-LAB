import { z } from 'zod';
import {
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_ACCEPT,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY,
} from '../lab-comms-game-invite';

const appIdField = z.string().min(1);

export const GameInvitePayloadSchema = z.object({
  appId: appIdField,
  inviteId: z.string().uuid(),
  gameId: z.string().min(1),
  gameName: z.string().optional(),
  rules: z
    .object({
      turnTimerMs: z.number().int().positive().optional(),
      rulesProfile: z.enum(['free', 'eight-ball', 'nine-ball']).optional(),
      wagerQuarks: z.number().int().min(0).optional(),
    })
    .optional(),
  expiresAt: z.string().optional(),
});

export const GameInviteAcceptPayloadSchema = z.object({
  appId: appIdField,
  inviteId: z.string().uuid(),
  matchId: z.string().uuid(),
  gameId: z.string().min(1),
});

export const GameInviteDeclinePayloadSchema = z.object({
  appId: appIdField,
  inviteId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const GameInviteCancelPayloadSchema = z.object({
  appId: appIdField,
  inviteId: z.string().uuid(),
});

export const GameMatchReadyPayloadSchema = z.object({
  appId: appIdField,
  matchId: z.string().uuid(),
  gameId: z.string().min(1),
  roomId: z.string().optional(),
});

/** Legacy tw.* payloads (no appId) — validated then defaulted at runtime. */
export const LegacyTwInvitePayloadSchema = z.object({
  inviteId: z.string().uuid(),
  gameId: z.string().min(1),
  gameName: z.string().optional(),
  rules: z
    .object({
      turnTimerMs: z.number().int().positive().optional(),
      rulesProfile: z.enum(['free', 'eight-ball', 'nine-ball']).optional(),
      wagerQuarks: z.number().int().min(0).optional(),
    })
    .optional(),
  expiresAt: z.string().optional(),
});

export const LegacyTwInviteAcceptPayloadSchema = z.object({
  inviteId: z.string().uuid(),
  matchId: z.string().uuid(),
  gameId: z.string().min(1),
});

export const LegacyTwInviteDeclinePayloadSchema = z.object({
  inviteId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const LegacyTwInviteCancelPayloadSchema = z.object({
  inviteId: z.string().uuid(),
});

export const LegacyTwMatchReadyPayloadSchema = z.object({
  matchId: z.string().uuid(),
  gameId: z.string().min(1),
  roomId: z.string().optional(),
});

export const GAME_INVITE_COMMS_TYPES = [
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_ACCEPT,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY,
  'tw.invite',
  'tw.invite.accept',
  'tw.invite.decline',
  'tw.invite.cancel',
  'tw.match.ready',
] as const;

export const CommsGameInviteEnvelopeSchema = z.object({
  targetUserId: z.number().int().positive(),
  type: z.enum(GAME_INVITE_COMMS_TYPES),
  payload: z.record(z.string(), z.unknown()),
});

const payloadValidators: Record<string, z.ZodTypeAny> = {
  [LAB_COMMS_MESSAGE_TYPE_GAME_INVITE]: GameInvitePayloadSchema,
  [LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_ACCEPT]: GameInviteAcceptPayloadSchema,
  [LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE]: GameInviteDeclinePayloadSchema,
  [LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL]: GameInviteCancelPayloadSchema,
  [LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY]: GameMatchReadyPayloadSchema,
  'tw.invite': LegacyTwInvitePayloadSchema,
  'tw.invite.accept': LegacyTwInviteAcceptPayloadSchema,
  'tw.invite.decline': LegacyTwInviteDeclinePayloadSchema,
  'tw.invite.cancel': LegacyTwInviteCancelPayloadSchema,
  'tw.match.ready': LegacyTwMatchReadyPayloadSchema,
};

export function validateGameInviteEnvelopePayload(
  type: string,
  payload: Record<string, unknown>,
): { ok: true } | { ok: false; message: string } {
  const schema = payloadValidators[type];
  if (!schema) {
    return { ok: false, message: 'Unsupported envelope type' };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.message };
  }
  return { ok: true };
}

/** @deprecated Use validateGameInviteEnvelopePayload */
export const validateTwEnvelopePayload = validateGameInviteEnvelopePayload;
