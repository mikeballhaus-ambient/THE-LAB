import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import { withCatalogMatchWager } from '@/shared/game-platform/catalog-match-wager';
import { DEFAULT_AGENT_LLM_SAMPLING, agentTemperature } from '@/shared/game-platform/difficulty-policy';
import type { GameServerAdapter } from '@/shared/game-platform/types';
import { CONNECT_FOUR_SUBMIT_MOVE_TOOL_ID } from '../shared/connect-four-agent-move-schema';
import {
  attemptNote,
  buildSystemPrompt,
  buildUserPrompt,
  gradeAgentMove,
  retryUserHint,
  toolResultHint,
} from './agent';
import { CONNECT_FOUR_GAME_IDS } from './catalog';
import {
  COLS,
  ROWS,
  applyMove,
  applyTurnTimeout,
  availableColumns,
  createInitialState,
  parseMove,
  validateMove,
  winnerOf,
  type ConnectFourMove,
  type ConnectFourState,
} from './rules';

const PURPOSE = 'connect-four.connect-four.agent-turn';

const SYSTEM_PROMPT = `You are a Connect Four opponent on a 7-column board.

Reply with ONLY the column index (0-6) you want to drop into. Do not explain.`;

/** Prose fallback parser for providers that ignore the structural tool. */
function parseAgentReply(content: string, state: ConnectFourState): ConnectFourMove | null {
  const open = new Set(availableColumns(state.board));
  for (const match of content.matchAll(/\d/g)) {
    const col = Number.parseInt(match[0], 10);
    if (open.has(col)) return { type: 'drop', col };
  }
  return null;
}

const connectFourAdapterCore = createTurnBasedAdapter<ConnectFourState, ConnectFourMove>({
  gameId: CONNECT_FOUR_GAME_IDS.CONNECT_FOUR,
  rules: {
    createInitialState: () => createInitialState(),
    parseMove: (move) => parseMove(move),
    validate: (state, move, seat) => {
      const r = validateMove(state, move, seat);
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    },
    apply: (state, move) => applyMove(state, move),
    scores: (state) => ({
      1: state.board.flat().filter((c) => c === 1).length,
      2: state.board.flat().filter((c) => c === 2).length,
    }),
    isFinished: (state) => state.finished,
    winnerSeat: (state) => state.winnerSeat,
    onTimeout: (state, playerSeat) => applyTurnTimeout(state, playerSeat as 1 | 2),
    summarizeMove: (move) => `Dropped in column ${move.col}`,
  },
  agent: {
    purpose: PURPOSE,
    systemPrompt: SYSTEM_PROMPT,
    systemPromptFor: (difficulty) => buildSystemPrompt(difficulty),
    buildUserPrompt: (state, seat, difficulty, retry) =>
      buildUserPrompt(state, seat, difficulty, { lastRejection: retry?.lastRejection }),
    parseAgentReply: (content, state) => parseAgentReply(content, state),
    temperatureFor: agentTemperature,

    structuralTool: {
      id: CONNECT_FOUR_SUBMIT_MOVE_TOOL_ID,
      sampling: DEFAULT_AGENT_LLM_SAMPLING,
      grade: (raw, state, seat) => gradeAgentMove(raw, state, seat),
      toolResultHint,
      retryUserHint,
      attemptNote,
      limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
    },
  },
});

export const connectFourAdapter: GameServerAdapter = withCatalogMatchWager(connectFourAdapterCore, {
  gameLabel: 'Connect Four',
});

export { ROWS, COLS, winnerOf };
