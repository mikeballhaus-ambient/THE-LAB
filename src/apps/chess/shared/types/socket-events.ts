import type { GameSocketEvents } from '@/shared/game-platform/types';

export const CHESS_SOCKET_EVENTS: GameSocketEvents = {
  gamesList: 'chess:games:list',
  runSubmit: 'chess:run:submit',
  h2hGet: 'chess:h2h:get',
  matchGet: 'chess:match:get',
  matchCreateAi: 'chess:match:create-ai',
  matchMove: 'chess:match:move',
  matchAgentTurn: 'chess:match:agent-turn',
  matchAgentDelta: 'chess:match:agent-delta',
  matchAgentDone: 'chess:match:agent-done',
  matchState: 'chess:match:state',
  matchError: 'chess:match:error',
  inviteCreate: 'chess:invite:create',
  inviteAccept: 'chess:invite:accept',
  inviteCancel: 'chess:invite:cancel',
  inviteDecline: 'chess:invite:decline',
};
