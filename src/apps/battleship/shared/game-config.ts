import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { BATTLESHIP_GAME_CATALOG } from '../back-end/catalog';
import { BATTLESHIP_SOCKET_EVENTS } from './types/socket-events';

export const DEFAULT_TURN_TIMER_MS = 300_000;

/** Ships per fleet — must match {@link BS_SHIP_LENGTHS} in back-end rules. */
export const BATTLESHIP_FLEET_SHIP_COUNT = 5;

export const BATTLESHIP_CONFIG: GamePlatformConfig = {
  appId: 'app-battleship',
  appSlug: 'battleship',
  catalog: BATTLESHIP_GAME_CATALOG,
  matchTablePrefix: 'bs',
  socketEvents: BATTLESHIP_SOCKET_EVENTS,
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'battleship.agent-turn',
};
