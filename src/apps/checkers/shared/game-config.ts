import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { CHECKERS_GAME_CATALOG } from '../back-end/catalog';
import { CHECKERS_SOCKET_EVENTS } from './types/socket-events';

export const DEFAULT_TURN_TIMER_MS = 300_000;

export const CHECKERS_CONFIG: GamePlatformConfig = {
  appId: 'app-checkers',
  appSlug: 'checkers',
  catalog: CHECKERS_GAME_CATALOG,
  matchTablePrefix: 'ck',
  socketEvents: CHECKERS_SOCKET_EVENTS,
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'checkers.agent-turn',
};
