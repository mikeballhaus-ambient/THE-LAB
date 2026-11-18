import type { GameServerAdapter, ValidateMoveResult } from '@/shared/game-platform/types';
import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import { withCatalogMatchWager } from '@/shared/game-platform/catalog-match-wager';
import {
  DEFAULT_AGENT_LLM_SAMPLING,
  agentTemperature,
} from '@/shared/game-platform/difficulty-policy';
import { twAgentStreamDebug } from '@/shared/utils/agent-stream-debug.node';
import { WORD_TILE_GAME_IDS } from '../shared/types';
import {
  BOARD_SIZE,
  agentAbortReason,
  agentToolResultHint,
  buildUserPrompt,
  buildAgentRetryUserHint,
  buildAgentSystemPromptForTier,
  countsAsPlacementStumpReject,
  createShuffledBag,
  extractWordsFromPlacements,
  formatAttemptNote,
  gradeAgentMove,
  parseMove,
  preflightAgentMove,
  refillRack,
  summarizeMove,
  totalTurnScore,
  applyExchange,
  applyPlace,
  validateExchange,
  validatePlace,
  WORD_TILE_AGENT_PURPOSE,
  WORD_TILE_STRUCTURAL_TOOL_ID,
  type BoardCell,
  type TileMove,
  type TileWordGridState,
} from './rules';

/**
 * Word Tile's `GameServerAdapter`.
 *
 * Everything here is a binding: the kit's `createTurnBasedAdapter` owns the
 * plumbing and the agent loop, `rules.ts` owns the rules and the prompt text.
 * This file only says *which* rules function maps to *which* adapter hook — the
 * same shape every other catalogue game has.
 */

function emptyBoard(): BoardCell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
}

const MAX_TURN_HISTORY = 100;

function appendTurnHistory(
  state: TileWordGridState,
  playerSeat: number,
  move: TileMove,
  wordsFormed?: string[],
): TileWordGridState {
  const summary = summarizeMove(move, wordsFormed);
  const prev = state.turnHistory ?? [];
  const turnHistory = [...prev, { seat: playerSeat, summary }].slice(-MAX_TURN_HISTORY);
  return { ...state, turnHistory };
}

function initialRacks(bag: string[]): { bag: string[]; racks: Record<number, string[]> } {
  let nextBag = bag;
  const r1 = refillRack(nextBag, []);
  nextBag = r1.bag;
  const r2 = refillRack(nextBag, []);
  return { bag: r2.bag, racks: { 1: r1.rack, 2: r2.rack } };
}

const tileWordGridAdapterCore = createTurnBasedAdapter<TileWordGridState, TileMove>({
  gameId: WORD_TILE_GAME_IDS.TILE_WORD_GRID,
  rules: {
    createInitialState: () => {
      const bag = createShuffledBag();
      const { bag: remaining, racks } = initialRacks(bag);
      return {
        board: emptyBoard(),
        racks,
        scores: { 1: 0, 2: 0 },
        bag: remaining,
        passesInRow: 0,
        firstMove: true,
        resignedSeat: null,
        premiums: null,
        turnHistory: [],
      } satisfies TileWordGridState;
    },

    parseMove: (move) => parseMove(move),

    validate: (state, move, seat): ValidateMoveResult => {
      if (move.type === 'pass') {
        if (state.firstMove) {
          return { ok: false, error: 'Cannot pass on the first turn' };
        }
        return { ok: true };
      }
      if (move.type === 'resign') {
        return { ok: true };
      }
      if (move.type === 'exchange') {
        return validateExchange(state, move.letters, seat);
      }
      const check = validatePlace(state, move.placements, seat);
      return check.ok ? { ok: true } : { ok: false, error: check.error };
    },

    apply: (state, move, seat) => {
      if (move.type === 'place') {
        const score = totalTurnScore(state.board, move.placements);
        const words = extractWordsFromPlacements(state.board, move.placements).map((w) => w.word);
        const next = applyPlace(state, move.placements, seat, score);
        return appendTurnHistory(next, seat, move, words);
      }
      if (move.type === 'exchange') {
        return appendTurnHistory(applyExchange(state, move.letters, seat), seat, move);
      }
      if (move.type === 'resign') {
        return appendTurnHistory({ ...state, resignedSeat: seat }, seat, move);
      }
      return appendTurnHistory(
        { ...state, passesInRow: state.passesInRow + 1 },
        seat,
        move,
      );
    },

    scores: (state) => state.scores,

    isFinished: (state) => {
      if (state.resignedSeat != null) {
        return true;
      }
      const racksEmpty = [1, 2].every((s) => (state.racks[s]?.length ?? 0) === 0);
      return racksEmpty && state.bag.length === 0;
    },

    winnerSeat: (state) => {
      if (state.resignedSeat != null) {
        return state.resignedSeat === 1 ? 2 : 1;
      }
      const a = state.scores[1] ?? 0;
      const b = state.scores[2] ?? 0;
      return a === b ? null : a > b ? 1 : 2;
    },

    onTimeout: (state, seat) => {
      if (state.firstMove) {
        return { ...state, resignedSeat: seat };
      }
      return applyPlace(state, [], seat, 0);
    },

    summarizeMove: (move) => summarizeMove(move),
  },

  agent: {
    purpose: WORD_TILE_AGENT_PURPOSE,
    systemPromptFor: (difficulty) => buildAgentSystemPromptForTier(difficulty),
    systemPrompt: 'Word Tile AI opponent.',
    buildUserPrompt: (state, seat, difficulty, retry) =>
      buildUserPrompt(state, seat, difficulty, retry),
    parseAgentReply: () => null,
    temperatureFor: (difficulty) => agentTemperature(difficulty),

    // Structured tool: the model must call `tile_word_grid_submit_move`; the kit
    // owns the retry loop, this block supplies the rules-grade grading and the
    // Word Tile-specific stuck-detection.
    structuralTool: {
      id: WORD_TILE_STRUCTURAL_TOOL_ID,
      sampling: DEFAULT_AGENT_LLM_SAMPLING,
      // Returns the normalised move — the raw tool payload is not a TileMove.
      grade: (raw, state, seat) => gradeAgentMove(raw, state, seat),
      preflight: preflightAgentMove,
      toolResultHint: agentToolResultHint,
      retryUserHint: (context) => buildAgentRetryUserHint(context),
      countsAsStump: (toolArguments, retryKind) =>
        countsAsPlacementStumpReject(toolArguments, retryKind),
      abortAfter: agentAbortReason,
      attemptNote: (toolArguments, error) => formatAttemptNote(toolArguments, error),
      limits: { maxApiRounds: 16, maxStructuralRounds: 4, feedbackWindow: 6 },
      debug: (event, detail) => {
        twAgentStreamDebug(`word-tile agent ${event}`, detail);
      },
    },
  },
});

export const tileWordGridAdapter: GameServerAdapter = withCatalogMatchWager(tileWordGridAdapterCore, {
  gameLabel: 'Word Tile',
});
