/**
 * Solitaire app shared types + app-local Socket.IO event constants.
 *
 * Registry id is `app-solitaire` (App Management); the internal app id used for the
 * per-app database, host id, and LLM `purpose` is the folder slug `solitaire`.
 */

export const SOLITAIRE_APP_ID = 'app-solitaire';

/** Internal app id (folder slug) for `AppDatabaseService.getInstance(...)`. */
export const SOLITAIRE_DB_ID = 'solitaire';

export const SOLITAIRE_GAME_IDS = {
  KLONDIKE: 'klondike',
} as const;

export type SolitaireGameId = (typeof SOLITAIRE_GAME_IDS)[keyof typeof SOLITAIRE_GAME_IDS];

export type ScoreKind = 'points-higher' | 'time-lower' | 'streak-higher' | 'composite';

export type GameRunOutcome = 'win' | 'loss' | 'draw';

export interface GameRunPayload {
  gameId: SolitaireGameId;
  outcome: GameRunOutcome;
  /** Klondike: elapsed milliseconds (time-lower). */
  primaryValue: number;
  /** Klondike: move count. */
  secondaryValue?: number;
  durationMs: number;
  metadata?: Record<string, string | number | boolean>;
  runId: string;
}

export interface GameCatalogEntry {
  id: SolitaireGameId;
  name: string;
  description: string;
  faIcon: string;
  order: number;
  scoreKind: ScoreKind;
  personalBest: { primary: number; secondary: number | null } | null;
}

export interface SubmitRunResult {
  accepted: boolean;
  personalBest: boolean;
}

/**
 * Solitaire hybrid app — Socket.IO on the app server port (4000–4999),
 * never the main backend (:3000) or platform `/lab-comms`.
 */
export const SOLITAIRE_SOCKET_EVENTS = {
  GAMES_LIST: 'solitaire:games:list',
  RUN_SUBMIT: 'solitaire:run:submit',
} as const;

export type SolitaireSocketAck<T> =
  | { success: true; data: T }
  | { success: false; error: string };
