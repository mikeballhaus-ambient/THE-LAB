import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { TIC_TAC_TOE_GAME_CATALOG } from '../back-end/catalog';
import { TT_SOCKET_EVENTS } from './types/socket-events';

/** Default per-turn cap for turn-based matches (5 min), overridable per match. */
export const DEFAULT_TURN_TIMER_MS = 300_000;

/**
 * Tic-Tac-Toe platform wiring — consumed by the shared game-platform kit
 * (`GameRunsService`, `TurnBasedMatchService`, socket registrar, HTTP routes).
 */
export const TIC_TAC_TOE_CONFIG: GamePlatformConfig = {
  appId: 'app-tic-tac-toe',
  appSlug: 'tic-tac-toe',
  catalog: TIC_TAC_TOE_GAME_CATALOG,
  matchTablePrefix: 'ttt',
  socketEvents: TT_SOCKET_EVENTS,
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'tic-tac-toe.agent-turn',
  /** Coin-flip who opens, per the kit contract. */
  randomizeStartingSeat: true,
};
