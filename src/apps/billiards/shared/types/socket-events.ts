import type { GameSocketEvents } from '@/shared/game-platform/types';

export const BILLIARDS_SOCKET_EVENTS: GameSocketEvents = {
  gamesList: 'billiards:games:list',
  runSubmit: 'billiards:run:submit',
  h2hGet: 'billiards:h2h:get',
  matchGet: 'billiards:match:get',
  matchCreateAi: 'billiards:match:create-ai',
  matchCreateSolo: 'billiards:match:create-solo',
  matchMove: 'billiards:match:move',
  matchAgentTurn: 'billiards:match:agent-turn',
  matchAgentDelta: 'billiards:match:agent-delta',
  matchAgentDone: 'billiards:match:agent-done',
  matchState: 'billiards:match:state',
  matchError: 'billiards:match:error',
  inviteCreate: 'billiards:invite:create',
  inviteAccept: 'billiards:invite:accept',
  inviteCancel: 'billiards:invite:cancel',
  inviteDecline: 'billiards:invite:decline',
};
