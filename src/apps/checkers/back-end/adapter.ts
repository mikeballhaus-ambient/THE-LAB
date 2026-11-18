import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import { withCatalogMatchWager } from '@/shared/game-platform/catalog-match-wager';
import { DEFAULT_AGENT_LLM_SAMPLING, agentTemperature } from '@/shared/game-platform/difficulty-policy';
import type { GameServerAdapter } from '@/shared/game-platform/types';
import { CHECKERS_SUBMIT_MOVE_TOOL_ID } from '../shared/checkers-agent-move-schema';
import {
  attemptNote,
  buildSystemPrompt,
  buildUserPrompt,
  gradeAgentMove,
  retryUserHint,
  toolResultHint,
} from './agent';
import { CHECKERS_GAME_IDS } from './catalog';
import {
  applyMove,
  applyTurnTimeout,
  captureDestinations,
  createInitialState,
  legalMovesFor,
  parseMove,
  simpleDestinations,
  validateMove,
  type CheckersMove,
  type CheckersPiece,
  type CheckersState,
} from './rules';

const PURPOSE = 'checkers.checkers.agent-turn';

const SYSTEM_PROMPT = `You are a Checkers (draughts) opponent on an 8x8 board.

Reply with ONLY "pieceId:toRow,toCol" using the ids shown in the prompt.
Example: "7:2,3". Do not explain.`;

/** Prose fallback parser for providers that ignore the structural tool. */
function parseAgentReply(
  content: string,
  state: CheckersState,
  seat: number,
): CheckersMove | null {
  const mine = state.pieces.filter((p) => p.color === seat);
  const legal = new Map<string, CheckersMove>();
  for (const p of mine) {
    for (const d of legalMovesFor(state, p)) {
      legal.set(`${p.id}:${d.row},${d.col}`, {
        type: 'move',
        pieceId: p.id,
        toRow: d.row,
        toCol: d.col,
      });
    }
  }
  for (const match of content.matchAll(/(\d+)\s*:\s*(\d+)\s*,\s*(\d+)/g)) {
    const key = `${Number(match[1])}:${Number(match[2])},${Number(match[3])}`;
    const hit = legal.get(key);
    if (hit) return hit;
  }
  return null;
}

const checkersAdapterCore: GameServerAdapter = {
  ...createTurnBasedAdapter<
  CheckersState,
  CheckersMove
>({
  gameId: CHECKERS_GAME_IDS.CHECKERS,
  rules: {
    createInitialState: () => createInitialState(),
    parseMove: (move) => parseMove(move),
    validate: (state, move, seat) => {
      const r = validateMove(state, move, seat);
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    },
    apply: (state, move, playerSeat) => applyMove(state, move, playerSeat),
    scores: (state) => ({
      1: state.pieces.filter((p) => p.color === 1).length,
      2: state.pieces.filter((p) => p.color === 2).length,
    }),
    isFinished: (state) => state.finished,
    winnerSeat: (state) => state.winnerSeat,
    onTimeout: (state, playerSeat) => applyTurnTimeout(state, playerSeat as 1 | 2),
    summarizeMove: (move) =>
      `Moved piece ${move.pieceId} to (${move.toRow}, ${move.toCol})`,
  },
  agent: {
    purpose: PURPOSE,
    systemPrompt: SYSTEM_PROMPT,
    systemPromptFor: (difficulty) => buildSystemPrompt(difficulty),
    buildUserPrompt: (state, seat, difficulty, retry) =>
      buildUserPrompt(state, seat, difficulty, { lastRejection: retry?.lastRejection }),
    // Prose fallback for providers that ignore tool declarations.
    parseAgentReply: (content, state, seat) => parseAgentReply(content, state, seat),
    temperatureFor: agentTemperature,

    structuralTool: {
      id: CHECKERS_SUBMIT_MOVE_TOOL_ID,
      sampling: DEFAULT_AGENT_LLM_SAMPLING,
      grade: (raw, state, seat) => gradeAgentMove(raw, state, seat),
      toolResultHint,
      retryUserHint,
      attemptNote,
      limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
    },
  },
}),
  nextSeatAfterMove(_state, _move, _moverSeat, appliedState) {
    const s = appliedState as CheckersState;
    if (s.finished) {
      return null;
    }
    return s.currentSeat;
  },
};

export const checkersAdapter: GameServerAdapter = withCatalogMatchWager(checkersAdapterCore, {
  gameLabel: 'Checkers',
});

export type { CheckersPiece };
export { captureDestinations, simpleDestinations };
