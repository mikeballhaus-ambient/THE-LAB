import type { GameSocketEvents } from '@/shared/game-platform/types';

export const BLACKJACK_SOCKET_EVENTS: GameSocketEvents = {
  gamesList: 'blackjack:games:list',
  runSubmit: 'blackjack:run:submit',
  h2hGet: 'blackjack:h2h:get',
  matchGet: 'blackjack:match:get',
  matchCreateAi: 'blackjack:match:create-ai',
  matchMove: 'blackjack:match:move',
  matchAgentTurn: 'blackjack:match:agent-turn',
  matchAgentDelta: 'blackjack:match:agent-delta',
  matchAgentDone: 'blackjack:match:agent-done',
  matchState: 'blackjack:match:state',
  matchError: 'blackjack:match:error',
  inviteCreate: 'blackjack:invite:create',
  inviteAccept: 'blackjack:invite:accept',
  inviteCancel: 'blackjack:invite:cancel',
  inviteDecline: 'blackjack:invite:decline',
};
