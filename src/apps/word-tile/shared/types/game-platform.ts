/**
 * Word Tile game-platform types.
 *
 * The canonical contracts live in the shared kit (`@/shared/game-platform/types`).
 * This module re-exports them under Word Tile's historical names so the app and
 * the platform cannot drift apart.
 */
import type {
  GameDifficulty,
  GameCatalogEntry as PlatformGameCatalogEntry,
  GameRunPayload as PlatformGameRunPayload,
} from '@/shared/game-platform/types';

export type {
  AgentMode,
  GamePlatformConfig,
  GameSocketEvents,
  HumanHeadToHeadStats,
  MatchArchetype,
  MatchCreateConfig,
  MatchStatus,
  OpponentKind,
  PlayerMode,
  ScoreKind,
  ValidateMoveResult,
} from '@/shared/game-platform/types';

/** Historical alias — platform calls this `GameDifficulty`. */
export type Difficulty = GameDifficulty;

/** Outcome of a finished run. */
export type GameRunOutcome = 'win' | 'loss' | 'draw';

/** Games shipped by this app. */
export const WORD_TILE_GAME_IDS = {
  TILE_WORD_GRID: 'tile-word-grid',
} as const;

/** Derived from {@link WORD_TILE_GAME_IDS} so the union cannot drift. */
export type WordTileGameId =
  (typeof WORD_TILE_GAME_IDS)[keyof typeof WORD_TILE_GAME_IDS];

/** Vs-AI mode picker + API — keep in sync with Zod enums on match create. */
export const VS_AI_DIFFICULTY_OPTIONS: ReadonlyArray<{ label: string; value: Difficulty }> = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
  { label: 'Boss', value: 'boss' },
];

/** Default per-turn cap for turn-based matches (5 minutes). */
export const DEFAULT_TURN_TIMER_MS = 300_000;

/** Word Tile's catalog entry — `id` is narrowed to the app's game ids. */
export interface GameCatalogEntry extends Omit<PlatformGameCatalogEntry, 'id'> {
  id: WordTileGameId;
}

/** Run payload submitted to the platform runs service. */
export interface GameRunPayload extends Omit<PlatformGameRunPayload, 'gameId' | 'difficulty'> {
  gameId: WordTileGameId;
  difficulty?: Difficulty;
}
