import type { GameSocketEvents } from '@/shared/game-platform/types';

export const CHECKERS_SOCKET_EVENTS: GameSocketEvents = {
  gamesList: 'checkers:games:list',
  runSubmit: 'checkers:run:submit',
  h2hGet: 'checkers:h2h:get',
  matchGet: 'checkers:match:get',
  matchCreateAi: 'checkers:match:create-ai',
  matchMove: 'checkers:match:move',
  matchAgentTurn: 'checkers:match:agent-turn',
  matchAgentDelta: 'checkers:match:agent-delta',
  matchAgentDone: 'checkers:match:agent-done',
  matchState: 'checkers:match:state',
  matchError: 'checkers:match:error',
  inviteCreate: 'checkers:invite:create',
  inviteAccept: 'checkers:invite:accept',
  inviteCancel: 'checkers:invite:cancel',
  inviteDecline: 'checkers:invite:decline',
};
