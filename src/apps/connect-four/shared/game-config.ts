import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { CONNECT_FOUR_GAME_CATALOG } from '../back-end/catalog';
import { CONNECT_FOUR_SOCKET_EVENTS } from './types/socket-events';

export const DEFAULT_TURN_TIMER_MS = 300_000;

export const CONNECT_FOUR_CONFIG: GamePlatformConfig = {
  appId: 'app-connect-four',
  appSlug: 'connect-four',
  catalog: CONNECT_FOUR_GAME_CATALOG,
  matchTablePrefix: 'cf',
  socketEvents: CONNECT_FOUR_SOCKET_EVENTS,
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'connect-four.agent-turn',
};
