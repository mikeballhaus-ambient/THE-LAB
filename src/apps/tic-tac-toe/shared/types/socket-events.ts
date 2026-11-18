import type { GameSocketEvents } from '@/shared/game-platform/types';

/**
 * Canonical `tic-tac-toe:*` socket event names for the shared game kit.
 *
 * `registerGameSocket` reads these from `GamePlatformConfig.socketEvents`, so the
 * kit owns the transport and this app only supplies the names.
 */
export const TT_SOCKET_EVENTS: GameSocketEvents = {
  gamesList: 'tic-tac-toe:games:list',
  runSubmit: 'tic-tac-toe:run:submit',
  h2hGet: 'tic-tac-toe:h2h:get',
  matchGet: 'tic-tac-toe:match:get',
  matchCreateAi: 'tic-tac-toe:match:create-ai',
  matchMove: 'tic-tac-toe:match:move',
  matchAgentTurn: 'tic-tac-toe:match:agent-turn',
  matchAgentDelta: 'tic-tac-toe:match:agent-delta',
  matchAgentDone: 'tic-tac-toe:match:agent-done',
  matchState: 'tic-tac-toe:match:state',
  matchError: 'tic-tac-toe:match:error',
  inviteCreate: 'tic-tac-toe:invite:create',
  inviteAccept: 'tic-tac-toe:invite:accept',
  inviteCancel: 'tic-tac-toe:invite:cancel',
  inviteDecline: 'tic-tac-toe:invite:decline',
};
