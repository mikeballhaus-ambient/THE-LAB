/**
 * Shared turn-based game platform — core contracts.
 *
 * App-agnostic: apps register a {@link GameServerAdapter} + catalog at server boot.
 * Nothing here imports `src/apps/**` (decoupling rule, AGENTS.md #10).
 */
import type { PlatformAgentTurnDeps } from '@/shared/types/platform-agent-turn';
import type { LabVirtualBankReasonCode } from '@/shared/types/lab-virtual-bank';

export interface VirtualBankSettlementLine {
  labUserId: number;
  delta: number;
  reasonCode: LabVirtualBankReasonCode;
  reasonLabel: string;
  sourceRef?: string;
}

// ---------------------------------------------------------------------------
// Enumerations (superset of Word Tile's shared types)
// ---------------------------------------------------------------------------

export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'boss';
export type OpponentKind = 'ai' | 'human' | 'solo';
export type MatchStatus = 'active' | 'finished';
export type ScoreKind = 'points-higher' | 'time-lower';
export type PlayerMode = 'solo' | 'multiplayer';
export type MatchArchetype = 'solo' | 'parallel-score' | 'turn-based';
export type AgentMode = 'llm' | 'scripted' | 'none';

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface GameCatalogEntry {
  id: string;
  name: string;
  description: string;
  faIcon: string;
  order: number;
  playerMode: PlayerMode;
  matchArchetype: MatchArchetype;
  scoreKind: ScoreKind;
  agentMode: AgentMode;
}

// ---------------------------------------------------------------------------
// Adapter contract
// ---------------------------------------------------------------------------

export interface MatchCreateConfig {
  gameId: string;
  opponentKind: OpponentKind;
  difficulty?: GameDifficulty;
  player1Id: number;
  player2Id: number;
  rules?: {
    turnTimerMs?: number;
    practice?: boolean;
    rulesProfile?: 'free' | 'eight-ball' | 'nine-ball';
    /** Vs-AI wager escrowed in match state (Quarks); 0 = no bet. */
    wagerQuarks?: number;
  };
  /** Seat to move first (1 or 2). Defaults to 1 when omitted. */
  startingSeat?: number;
}

export interface ValidateMoveResult {
  ok: boolean;
  error?: string;
}

/**
 * A game's server-side rules adapter. `state` / `move` are `unknown` so the kit
 * can hold adapters for every game in one registry; each app casts internally.
 */
export interface GameServerAdapter {
  gameId: string;
  createInitialState(config: MatchCreateConfig): unknown;
  validateMove(state: unknown, move: unknown, playerSeat: number): ValidateMoveResult;
  applyMove(state: unknown, move: unknown, playerSeat: number): unknown;
  scores(state: unknown): Record<number, number>;
  isFinished(state: unknown): boolean;
  winnerSeat(state: unknown): number | null;
  onTurnTimeout(state: unknown, playerSeat: number): unknown;
  /**
   * Optional seat override for who moves first (overrides
   * `GamePlatformConfig.randomizeStartingSeat` / the default seat 1). Lets a game
   * derive the opening seat from its own state (e.g. Hangman's random
   * setter/guesser roles).
   */
  initialSeat?(state: unknown): number;
  /**
   * Optional seat to move next. Return `null` when the match is finished. When
   * omitted the kit alternates seats. Lets a game keep the same seat on turn
   * (e.g. a Hangman guesser guessing letters until they win or strike out).
   */
  nextSeatAfterMove?(
    state: unknown,
    move: unknown,
    moverSeat: number,
    appliedState: unknown,
  ): number | null;
  /** Uses the human player's configured chat provider via the platform completion API. */
  agentMoveAsync?(
    state: unknown,
    difficulty: GameDifficulty,
    playerSeat: number,
    deps: PlatformAgentTurnDeps,
  ): Promise<unknown>;
  /** Optional human-readable summary of a move for the player-turns panel. */
  summarizeMove?(move: unknown): string;
  /**
   * Vs-AI wager validation. Return authorized Quarks (0 = no bet). Throw when `requested` is invalid.
   */
  resolveAiMatchWagerQuarks?(difficulty: GameDifficulty, requested: number | undefined): number;
  /** Friend-invite wager validation. Return authorized Quarks (0 = no bet). Throw when `requested` is invalid. */
  resolveHumanMatchWagerQuarks?(requested: number | undefined): number;
  /**
   * Chip ledger lines when a match finishes (pots, antes). When omitted, the kit
   * may credit {@link LAB_VIRTUAL_BANK_WIN_REWARDS} for wins instead.
   */
  virtualBankSettlements?(
    state: unknown,
    context: { matchId: string; player1Id: number; player2Id: number },
  ): VirtualBankSettlementLine[];
  /**
   * Optional per-seat redaction of the persisted state before it is sent to a
   * viewer. Used for hidden-information games (e.g. Battleship: hide the
   * opponent's fleet). Omitting the hook sends the raw state.
   */
  redactStateForSeat?(state: unknown, viewerSeat: number): unknown;
}

