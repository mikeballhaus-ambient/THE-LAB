import type { GameDifficulty } from './types';

export const MINIMAX_MATE_SCORE = 1_000_000;

export interface MinimaxSearchOptions {
  /** At root, also keep moves within this many centipawns of the best score. */
  softNoise?: number;
  /** Max explored nodes (safety valve for high branching games). */
  maxNodes?: number;
  /** Filled with total nodes visited when a search completes (debug / telemetry). */
  telemetry?: { nodesVisited: number };
}

export interface MinimaxGame<TState, TMove> {
  /** Seat whose turn it is in this state. */
  seatToMove(state: TState): 1 | 2;
  enumerateMoves(state: TState, seat: 1 | 2): TMove[];
  apply(state: TState, move: TMove, seat: 1 | 2): TState;
  /** Terminal score from `seatToMove`'s perspective, or null if not terminal. */
  terminalScore(state: TState, seatToMove: 1 | 2): number | null;
  /** Static evaluation from `seatToMove`'s perspective when not terminal. */
  evaluate(state: TState, seatToMove: 1 | 2): number;
}

export type GameSearchProfile = 'chess' | 'checkers' | 'connect-four' | 'tic-tac-toe';

const DEPTH_BY_PROFILE: Record<GameSearchProfile, Record<GameDifficulty, number>> = {
  chess: { easy: 2, medium: 3, hard: 4, boss: 5 },
  checkers: { easy: 3, medium: 5, hard: 7, boss: 9 },
  'connect-four': { easy: 4, medium: 6, hard: 8, boss: 10 },
  'tic-tac-toe': { easy: 2, medium: 9, hard: 9, boss: 9 },
};

const NOISE_BY_PROFILE: Record<GameSearchProfile, Partial<Record<GameDifficulty, number>>> = {
  chess: { easy: 180, medium: 80 },
  checkers: { easy: 120, medium: 60 },
  'connect-four': { easy: 90, medium: 40 },
  'tic-tac-toe': { easy: 500, medium: 150 },
};

export function searchDepthFor(profile: GameSearchProfile, difficulty: GameDifficulty): number {
  return DEPTH_BY_PROFILE[profile][difficulty];
}

export function searchSoftNoiseFor(
  profile: GameSearchProfile,
  difficulty: GameDifficulty,
): number {
  return NOISE_BY_PROFILE[profile][difficulty] ?? 0;
}

/** How many ranked lines to show the LLM per tier. */
export function searchAdvisoryMoveLimit(difficulty: GameDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 3;
    case 'medium':
      return 4;
    case 'hard':
      return 5;
    case 'boss':
      return 6;
    default:
      return 4;
  }
}

export interface RankedMinimaxMove<TMove> {
  move: TMove;
  score: number;
}

function runNegamaxSearch<TState, TMove>(
  game: MinimaxGame<TState, TMove>,
  options?: MinimaxSearchOptions,
  nodes = { count: 0 },
): (
  s: TState,
  remainingDepth: number,
  alpha: number,
  beta: number,
  seatToMove: 1 | 2,
) => number {
  const maxNodes = options?.maxNodes ?? 100_000;

  const search = (
    s: TState,
    remainingDepth: number,
    alpha: number,
    beta: number,
    seatToMove: 1 | 2,
  ): number => {
    nodes.count += 1;
    if (nodes.count > maxNodes) {
      return game.evaluate(s, seatToMove);
    }

    const terminal = game.terminalScore(s, seatToMove);
    if (terminal !== null) {
      return terminal;
    }
    if (remainingDepth <= 0) {
      return game.evaluate(s, seatToMove);
    }

    const legal = game.enumerateMoves(s, seatToMove);
    if (legal.length === 0) {
      return game.evaluate(s, seatToMove);
    }

    let best = -Infinity;
    for (const move of legal) {
      const next = game.apply(s, move, seatToMove);
      const nextSeat = game.seatToMove(next);
      const score = -search(next, remainingDepth - 1, -beta, -alpha, nextSeat);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) {
        break;
      }
    }
    return best;
  };

  return search;
}

/** Score every legal root move (for LLM advisory prompts). */
export function rankMinimaxRootMoves<TState, TMove>(
  game: MinimaxGame<TState, TMove>,
  state: TState,
  rootSeat: 1 | 2,
  depth: number,
  options?: MinimaxSearchOptions & { limit?: number },
): RankedMinimaxMove<TMove>[] {
  const seat = game.seatToMove(state);
  if (seat !== rootSeat) {
    return [];
  }
  const moves = game.enumerateMoves(state, rootSeat);
  if (moves.length === 0 || depth <= 0) {
    return moves.map((move) => ({ move, score: 0 }));
  }

  const nodes = { count: 0 };
  const search = runNegamaxSearch(game, options, nodes);

  const ranked: RankedMinimaxMove<TMove>[] = moves.map((move) => {
    const next = game.apply(state, move, rootSeat);
    const nextSeat = game.seatToMove(next);
    const score = -search(next, depth - 1, -Infinity, Infinity, nextSeat);
    return { move, score };
  });

  ranked.sort((a, b) => b.score - a.score);
  const limit = options?.limit ?? ranked.length;
  const out = ranked.slice(0, Math.max(1, Math.min(limit, ranked.length)));
  if (options?.telemetry) {
    options.telemetry.nodesVisited = nodes.count;
  }
  return out;
}

/**
 * Negamax with alpha-beta. Returns the best move for `rootSeat` at `state`.
 * Prefer {@link rankMinimaxRootMoves} + LLM for catalog agents; this remains for tests/tools.
 */
export function chooseMinimaxMove<TState, TMove>(
  game: MinimaxGame<TState, TMove>,
  state: TState,
  rootSeat: 1 | 2,
  depth: number,
  options?: MinimaxSearchOptions,
): TMove | null {
  const seat = game.seatToMove(state);
  if (seat !== rootSeat) {
    return null;
  }
  const ranked = rankMinimaxRootMoves(game, state, rootSeat, depth, {
    ...options,
    limit: undefined,
  });
  if (ranked.length === 0) {
    return null;
  }

  const softNoise = options?.softNoise ?? 0;
  const bestScore = ranked[0]?.score ?? 0;
  const tied = ranked.filter((row) => Math.abs(row.score - bestScore) <= softNoise);
  const pick = tied[Math.floor(Math.random() * tied.length)] ?? ranked[0];
  return pick?.move ?? null;
}
