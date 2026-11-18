import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import {
  catalogHeadToHeadWagerSettlementLines,
  catalogMatchWagerAdapterFields,
} from '@/shared/game-platform/catalog-match-wager';
import { DEFAULT_AGENT_LLM_SAMPLING, agentTemperature } from '@/shared/game-platform/difficulty-policy';
import type { GameServerAdapter } from '@/shared/game-platform/types';
import { BLACKJACK_SUBMIT_MOVE_TOOL_ID } from '../shared/blackjack-agent-move-schema';
import {
  attemptNote,
  buildSystemPrompt,
  buildUserPrompt,
  gradeAgentMove,
  retryUserHint,
  toolResultHint,
} from './agent';
import { BLACKJACK_GAME_IDS } from './catalog';
import {
  applyMove,
  createInitialState,
  nextSeatAfterMove,
  onTimeout,
  parseMove,
  quarkSettlementDeltas,
  summarizeMove,
  validateMove,
  type BlackjackMove,
  type BlackjackState,
} from './rules';

const PURPOSE = 'blackjack.blackjack.agent-turn';

const SYSTEM_PROMPT = `You are the Lab Assistant Blackjack tablemate on seat 2 vs the house dealer.

Use the structural tool each turn — do not reply with prose only.`;

function parseAgentReply(content: string, state: BlackjackState, playerSeat: number): BlackjackMove | null {
  void content;
  void state;
  void playerSeat;
  return null;
}

const baseAdapter = createTurnBasedAdapter<BlackjackState, BlackjackMove>({
  gameId: BLACKJACK_GAME_IDS.BLACKJACK,
  rules: {
    createInitialState: (config) => createInitialState(config),
    parseMove: (move) => parseMove(move),
    validate: (state, move, playerSeat) => {
      const r = validateMove(state, move, playerSeat);
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    },
    apply: (state, move, playerSeat) => applyMove(state, move, playerSeat),
    scores: (state) => ({ 1: state.seatDelta[1], 2: state.seatDelta[2] }),
    isFinished: (state) => state.completed,
    winnerSeat: (state) => state.winnerSeat,
    onTimeout: (state, playerSeat) => onTimeout(state, playerSeat),
    summarizeMove: (move) => summarizeMove(move),
  },
  agent: {
    purpose: PURPOSE,
    systemPrompt: SYSTEM_PROMPT,
    systemPromptFor: (difficulty) => buildSystemPrompt(difficulty),
    buildUserPrompt: (state, seat, difficulty, retry) =>
      buildUserPrompt(state, seat, difficulty, { lastRejection: retry?.lastRejection }),
    parseAgentReply: (content, state, seat) => parseAgentReply(content, state, seat),
    temperatureFor: agentTemperature,
    structuralTool: {
      id: BLACKJACK_SUBMIT_MOVE_TOOL_ID,
      sampling: DEFAULT_AGENT_LLM_SAMPLING,
      grade: (raw, state, seat) => gradeAgentMove(raw, state, seat),
      toolResultHint,
      retryUserHint,
      attemptNote,
      limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
    },
  },
});

export const blackjackAdapter: GameServerAdapter = {
  ...baseAdapter,
  ...catalogMatchWagerAdapterFields('Blackjack', baseAdapter),
  nextSeatAfterMove(state) {
    return nextSeatAfterMove(state as BlackjackState);
  },
  virtualBankSettlements(state, ctx) {
    const s = state as BlackjackState;
    const handLines = quarkSettlementDeltas(s).map((line) => ({
      labUserId: line.seat === 1 ? ctx.player1Id : ctx.player2Id,
      delta: line.delta,
      reasonCode: line.delta > 0 ? ('game_pot_win' as const) : ('game_pot_loss' as const),
      reasonLabel:
        s.tablemateLossRelief && line.seat === 1 && line.delta < 0
          ? 'Blackjack loss (tablemate relief)'
          : line.delta > 0
            ? 'Blackjack win'
            : 'Blackjack loss',
      sourceRef: ctx.matchId,
    }));
    const frameLines = catalogHeadToHeadWagerSettlementLines(
      state,
      ctx,
      'Blackjack',
      () => baseAdapter.isFinished(state),
      () => baseAdapter.winnerSeat(state),
    );
    return [...handLines, ...frameLines];
  },
};