// ---------------------------------------------------------------------------
// Match view (client-facing)
// ---------------------------------------------------------------------------

export interface MatchView {
  matchId: string;
  gameId: string;
  status: MatchStatus;
  opponentKind: OpponentKind;
  difficulty: GameDifficulty | null;
  yourSeat: number;
  currentSeat: number;
  state: unknown;
  scores: Record<number, number>;
  turnRemainingMs: number;
  winnerUserId: number | null;
  player1Id: number;
  player2Id: number;
  /** When true, Quarks shown in-game are simulated; ledger settlement is skipped. */
  practice?: boolean;
  /** Monotonic authority counter bumped with each persisted state mutation. */
  stateRevision?: number;
}

// ---------------------------------------------------------------------------
// Runs / head-to-head
// ---------------------------------------------------------------------------

export interface GameRunPayload {
  gameId: string;
  outcome: 'win' | 'loss' | 'draw';
  primaryValue: number;
  agentPrimaryValue?: number;
  secondaryValue?: number;
  durationMs: number;
  difficulty?: GameDifficulty;
  opponentKind?: OpponentKind;
  opponentUserId?: number;
  matchId?: string;
  metadata?: Record<string, string | number | boolean>;
  runId: string;
}

export interface HumanHeadToHeadStats {
  gameId: string;
  opponentUserId: number;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}

// ---------------------------------------------------------------------------
// Socket events + app platform config
// ---------------------------------------------------------------------------

/**
 * Canonical per-app socket event names. Apps should use `{slug}:*` names to
 * avoid collisions once multiple games share a registrar.
 */
export interface GameSocketEvents {
  gamesList: string;
  runSubmit: string;
  h2hGet: string;
  matchGet: string;
  matchCreateAi: string;
  /** When set, app supports solo / practice matches (`opponent_kind: solo`). */
  matchCreateSolo?: string;
  matchMove: string;
  matchAgentTurn: string;
  matchAgentDelta: string;
  matchAgentDone: string;
  matchState: string;
  matchError: string;
  inviteCreate: string;
  inviteAccept: string;
  inviteCancel: string;
  inviteDecline: string;
}

/** Per-app platform wiring descriptor consumed by the kit's server bootstrap. */
export interface GamePlatformConfig {
  /** Registry id, e.g. `app-tic-tac-toe`. */
  appId: string;
  /** Folder slug, e.g. `tic-tac-toe`. */
  appSlug: string;
  catalog: GameCatalogEntry[];
  /** Table prefix → `{prefix}_matches`, `{prefix}_invites`, `{prefix}_runs`, `{prefix}_personal_bests`. */
  matchTablePrefix: string;
  socketEvents: GameSocketEvents;
  defaultTurnTimerMs: number;
  /** LLM completion `purpose` prefix, e.g. `tic-tac-toe.agent-turn`. */
  purposePrefix: string;
  /**
   * When true, the match service flips a coin to decide which seat moves first
   * (each new match). Defaults to false (seat 1 first).
   */
  randomizeStartingSeat?: boolean;
}
