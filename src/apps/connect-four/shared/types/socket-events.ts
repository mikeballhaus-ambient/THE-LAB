import type { GameSocketEvents } from '@/shared/game-platform/types';

export const CONNECT_FOUR_SOCKET_EVENTS: GameSocketEvents = {
  gamesList: 'connect-four:games:list',
  runSubmit: 'connect-four:run:submit',
  h2hGet: 'connect-four:h2h:get',
  matchGet: 'connect-four:match:get',
  matchCreateAi: 'connect-four:match:create-ai',
  matchMove: 'connect-four:match:move',
  matchAgentTurn: 'connect-four:match:agent-turn',
  matchAgentDelta: 'connect-four:match:agent-delta',
  matchAgentDone: 'connect-four:match:agent-done',
  matchState: 'connect-four:match:state',
  matchError: 'connect-four:match:error',
  inviteCreate: 'connect-four:invite:create',
  inviteAccept: 'connect-four:invite:accept',
  inviteCancel: 'connect-four:invite:cancel',
  inviteDecline: 'connect-four:invite:decline',
};
