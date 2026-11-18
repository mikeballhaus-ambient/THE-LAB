import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { CHESS_GAME_CATALOG } from '../back-end/catalog';
import { CHESS_SOCKET_EVENTS } from './types/socket-events';

export const DEFAULT_TURN_TIMER_MS = 300_000;

export const CHESS_CONFIG: GamePlatformConfig = {
  appId: 'app-chess',
  appSlug: 'chess',
  catalog: CHESS_GAME_CATALOG,
  matchTablePrefix: 'ch',
  socketEvents: CHESS_SOCKET_EVENTS,
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'chess.agent-turn',
};
