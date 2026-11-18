import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import { withCatalogMatchWager } from '@/shared/game-platform/catalog-match-wager';
import { DEFAULT_AGENT_LLM_SAMPLING, agentTemperature } from '@/shared/game-platform/difficulty-policy';
import type { GameServerAdapter } from '@/shared/game-platform/types';
import { TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID } from '../shared/tic-tac-toe-agent-move-schema';
import {
  attemptNote,
  buildUserPrompt,
  gradeAgentMove,
  retryUserHint,
  toolResultHint,
} from './agent';
import { TIC_TAC_TOE_GAME_IDS } from './catalog';
import {
  applyMove,
  availableMoves,
  createInitialState,
  parseMove,
  validateMove,
  winnerOf,
  type TicTacToeMove,
  type TicTacToeState,
} from './rules';

const PURPOSE = 'tic-tac-toe.tic-tac-toe.agent-turn';

const SYSTEM_PROMPT = `You are a Tic-Tac-Toe opponent on a 3x3 board.

Board indices:
  0 | 1 | 2
  3 | 4 | 5
  6 | 7 | 8

Reply with ONLY the index of the cell you want to claim, as a single integer.
Choose an empty cell. Do not explain.`;

/**
 * Prose fallback parser, used only when a provider ignores the structural tool
 * and answers in assistant text. The structured path grades via `./agent`.
 */
function parseReply(content: string, state: TicTacToeState): TicTacToeMove | null {
  const legal = new Set(availableMoves(state.board));
  for (const match of content.matchAll(/\d+/g)) {
    const n = Number.parseInt(match[0], 10);
    if (legal.has(n)) return { type: 'place', index: n };
  }
  return null;
}

const ticTacToeAdapterCore = createTurnBasedAdapter<TicTacToeState, TicTacToeMove>({
  gameId: TIC_TAC_TOE_GAME_IDS.TIC_TAC_TOE,
  rules: {
    createInitialState: (config) => createInitialState(config),
    parseMove: (move) => parseMove(move),
    validate: (state, move, seat) => {
      const r = validateMove(state, move, seat);
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    },
    apply: (state, move) => applyMove(state, move),
    scores: (state) => ({
      1: state.board.filter((c) => c === 1).length,
      2: state.board.filter((c) => c === 2).length,
    }),
    isFinished: (state) => state.finished,
    winnerSeat: (state) => state.winnerSeat,
    onTimeout: (state) => {
      const moves = availableMoves(state.board);
      return moves.length === 0 ? state : applyMove(state, { type: 'place', index: moves[0] as number });
    },
    summarizeMove: (move) => `Placed on cell ${move.index}`,
  },
  agent: {
    purpose: PURPOSE,
    systemPrompt: SYSTEM_PROMPT,
    // Prose fallback retained so a provider that ignores tools still plays, but
    // the structured path below is what produces the rich prompt.
    buildUserPrompt: (state, seat, difficulty, retry) =>
      buildUserPrompt(state, seat, difficulty, {
        lastRejection: retry?.lastRejection,
      }),
    parseAgentReply: (content, state) => parseReply(content, state),
    temperatureFor: agentTemperature,

    // Structured moves: the model calls a tool, so a rejection can be replayed
    // with the exact reason instead of a blind "try again".
    structuralTool: {
      id: TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID,
      sampling: DEFAULT_AGENT_LLM_SAMPLING,
      // Returns the normalised move: `{index: 4}` -> `{type:'place', index:4}`.
      grade: (raw, state) => ({
        type: 'place' as const,
        index: gradeAgentMove(raw, state).index,
      }),
      toolResultHint,
      retryUserHint,
      attemptNote,
      limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
    },
  },
});

export const ticTacToeAdapter: GameServerAdapter = withCatalogMatchWager(ticTacToeAdapterCore, {
  gameLabel: 'Tic-Tac-Toe',
});

export { winnerOf };
