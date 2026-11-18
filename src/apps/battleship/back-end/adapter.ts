import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import { withCatalogMatchWager } from '@/shared/game-platform/catalog-match-wager';
import { DEFAULT_AGENT_LLM_SAMPLING, agentTemperature } from '@/shared/game-platform/difficulty-policy';
import type { GameServerAdapter } from '@/shared/game-platform/types';
import { BATTLESHIP_SUBMIT_MOVE_TOOL_ID } from '../shared/battleship-agent-move-schema';
import {
  attemptNote,
  buildSystemPrompt,
  buildUserPrompt,
  gradeAgentMove,
  retryUserHint,
  toolResultHint,
} from './agent';
import { BATTLESHIP_GAME_IDS } from './catalog';
import {
  BS_SIZE,
  coordKey,
  createFleet,
  fleetSunk,
  opponentSeat,
  shipsAfloat,
  type BsSeat,
  type BsState,
} from './rules';

const PURPOSE = 'battleship.battleship.agent-turn';

const SYSTEM_PROMPT = `You are playing Battleship on an 8x8 grid.

Reply with ONLY a coordinate as "row,col" using 0-based indices, e.g. "3,5".
Pick a cell you have not already fired at. Do not explain.`;

interface BsMove {
  type: 'fire';
  row: number;
  col: number;
}

function initialState(): BsState {
  return {
    fleets: { 1: createFleet(), 2: createFleet() },
    shotsAt: { 1: {}, 2: {} },
    turnHistory: [],
  };
}

function parseBsMove(move: unknown): BsMove | null {
  if (!move || typeof move !== 'object') return null;
  const m = move as { row?: unknown; col?: unknown };
  const row = Number(m.row);
  const col = Number(m.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  if (row < 0 || row >= BS_SIZE || col < 0 || col >= BS_SIZE) return null;
  return { type: 'fire', row, col };
}

/** Prose fallback parser for providers that ignore the structural tool. */
function parseAgentReply(content: string, state: BsState, seat: BsSeat): BsMove | null {
  const shots = state.shotsAt[seat] ?? {};
  for (const match of content.matchAll(/(\d)\s*,\s*(\d)/g)) {
    const row = Number(match[1]);
    const col = Number(match[2]);
    if (row >= BS_SIZE || col >= BS_SIZE) continue;
    if (coordKey(row, col) in shots) continue;
    return { type: 'fire', row, col };
  }
  return null;
}

function applyFire(state: BsState, move: BsMove, seat: BsSeat): BsState {
  const enemyFleet = state.fleets[opponentSeat(seat)] ?? [];
  const isHit = enemyFleet.some((ship) => ship.cells.some((c) => c.row === move.row && c.col === move.col));
  const shots = { ...(state.shotsAt[seat] ?? {}), [coordKey(move.row, move.col)]: isHit ? 'hit' : 'miss' };
  return {
    ...state,
    shotsAt: { ...state.shotsAt, [seat]: shots },
    turnHistory: [...state.turnHistory, seat],
  };
}

const battleshipAdapterCore = createTurnBasedAdapter<BsState, BsMove>({
  gameId: BATTLESHIP_GAME_IDS.BATTLESHIP,
  rules: {
    createInitialState: () => initialState(),
    parseMove: (move) => parseBsMove(move),
    validate: (state, move, seat) => {
      const shots = state.shotsAt[seat as BsSeat] ?? {};
      if (coordKey(move.row, move.col) in shots) {
        return { ok: false, error: `Already fired at ${move.row},${move.col}` };
      }
      return { ok: true };
    },
    apply: (state, move, seat) => applyFire(state, move, seat as BsSeat),
    scores: (state) => ({
      1: shipsAfloat(state.fleets[2] ?? [], state.shotsAt[1] ?? {}),
      2: shipsAfloat(state.fleets[1] ?? [], state.shotsAt[2] ?? {}),
    }),
    isFinished: (state) =>
      fleetSunk(state.fleets[1] ?? [], state.shotsAt[2] ?? {}) ||
      fleetSunk(state.fleets[2] ?? [], state.shotsAt[1] ?? {}),
    winnerSeat: (state) => {
      if (fleetSunk(state.fleets[2] ?? [], state.shotsAt[1] ?? {})) return 1;
      if (fleetSunk(state.fleets[1] ?? [], state.shotsAt[2] ?? {})) return 2;
      return null;
    },
    onTimeout: (state) => state,
    summarizeMove: (move) => `Fired at ${move.row},${move.col}`,
  },
  agent: {
    purpose: PURPOSE,
    systemPrompt: SYSTEM_PROMPT,
    systemPromptFor: (difficulty) => buildSystemPrompt(difficulty),
    buildUserPrompt: (state, seat, difficulty, retry) =>
      buildUserPrompt(state, seat, difficulty, { lastRejection: retry?.lastRejection }),
    parseAgentReply: (content, state, seat) => parseAgentReply(content, state, seat as BsSeat),
    temperatureFor: agentTemperature,

    structuralTool: {
      id: BATTLESHIP_SUBMIT_MOVE_TOOL_ID,
      sampling: DEFAULT_AGENT_LLM_SAMPLING,
      grade: (raw, state, seat) => gradeAgentMove(raw, state, seat),
      toolResultHint,
      retryUserHint,
      attemptNote,
      limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
    },
  },
});

export const battleshipAdapter: GameServerAdapter = withCatalogMatchWager(battleshipAdapterCore, {
  gameLabel: 'Battleship',
});
