import type { GameSocketEvents } from '@/shared/game-platform/types';

export const POKER_SOCKET_EVENTS: GameSocketEvents = {
  gamesList: 'poker-holdem:games:list',
  runSubmit: 'poker-holdem:run:submit',
  h2hGet: 'poker-holdem:h2h:get',
  matchGet: 'poker-holdem:match:get',
  matchCreateAi: 'poker-holdem:match:create-ai',
  matchMove: 'poker-holdem:match:move',
  matchAgentTurn: 'poker-holdem:match:agent-turn',
  matchAgentDelta: 'poker-holdem:match:agent-delta',
  matchAgentDone: 'poker-holdem:match:agent-done',
  matchState: 'poker-holdem:match:state',
  matchError: 'poker-holdem:match:error',
  inviteCreate: 'poker-holdem:invite:create',
  inviteAccept: 'poker-holdem:invite:accept',
  inviteCancel: 'poker-holdem:invite:cancel',
  inviteDecline: 'poker-holdem:invite:decline',
};
