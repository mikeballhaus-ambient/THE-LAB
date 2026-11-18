/** Generic lab-comms game invite envelopes (app-id keyed). */

export const LAB_COMMS_MESSAGE_TYPE_GAME_INVITE = 'game.invite';
export const LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_ACCEPT = 'game.invite.accept';
export const LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE = 'game.invite.decline';
export const LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL = 'game.invite.cancel';
export const LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY = 'game.match.ready';

export type GameInvitePayload = {
  appId: string;
  inviteId: string;
  gameId: string;
  gameName?: string;
  rules?: {
    turnTimerMs?: number;
    rulesProfile?: 'free' | 'eight-ball' | 'nine-ball';
    wagerQuarks?: number;
  };
  expiresAt?: string;
};

export type GameInviteAcceptPayload = {
  appId: string;
  inviteId: string;
  matchId: string;
  gameId: string;
};

export type GameInviteDeclinePayload = {
  appId: string;
  inviteId: string;
  reason?: string;
};

export type GameInviteCancelPayload = {
  appId: string;
  inviteId: string;
};

export type GameMatchReadyPayload = {
  appId: string;
  matchId: string;
  gameId: string;
  roomId?: string;
};
