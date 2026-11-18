import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { POKER_GAME_CATALOG } from '../back-end/catalog';
import { POKER_SOCKET_EVENTS } from './types/socket-events';

export const DEFAULT_TURN_TIMER_MS = 300_000;

export const POKER_CONFIG: GamePlatformConfig = {
  appId: 'app-poker-holdem',
  appSlug: 'poker-holdem',
  catalog: POKER_GAME_CATALOG,
  matchTablePrefix: 'pk',
  socketEvents: POKER_SOCKET_EVENTS,
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'poker-holdem.agent-turn',
};
