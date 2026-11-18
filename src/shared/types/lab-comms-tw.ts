/**
 * @deprecated Legacy Time Wasters message type constants — use lab-comms-game-invite.ts.
 * Kept for stored messages and gradual migration (tw.* ↔ game.*).
 */
export {
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE as LAB_COMMS_MESSAGE_TYPE_TW_INVITE,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_ACCEPT as LAB_COMMS_MESSAGE_TYPE_TW_INVITE_ACCEPT,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE as LAB_COMMS_MESSAGE_TYPE_TW_INVITE_DECLINE,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL as LAB_COMMS_MESSAGE_TYPE_TW_INVITE_CANCEL,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY as LAB_COMMS_MESSAGE_TYPE_TW_MATCH_READY,
} from './lab-comms-game-invite';

import type {
  GameInvitePayload,
  GameInviteAcceptPayload,
  GameInviteDeclinePayload,
  GameMatchReadyPayload,
} from './lab-comms-game-invite';

/** Legacy shape without appId (dashboard defaults app id). */
export type TwInvitePayload = Omit<GameInvitePayload, 'appId'> & { appId?: string };
export type TwInviteAcceptPayload = Omit<GameInviteAcceptPayload, 'appId'> & { appId?: string };
export type TwInviteDeclinePayload = Omit<GameInviteDeclinePayload, 'appId'> & { appId?: string };
export type TwMatchReadyPayload = Omit<GameMatchReadyPayload, 'appId'> & { appId?: string };
