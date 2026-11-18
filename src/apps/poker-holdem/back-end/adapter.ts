import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import {
  catalogHeadToHeadWagerSettlementLines,
  catalogMatchWagerAdapterFields,
} from '@/shared/game-platform/catalog-match-wager';
import { DEFAULT_AGENT_LLM_SAMPLING, agentTemperature } from '@/shared/game-platform/difficulty-policy';
import type { GameServerAdapter } from '@/shared/game-platform/types';
import { POKER_SUBMIT_MOVE_TOOL_ID } from '../shared/poker-agent-move-schema';
import {
  attemptNote,
  buildSystemPrompt,
  buildUserPrompt,
  gradeAgentMove,
  retryUserHint,
  toolResultHint,
} from './agent';
import { POKER_GAME_IDS } from './catalog';
import {
  applyMove,
  bestHandScore,
  createInitialState,
  parseMove,
  quarkSettlementDeltas,
  revealBoard,
  validateMove,
  type PokerMove,
  type PokerState,
} from './rules';

const PURPOSE = 'poker-holdem.poker-holdem.agent-turn';

const SYSTEM_PROMPT = `You are a heads-up Texas Hold'em opponent (Quarks play money).

Reply with ONLY one word: "check", "fold", or "call". For bet/raise use the tool with an amount.`;

/** Prose fallback parser for providers that ignore the structural tool. */
function parseAgentReply(content: string): PokerMove | null {
  const lower = content.toLowerCase();
  if (lower.includes('fold')) return { type: 'fold' };
  if (lower.includes('call')) return { type: 'call' };
  if (lower.includes('check')) return { type: 'check' };
  return null;
}

const pokerAdapterCore = createTurnBasedAdapter<PokerState, PokerMove>({
  gameId: POKER_GAME_IDS.POKER_HOLDEM,
  rules: {
    createInitialState: () => createInitialState(),
    parseMove: (move) => parseMove(move),
    validate: (state, move, playerSeat) => {
      const r = validateMove(state, move, playerSeat);
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    },
    apply: (state, move, playerSeat) => applyMove(state, move, playerSeat),
    scores: (state) => ({
      1: state.holes[1].length ? bestHandScore([...state.holes[1], ...state.board]) : 0,
      2: state.holes[2].length ? bestHandScore([...state.holes[2], ...state.board]) : 0,
    }),
    isFinished: (state) => state.completed,
    winnerSeat: (state) => state.winnerSeat,
    onTimeout: (state) => revealBoard(state),
    summarizeMove: (move) => {
      if (move.type === 'fold') {
        return 'Folded';
      }
      if (move.type === 'check') {
        return 'Checked';
      }
      if (move.type === 'call') {
        return 'Called';
      }
      if (move.type === 'bet') {
        return `Bet ${move.amount} Quarks`;
      }
      if (move.type === 'raise') {
        return `Raised to ${move.amount} Quarks`;
      }
      return 'Move';
    },
  },
  agent: {
    purpose: PURPOSE,
    systemPrompt: SYSTEM_PROMPT,
    systemPromptFor: (difficulty) => buildSystemPrompt(difficulty),
    buildUserPrompt: (state, seat, difficulty, retry) =>
      buildUserPrompt(state, seat, difficulty, { lastRejection: retry?.lastRejection }),
    parseAgentReply: (content) => parseAgentReply(content),
    temperatureFor: agentTemperature,

    structuralTool: {
      id: POKER_SUBMIT_MOVE_TOOL_ID,
      sampling: DEFAULT_AGENT_LLM_SAMPLING,
      grade: (raw, state) => gradeAgentMove(raw, state, 0),
      toolResultHint,
      retryUserHint,
      attemptNote,
      limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
    },
  },
});

const POKER_GAME_LABEL = "Texas Hold'em";

export const pokerAdapter: GameServerAdapter = {
  ...pokerAdapterCore,
  ...catalogMatchWagerAdapterFields(POKER_GAME_LABEL, pokerAdapterCore),
  virtualBankSettlements(state, ctx) {
    const s = state as PokerState;
    const potLines =
      s.completed && quarkSettlementDeltas(s).length > 0
        ? quarkSettlementDeltas(s)
            .filter((line) => line.delta !== 0)
            .map((line) => ({
              labUserId: line.seat === 1 ? ctx.player1Id : ctx.player2Id,
              delta: line.delta,
              reasonCode: line.delta > 0 ? ('game_pot_win' as const) : ('game_pot_loss' as const),
              reasonLabel: line.delta > 0 ? "Hold'em pot won" : "Hold'em pot lost",
              sourceRef: ctx.matchId,
            }))
        : [];
    const frameLines = catalogHeadToHeadWagerSettlementLines(
      state,
      ctx,
      POKER_GAME_LABEL,
      () => pokerAdapterCore.isFinished(state),
      () => pokerAdapterCore.winnerSeat(state),
    );
    return [...potLines, ...frameLines];
  },
  redactStateForSeat(state) {
    const s = state as PokerState;
    return {
      ...s,
      turnHistory: Array.isArray(s.turnHistory) ? s.turnHistory : [],
    };
  },
};
