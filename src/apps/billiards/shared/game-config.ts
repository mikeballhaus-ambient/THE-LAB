import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { BILLIARDS_GAME_CATALOG } from '../back-end/catalog';
import { BILLIARDS_SOCKET_EVENTS } from './types/socket-events';

export const DEFAULT_TURN_TIMER_MS = 120_000;

export const BILLIARDS_CONFIG: GamePlatformConfig = {
  appId: 'app-billiards',
  appSlug: 'billiards',
  catalog: BILLIARDS_GAME_CATALOG,
  matchTablePrefix: 'bl',
  socketEvents: BILLIARDS_SOCKET_EVENTS,
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'billiards.agent-turn',
  randomizeStartingSeat: true,
};
