import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { BLACKJACK_GAME_CATALOG } from '../back-end/catalog';
import { BLACKJACK_SOCKET_EVENTS } from './types/socket-events';

export const DEFAULT_TURN_TIMER_MS = 300_000;

export const BLACKJACK_CONFIG: GamePlatformConfig = {
  appId: 'app-blackjack',
  appSlug: 'blackjack',
  catalog: BLACKJACK_GAME_CATALOG,
  matchTablePrefix: 'bj',
  socketEvents: BLACKJACK_SOCKET_EVENTS,
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'blackjack.agent-turn',
};
