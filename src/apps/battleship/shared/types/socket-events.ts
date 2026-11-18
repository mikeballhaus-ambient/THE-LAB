import type { GameSocketEvents } from '@/shared/game-platform/types';

export const BATTLESHIP_SOCKET_EVENTS: GameSocketEvents = {
  gamesList: 'battleship:games:list',
  runSubmit: 'battleship:run:submit',
  h2hGet: 'battleship:h2h:get',
  matchGet: 'battleship:match:get',
  matchCreateAi: 'battleship:match:create-ai',
  matchMove: 'battleship:match:move',
  matchAgentTurn: 'battleship:match:agent-turn',
  matchAgentDelta: 'battleship:match:agent-delta',
  matchAgentDone: 'battleship:match:agent-done',
  matchState: 'battleship:match:state',
  matchError: 'battleship:match:error',
  inviteCreate: 'battleship:invite:create',
  inviteAccept: 'battleship:invite:accept',
  inviteCancel: 'battleship:invite:cancel',
  inviteDecline: 'battleship:invite:decline',
};
