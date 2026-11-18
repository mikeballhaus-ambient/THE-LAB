import type { GamePlatformConfig } from '@/shared/game-platform/types';
import { WORD_TILE_GAME_CATALOG } from '../back-end/catalog';
import { TW_SOCKET_EVENTS } from './types/socket-events';
import { DEFAULT_TURN_TIMER_MS } from './types/game-platform';

/**
 * Word Tile platform wiring — consumed by the shared game-platform kit
 * (`GameRunsService`, match service, socket registrar).
 */
export const WORD_TILE_CONFIG: GamePlatformConfig = {
  appId: 'app-word-tile',
  appSlug: 'word-tile',
  catalog: WORD_TILE_GAME_CATALOG,
  matchTablePrefix: 'tw',
  socketEvents: {
    gamesList: TW_SOCKET_EVENTS.GAMES_LIST,
    runSubmit: TW_SOCKET_EVENTS.RUN_SUBMIT,
    h2hGet: TW_SOCKET_EVENTS.H2H_GET,
    matchGet: TW_SOCKET_EVENTS.MATCH_GET,
    matchCreateAi: TW_SOCKET_EVENTS.MATCH_CREATE_AI,
    matchMove: TW_SOCKET_EVENTS.MATCH_MOVE,
    matchAgentTurn: TW_SOCKET_EVENTS.MATCH_AGENT_TURN,
    matchAgentDelta: TW_SOCKET_EVENTS.MATCH_AGENT_DELTA,
    matchAgentDone: TW_SOCKET_EVENTS.MATCH_AGENT_DONE,
    matchState: TW_SOCKET_EVENTS.MATCH_STATE,
    matchError: TW_SOCKET_EVENTS.MATCH_ERROR,
    inviteCreate: TW_SOCKET_EVENTS.INVITE_CREATE,
    inviteAccept: TW_SOCKET_EVENTS.INVITE_ACCEPT,
    inviteCancel: TW_SOCKET_EVENTS.INVITE_CANCEL,
    inviteDecline: TW_SOCKET_EVENTS.INVITE_DECLINE,
  },
  defaultTurnTimerMs: DEFAULT_TURN_TIMER_MS,
  purposePrefix: 'word-tile.agent-turn',
};
