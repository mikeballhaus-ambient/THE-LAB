import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { HANGMAN_GAME_CATALOG } from '../back-end/catalog';
import { HANGMAN_SOCKET_EVENTS } from './types/socket-events';

/** Default per-turn cap for turn-based matches (5 min). */
export const DEFAULT_TURN_TIMER_MS = 300_000;

/** Hangman platform wiring for the shared game-platform kit. */
export const HANGMAN_CONFIG: GamePlatformConfig = {
  appId: 'app-hangman',
  appSlug: 'hangman',
  catalog: HANGMAN_GAME_CATALOG,
  matchTablePrefix: 'hm',
  socketEvents: HANGMAN_SOCKET_EVENTS,
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'hangman.agent-turn',
};
