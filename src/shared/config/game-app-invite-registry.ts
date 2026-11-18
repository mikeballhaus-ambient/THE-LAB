/**
 * Platform registry: which catalog app handles game invites over lab-comms + which
 * Socket.IO ack events to use on the app server (no imports from src/apps/*).
 */

export interface GameAppInviteSocketEvents {
  inviteAccept: string;
  inviteDecline: string;
}

export interface GameAppInviteRegistryEntry {
  displayName: string;
  socketEvents: GameAppInviteSocketEvents;
}

/** Shared socket event names for TW-era hybrid game servers (word-tile uses same until renamed). */
export const LEGACY_TW_STYLE_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'tw:invite:accept',
  inviteDecline: 'tw:invite:decline',
};

/** Tic-Tac-Toe server uses the shared game-platform kit with `ttt:*` events. */
export const TIC_TAC_TOE_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'ttt:invite:accept',
  inviteDecline: 'ttt:invite:decline',
};

/** Checkers runs on the shared game-platform kit with `checkers:*` events. */
export const CHECKERS_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'checkers:invite:accept',
  inviteDecline: 'checkers:invite:decline',
};

/** Chess runs on the shared game-platform kit with `chess:*` events. */
export const CHESS_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'chess:invite:accept',
  inviteDecline: 'chess:invite:decline',
};

/** Connect Four runs on the shared game-platform kit with `connect-four:*` events. */
export const CONNECT_FOUR_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'connect-four:invite:accept',
  inviteDecline: 'connect-four:invite:decline',
};

/** Hangman runs on the shared game-platform kit with `hangman:*` events. */
export const HANGMAN_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'hangman:invite:accept',
  inviteDecline: 'hangman:invite:decline',
};

/** Battleship runs on the shared game-platform kit with `battleship:*` events. */
export const BATTLESHIP_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'battleship:invite:accept',
  inviteDecline: 'battleship:invite:decline',
};

/** Texas Hold'em runs on the shared game-platform kit with `poker-holdem:*` events. */
export const POKER_HOLDEM_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'poker-holdem:invite:accept',
  inviteDecline: 'poker-holdem:invite:decline',
};

/** Blackjack runs on the shared game-platform kit with `blackjack:*` events. */
export const BLACKJACK_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'blackjack:invite:accept',
  inviteDecline: 'blackjack:invite:decline',
};

/** Billiards runs on the shared game-platform kit with `billiards:*` events. */
export const BILLIARDS_INVITE_SOCKET_EVENTS: GameAppInviteSocketEvents = {
  inviteAccept: 'billiards:invite:accept',
  inviteDecline: 'billiards:invite:decline',
};

export const GAME_APP_INVITE_REGISTRY: Record<string, GameAppInviteRegistryEntry> = {
  'app-word-tile': {
    displayName: 'Word Tile',
    socketEvents: LEGACY_TW_STYLE_INVITE_SOCKET_EVENTS,
  },
  'app-checkers': { displayName: 'Checkers', socketEvents: CHECKERS_INVITE_SOCKET_EVENTS },
  'app-chess': { displayName: 'Chess', socketEvents: CHESS_INVITE_SOCKET_EVENTS },
  'app-hangman': { displayName: 'Hangman', socketEvents: HANGMAN_INVITE_SOCKET_EVENTS },
  'app-connect-four': { displayName: 'Connect Four', socketEvents: CONNECT_FOUR_INVITE_SOCKET_EVENTS },
  'app-battleship': { displayName: 'Battleship', socketEvents: BATTLESHIP_INVITE_SOCKET_EVENTS },
  'app-poker-holdem': { displayName: "Texas Hold'em", socketEvents: POKER_HOLDEM_INVITE_SOCKET_EVENTS },
  'app-tic-tac-toe': { displayName: 'Tic-Tac-Toe', socketEvents: TIC_TAC_TOE_INVITE_SOCKET_EVENTS },
  'app-blackjack': { displayName: 'Blackjack', socketEvents: BLACKJACK_INVITE_SOCKET_EVENTS },
  'app-billiards': { displayName: 'Billiards', socketEvents: BILLIARDS_INVITE_SOCKET_EVENTS },
};

export const DEFAULT_LEGACY_GAME_APP_ID = 'app-word-tile';

export function resolveGameAppInviteEntry(appId: string): GameAppInviteRegistryEntry | undefined {
  return GAME_APP_INVITE_REGISTRY[appId];
}

export function resolveGameAppIdFromInvitePayload(
  payload: Record<string, unknown>,
): string {
  const raw = payload.appId;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return DEFAULT_LEGACY_GAME_APP_ID;
}
