import type { GameSocketEvents } from '@/shared/game-platform/types';

/**
 * Canonical `hangman:*` socket event names for the shared game kit.
 */
export const HANGMAN_SOCKET_EVENTS: GameSocketEvents = {
  gamesList: 'hangman:games:list',
  runSubmit: 'hangman:run:submit',
  h2hGet: 'hangman:h2h:get',
  matchGet: 'hangman:match:get',
  matchCreateAi: 'hangman:match:create-ai',
  matchMove: 'hangman:match:move',
  matchAgentTurn: 'hangman:match:agent-turn',
  matchAgentDelta: 'hangman:match:agent-delta',
  matchAgentDone: 'hangman:match:agent-done',
  matchState: 'hangman:match:state',
  matchError: 'hangman:match:error',
  inviteCreate: 'hangman:invite:create',
  inviteAccept: 'hangman:invite:accept',
  inviteCancel: 'hangman:invite:cancel',
  inviteDecline: 'hangman:invite:decline',
};
