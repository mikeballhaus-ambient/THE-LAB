/**
 * Generic turn-based match service.
 *
 * Generalized from Word Tile's app-local `MatchService`: authoritative match
 * state, turn timers, timeouts, human PvP socket sync, AI agent turns, invites,
 * and run recording — all parametrized by {@link GamePlatformConfig} + an
 * adapter resolved from the shared registry.
 */
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { pushPlatformMatchState } from '@/shared/services/platform-comms-client.node';
import { applyVirtualBankForFinishedMatch } from '@/shared/game-platform/virtual-bank-match-settlement.node';
import type { PlatformLlmStreamDeltaPayload } from '@/shared/types/platform-llm-completion';
import {
  agentTurnMark,
  agentTurnPhaseDebug,
  twAgentStreamDebug,
} from '@/shared/utils/agent-stream-debug.node';
import { parseSqliteUtcDateTimeMs } from '@/shared/utils/sqlite-datetime';
import { getGameAdapter } from './adapter-registry';
import { resolveMatchClockSeat } from './resolve-match-clock-seat';
import { resolveMatchTableNames } from './match-schema';
import { resolveAgentMove } from './resolve-agent-move';
import type { GameRunsService } from './runs-service';
import { isMatchPracticeMode, parseMatchRulesJson } from './match-rules';
import type {
  GameDifficulty,
  GamePlatformConfig,
  GameRunPayload,
  MatchCreateConfig,
  MatchView,
} from './types';

type AgentTurnInFlight = {
  promise: Promise<void>;
  deltas: PlatformLlmStreamDeltaPayload[];
  listeners: Set<(payload: PlatformLlmStreamDeltaPayload) => void>;
};

export interface MatchRow {
  id: string;
  game_id: string;
  status: string;
  opponent_kind: string;
  difficulty: string | null;
  player1_id: number;
  player2_id: number;
  current_seat: number;
  state_json: string;
  rules_json: string | null;
  turn_started_at: string | null;
  winner_id: number | null;
  state_version: number;
}

function playerSeatForUser(row: MatchRow, labUserId: number): number | null {
  if (row.player1_id === labUserId) {
    return 1;
  }
  if (row.player2_id === labUserId) {
    return 2;
  }
  return null;
}

function seatToUserId(row: MatchRow, seat: number): number {
  return seat === 1 ? row.player1_id : row.player2_id;
}

export class TurnBasedMatchService {
  private readonly agentTurnInFlight = new Map<string, AgentTurnInFlight>();

  constructor(
    private readonly db: Database,
    private readonly config: GamePlatformConfig,
    private readonly runsService: GameRunsService,
  ) {}

  private get tables() {
    return resolveMatchTableNames(this.config.matchTablePrefix);
  }

  private resolveTurnTimerMs(rules?: { turnTimerMs?: number }): number {
    return rules?.turnTimerMs ?? this.config.defaultTurnTimerMs;
  }

  /** Seat that moves first. Flips a coin per match when the game opts in. */
  private resolveStartingSeat(): number {
    if (this.config.randomizeStartingSeat) {
      return Math.random() < 0.5 ? 1 : 2;
    }
    return 1;
  }

  private publishAgentDelta(
    inFlight: AgentTurnInFlight,
    payload: PlatformLlmStreamDeltaPayload,
  ): void {
    const hasText = Boolean(payload.text?.length);
    const hasChannels =
      Boolean(payload.reasoning?.length) || Boolean(payload.content?.length);
    const hasAttempt = Boolean(payload.agentAttemptNote?.length);
    if (!hasText && !hasChannels && !hasAttempt) {
      return;
    }
    inFlight.deltas.push(payload);
    for (const listener of inFlight.listeners) {
      listener(payload);
    }
  }

  async createAiMatch(
    labUserId: number,
    gameId: string,
    difficulty: GameDifficulty,
    options?: {
      rulesProfile?: 'free' | 'eight-ball' | 'nine-ball';
      wagerQuarks?: number;
      practice?: boolean;
    },
  ) {
    const adapter = getGameAdapter(gameId);
    if (!adapter) {
      throw new Error('Game does not support matches');
    }
    const wagerQuarks = adapter.resolveAiMatchWagerQuarks?.(difficulty, options?.wagerQuarks) ?? 0;
    const rulesPayload: MatchCreateConfig['rules'] = {
      ...(options?.rulesProfile != null ? { rulesProfile: options.rulesProfile } : {}),
      ...(wagerQuarks > 0 ? { wagerQuarks } : {}),
      ...(options?.practice ? { practice: true } : {}),
    };
    const initialConfig: MatchCreateConfig = {
      gameId,
      opponentKind: 'ai',
      difficulty,
      player1Id: labUserId,
      player2Id: 0,
      rules: Object.keys(rulesPayload).length > 0 ? rulesPayload : undefined,
    };
    const created = adapter.createInitialState(initialConfig);
    // A game may derive its own opening seat from the freshly-created state.
    const startingSeat =
      adapter.initialSeat?.(created) ?? this.resolveStartingSeat();
    const state = adapter.createInitialState({ ...initialConfig, startingSeat });
    const id = randomUUID();
    const rules = {
      turnTimerMs: this.config.defaultTurnTimerMs,
      ...(wagerQuarks > 0 ? { wagerQuarks } : {}),
      ...(options?.practice ? { practice: true } : {}),
    };
    this.db
      .prepare(
        `INSERT INTO ${this.tables.matches} (
          id, game_id, status, opponent_kind, difficulty, player1_id, player2_id,
          current_seat, state_json, rules_json, turn_started_at
        ) VALUES (?, ?, 'active', 'ai', ?, ?, 0, ?, ?, ?, datetime('now'))`,
      )
      .run(
        id,
        gameId,
        difficulty,
        labUserId,
        startingSeat,
        JSON.stringify(state),
        JSON.stringify(rules),
      );
    return await this.getMatchForUser(id, labUserId);
  }

  async createSoloMatch(
    labUserId: number,
    gameId: string,
    rules?: { turnTimerMs?: number; rulesProfile?: 'free' | 'eight-ball' | 'nine-ball' },
  ) {
    const adapter = getGameAdapter(gameId);
    if (!adapter) {
      throw new Error('Game does not support matches');
    }
    const initialConfig: MatchCreateConfig = {
      gameId,
      opponentKind: 'solo',
      player1Id: labUserId,
      player2Id: 0,
      rules: { ...rules, practice: true },
    };
    const created = adapter.createInitialState(initialConfig);
    const startingSeat = adapter.initialSeat?.(created) ?? 1;
    const state = adapter.createInitialState({ ...initialConfig, startingSeat });
    const id = randomUUID();
    const mergedRules = {
      turnTimerMs: rules?.turnTimerMs ?? this.config.defaultTurnTimerMs,
      practice: true,
      rulesProfile: rules?.rulesProfile ?? 'free',
    };
    this.db
      .prepare(
        `INSERT INTO ${this.tables.matches} (
          id, game_id, status, opponent_kind, difficulty, player1_id, player2_id,
          current_seat, state_json, rules_json, turn_started_at
        ) VALUES (?, ?, 'active', 'solo', NULL, ?, 0, ?, ?, ?, datetime('now'))`,
      )
      .run(
        id,
        gameId,
        labUserId,
        startingSeat,
        JSON.stringify(state),
        JSON.stringify(mergedRules),
      );
    return await this.getMatchForUser(id, labUserId);
  }

  createHumanMatch(
    player1Id: number,
    player2Id: number,
    gameId: string,
    rules?: {
      turnTimerMs?: number;
      practice?: boolean;
      rulesProfile?: 'free' | 'eight-ball' | 'nine-ball';
      wagerQuarks?: number;
    },
  ) {
    const adapter = getGameAdapter(gameId);
    if (!adapter) {
      throw new Error('Game does not support matches');
    }
    let wagerQuarks = 0;
    const requestedWager = rules?.wagerQuarks ?? 0;
    if (requestedWager > 0) {
      if (!adapter.resolveHumanMatchWagerQuarks) {
        throw new Error('Wagers not supported for this game');
      }
      wagerQuarks = adapter.resolveHumanMatchWagerQuarks(requestedWager);
    }
    const mergedRules = {
      turnTimerMs: this.resolveTurnTimerMs(rules),
      ...(rules?.practice ? { practice: true } : {}),
      ...(rules?.rulesProfile != null ? { rulesProfile: rules.rulesProfile } : {}),
      ...(wagerQuarks > 0 ? { wagerQuarks } : {}),
    };
    const initialConfig: MatchCreateConfig = {
      gameId,
      opponentKind: 'human',
      player1Id,
      player2Id,
      rules: mergedRules,
    };
    const created = adapter.createInitialState(initialConfig);
    const startingSeat =
      adapter.initialSeat?.(created) ?? this.resolveStartingSeat();
    const state = adapter.createInitialState({ ...initialConfig, startingSeat });
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO ${this.tables.matches} (
          id, game_id, status, opponent_kind, difficulty, player1_id, player2_id,
          current_seat, state_json, rules_json, turn_started_at
        ) VALUES (?, ?, 'active', 'human', NULL, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .run(
        id,
        gameId,
        player1Id,
        player2Id,
        startingSeat,
        JSON.stringify(state),
        JSON.stringify(mergedRules),
      );
    return id;
  }

  private buildMatchView(row: MatchRow, labUserId: number): MatchView | null {
    const seat = playerSeatForUser(row, labUserId);
    if (seat == null && row.opponent_kind === 'human') {
      return null;
    }
    const adapter = getGameAdapter(row.game_id);
    const state = JSON.parse(row.state_json);
    const viewerSeat = seat ?? 1;
    // Hidden-information games redact what each seat may see (e.g. Battleship fleet).
    const viewState = adapter?.redactStateForSeat ? adapter.redactStateForSeat(state, viewerSeat) : state;
    const rules = parseMatchRulesJson(row.rules_json);
    const turnTimerMs = this.resolveTurnTimerMs(rules);
    const turnStartedAt = row.turn_started_at
      ? parseSqliteUtcDateTimeMs(row.turn_started_at)
      : Date.now();
    const turnRemainingMs = Math.max(0, turnTimerMs - (Date.now() - turnStartedAt));

    return {
      matchId: row.id,
      gameId: row.game_id,
      status: row.status as MatchView['status'],
      opponentKind: row.opponent_kind as MatchView['opponentKind'],
      difficulty: row.difficulty as GameDifficulty | null,
      yourSeat: viewerSeat,
      currentSeat: row.current_seat,
      state: viewState,
      scores: adapter?.scores(state) ?? {},
      turnRemainingMs,
      winnerUserId: row.winner_id,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
      practice: isMatchPracticeMode(rules),
      stateRevision: row.state_version ?? 0,
    };
  }

  async getMatchForUser(matchId: string, labUserId: number): Promise<MatchView | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tables.matches} WHERE id = ?`)
      .get(matchId) as MatchRow | undefined;
    if (!row) {
      return null;
    }
    await this.applyTurnTimeoutIfNeeded(row);
    const refreshed = this.db
      .prepare(`SELECT * FROM ${this.tables.matches} WHERE id = ?`)
      .get(matchId) as MatchRow;
    return this.buildMatchView(refreshed, labUserId);
  }

  /** Push personalized match views over `/lab-comms` (human PvP only). */
  private async syncHumanMatchToClients(matchId: string): Promise<void> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tables.matches} WHERE id = ?`)
      .get(matchId) as MatchRow | undefined;
    if (!row || row.opponent_kind !== 'human') {
      return;
    }
    await this.applyTurnTimeoutIfNeeded(row);
    const refreshed = this.db
      .prepare(`SELECT * FROM ${this.tables.matches} WHERE id = ?`)
      .get(matchId) as MatchRow;
    try {
      const view1 = this.buildMatchView(refreshed, refreshed.player1_id);
      const view2 = this.buildMatchView(refreshed, refreshed.player2_id);
      if (view1) {
        await pushPlatformMatchState(
          [refreshed.player1_id],
          matchId,
          view1 as unknown as Record<string, unknown>,
        );
      }
      if (view2) {
        await pushPlatformMatchState(
          [refreshed.player2_id],
          matchId,
          view2 as unknown as Record<string, unknown>,
        );
      }
    } catch {
      // Match remains authoritative in app DB; socket push is best-effort.
    }
  }

  private async applyTurnTimeoutIfNeeded(row: MatchRow): Promise<void> {
    if (row.status !== 'active' || !row.turn_started_at) {
      return;
    }
    const rules = row.rules_json ? JSON.parse(row.rules_json) : {};
    const turnTimerMs = this.resolveTurnTimerMs(rules);
    const elapsed = Date.now() - parseSqliteUtcDateTimeMs(row.turn_started_at);
    if (elapsed < turnTimerMs) {
      return;
    }
    const adapter = getGameAdapter(row.game_id);
    if (!adapter) {
      return;
    }
    const state = adapter.onTurnTimeout(JSON.parse(row.state_json), row.current_seat);
    const nextSeat = resolveMatchClockSeat(
      state,
      adapter,
      { type: 'timeout' },
      row.current_seat,
    );
    let status = 'active';
    let winnerId: number | null = null;
    if (adapter.isFinished(state)) {
      status = 'finished';
      const winSeat = adapter.winnerSeat(state);
      winnerId = winSeat ? seatToUserId(row, winSeat) : null;
      this.recordMatchRuns(row, state, winnerId);
      this.applyVirtualBankAfterFinish(row, state, winnerId);
    }
    this.db
      .prepare(
        `UPDATE ${this.tables.matches} SET state_json = ?, current_seat = ?, status = ?, winner_id = ?,
         state_version = state_version + 1, turn_started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      )
      .run(JSON.stringify(state), nextSeat, status, winnerId, row.id);

    if (row.opponent_kind === 'ai' && status === 'active' && nextSeat === this.aiSeat()) {
      await this.runAgentTurn(row.id, row.player1_id);
    } else if (row.opponent_kind === 'human') {
      await this.syncHumanMatchToClients(row.id);
    }
  }

  private aiSeat(): number {
    return 2;
  }

  isAiAgentTurnPending(row: MatchRow): boolean {
    return row.opponent_kind === 'ai' && row.status === 'active' && row.current_seat === this.aiSeat();
  }

  assertCanStreamAgentTurn(matchId: string, labUserId: number): MatchRow {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tables.matches} WHERE id = ?`)
      .get(matchId) as MatchRow | undefined;
    if (!row) {
      throw new Error('Match not found');
    }
    if (row.player1_id !== labUserId) {
      throw new Error('Not a player');
    }
    if (!this.isAiAgentTurnPending(row)) {
      throw new Error('No agent turn pending');
    }
    return row;
  }

  async submitMove(matchId: string, labUserId: number, move: unknown): Promise<MatchView | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tables.matches} WHERE id = ?`)
      .get(matchId) as MatchRow | undefined;
    if (!row || row.status !== 'active') {
      throw new Error('Match not active');
    }
    await this.applyTurnTimeoutIfNeeded(row);
    const current = this.db
      .prepare(`SELECT * FROM ${this.tables.matches} WHERE id = ?`)
      .get(matchId) as MatchRow;
    const seat = playerSeatForUser(current, labUserId);
    if (seat == null) {
      throw new Error('Not a player');
    }
    if (current.current_seat !== seat) {
      throw new Error('Not your turn');
    }
    const adapter = getGameAdapter(current.game_id);
    if (!adapter) {
      throw new Error('No adapter');
    }
    let state = JSON.parse(current.state_json);
    const validation = adapter.validateMove(state, move, seat);
    if (!validation.ok) {
      throw new Error(validation.error ?? 'Invalid move');
    }
    state = adapter.applyMove(state, move, seat);
    let status = 'active';
    let winnerId: number | null = null;
    if (adapter.isFinished(state)) {
      status = 'finished';
      const winSeat = adapter.winnerSeat(state);
      winnerId = winSeat ? seatToUserId(current, winSeat) : null;
      this.recordMatchRuns(current, state, winnerId);
      this.applyVirtualBankAfterFinish(current, state, winnerId);
    }
    const nextSeat = resolveMatchClockSeat(state, adapter, move, seat);
    this.db
      .prepare(
        `UPDATE ${this.tables.matches} SET state_json = ?, current_seat = ?, status = ?, winner_id = ?,
         state_version = state_version + 1, turn_started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      )
      .run(JSON.stringify(state), nextSeat, status, winnerId, matchId);

    await this.syncHumanMatchToClients(matchId);
    return await this.getMatchForUser(matchId, labUserId);
  }

  async streamAgentTurn(
    matchId: string,
    labUserId: number,
    send: (event: string, data: unknown) => void,
  ): Promise<void> {
    const existing = this.agentTurnInFlight.get(matchId);
    if (existing) {
      twAgentStreamDebug('streamAgentTurn join in-flight', {
        matchId,
        replayDeltas: existing.deltas.length,
      });
      for (const payload of existing.deltas) {
        send('delta', payload);
      }
      const onDelta = (payload: PlatformLlmStreamDeltaPayload) => send('delta', payload);
      existing.listeners.add(onDelta);
      try {
        await existing.promise;
        const match = await this.getMatchForUser(matchId, labUserId);
        if (match) {
          send('done', { match });
        }
      } finally {
        existing.listeners.delete(onDelta);
      }
      return;
    }

    const matchRow = this.db
      .prepare(`SELECT game_id FROM ${this.tables.matches} WHERE id = ?`)
      .get(matchId) as { game_id: string } | undefined;
    const gameIdForSummary = matchRow?.game_id ?? '';

    twAgentStreamDebug('streamAgentTurn start (batch LLM)', { matchId, labUserId });
    const inFlight: AgentTurnInFlight = {
      promise: Promise.resolve(),
      deltas: [],
      listeners: new Set(),
    };
    // Register before LLM work starts so a racing second `matchAgentTurn` joins this job
    // instead of applying a second shot (duplicate history, one replay animation).
    this.agentTurnInFlight.set(matchId, inFlight);
    const emitDelta = (payload: PlatformLlmStreamDeltaPayload) => {
      this.publishAgentDelta(inFlight, payload);
      send('delta', payload);
    };
    const job = this.runAgentTurn(matchId, labUserId, emitDelta);
    inFlight.promise = job.then(() => undefined);
    try {
      const appliedMove = await job;
      const match = await this.getMatchForUser(matchId, labUserId);
      if (match) {
        const adapter = getGameAdapter(gameIdForSummary);
        send('done', {
          match,
          agentMoveSummary: adapter?.summarizeMove?.(appliedMove) ?? 'Finished its turn.',
        });
      }
    } catch (err) {
      send('error', {
        error: err instanceof Error ? err.message : 'Agent turn failed',
      });
      throw err;
    } finally {
      twAgentStreamDebug('streamAgentTurn end', { matchId });
      this.agentTurnInFlight.delete(matchId);
    }
  }

  async runAgentTurn(
    matchId: string,
    humanUserId: number,
    onAgentDelta?: (payload: PlatformLlmStreamDeltaPayload) => void,
  ): Promise<unknown> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tables.matches} WHERE id = ?`)
      .get(matchId) as MatchRow | undefined;
    if (!row || row.status !== 'active' || row.opponent_kind !== 'ai') {
      throw new Error('Match is not waiting on the Lab Assistant opponent');
    }
    const aiSeat = this.aiSeat();
    if (row.current_seat !== aiSeat) {
      throw new Error('No agent turn pending');
    }
    const adapter = getGameAdapter(row.game_id);
    if (!adapter) {
      throw new Error('No game adapter for agent turn');
    }
    const difficulty = (row.difficulty as GameDifficulty) ?? 'medium';
    let state = JSON.parse(row.state_json);
    const resolveElapsed = agentTurnMark();
    const move = await resolveAgentMove(
      this.config,
      row.game_id,
      state,
      difficulty,
      aiSeat,
      humanUserId,
      { onAgentDelta },
    );
    agentTurnPhaseDebug('runAgentTurn.resolveAgentMove', {
      matchId,
      gameId: row.game_id,
      difficulty,
      resolveAgentMoveMs: resolveElapsed(),
    });
    const validation = adapter.validateMove(state, move, aiSeat);
    if (!validation.ok) {
      // No silent pass: an illegal agent move means the provider failed. Surface it.
      throw new Error(
        `Lab Assistant opponent returned an illegal move: ${validation.error ?? 'no reason given'}`,
      );
    }
    const appliedMove: unknown = move;
    state = adapter.applyMove(state, move, aiSeat);
    const nextSeat = resolveMatchClockSeat(state, adapter, appliedMove, aiSeat);
    let status = 'active';
    let winnerId: number | null = null;
    if (adapter.isFinished(state)) {
      status = 'finished';
      const winSeat = adapter.winnerSeat(state);
      winnerId = winSeat ? seatToUserId(row, winSeat) : null;
      this.recordMatchRuns(row, state, winnerId);
      this.applyVirtualBankAfterFinish(row, state, winnerId);
    }
    this.db
      .prepare(
        `UPDATE ${this.tables.matches} SET state_json = ?, current_seat = ?, status = ?, winner_id = ?,
         state_version = state_version + 1, turn_started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      )
      .run(JSON.stringify(state), nextSeat, status, winnerId, matchId);
    await this.syncHumanMatchToClients(matchId);
    return appliedMove;
  }

  private recordMatchRuns(row: MatchRow, state: unknown, winnerUserId: number | null): void {
    const adapter = getGameAdapter(row.game_id);
    const scores = adapter?.scores(state) ?? {};
    const p1Score = scores[1] ?? 0;
    const p2Score = scores[2] ?? 0;
    const record = (
      userId: number,
      primary: number,
      opponentPrimary: number,
      outcome: 'win' | 'loss' | 'draw',
    ) => {
      const payload: GameRunPayload = {
        gameId: row.game_id,
        opponentKind: row.opponent_kind === 'ai' ? 'ai' : 'human',
        opponentUserId:
          row.opponent_kind === 'human'
            ? userId === row.player1_id
              ? row.player2_id
              : row.player1_id
            : undefined,
        matchId: row.id,
        difficulty: (row.difficulty as GameDifficulty) ?? undefined,
        outcome,
        primaryValue: primary,
        agentPrimaryValue: row.opponent_kind === 'ai' ? opponentPrimary : undefined,
        durationMs: 0,
        runId: randomUUID(),
      };
      this.runsService.submitRun(userId, payload);
    };
    if (row.opponent_kind === 'ai') {
      const outcome =
        winnerUserId === row.player1_id ? 'win' : winnerUserId == null ? 'draw' : 'loss';
      record(row.player1_id, p1Score, p2Score, outcome);
      return;
    }
    record(
      row.player1_id,
      p1Score,
      p2Score,
      winnerUserId === row.player1_id ? 'win' : winnerUserId == null ? 'draw' : 'loss',
    );
    record(
      row.player2_id,
      p2Score,
      p1Score,
      winnerUserId === row.player2_id ? 'win' : winnerUserId == null ? 'draw' : 'loss',
    );
  }

  private applyVirtualBankAfterFinish(
    row: MatchRow,
    state: unknown,
    winnerUserId: number | null,
  ): void {
    if (isMatchPracticeMode(parseMatchRulesJson(row.rules_json))) {
      return;
    }
    const adapter = getGameAdapter(row.game_id);
    void applyVirtualBankForFinishedMatch({
      appId: this.config.appId,
      gameId: row.game_id,
      row,
      state,
      winnerUserId,
      adapter: adapter ?? undefined,
    }).catch(() => {
      /* best-effort — match outcome is already authoritative */
    });
  }

  createInvite(
    inviterId: number,
    inviteeId: number,
    gameId: string,
    rules?: {
      turnTimerMs?: number;
      practice?: boolean;
      rulesProfile?: 'free' | 'eight-ball' | 'nine-ball';
      wagerQuarks?: number;
    },
  ) {
    if (inviterId === inviteeId) {
      throw new Error('Cannot invite yourself');
    }
    const adapter = getGameAdapter(gameId);
    let wagerQuarks = 0;
    const requestedWager = rules?.wagerQuarks ?? 0;
    if (requestedWager > 0) {
      if (!adapter?.resolveHumanMatchWagerQuarks) {
        throw new Error('Wagers not supported for this game');
      }
      wagerQuarks = adapter.resolveHumanMatchWagerQuarks(requestedWager);
    }
    const id = randomUUID();
    const merged = {
      turnTimerMs: this.resolveTurnTimerMs(rules),
      ...(rules?.practice ? { practice: true } : {}),
      ...(rules?.rulesProfile != null ? { rulesProfile: rules.rulesProfile } : {}),
      ...(wagerQuarks > 0 ? { wagerQuarks } : {}),
    };
    this.db
      .prepare(
        `INSERT INTO ${this.tables.invites} (id, game_id, inviter_id, invitee_id, rules_json, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
      )
      .run(id, gameId, inviterId, inviteeId, JSON.stringify(merged));
    return { inviteId: id, gameId, rules: merged };
  }

  acceptInvite(inviteId: string, inviteeId: number) {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tables.invites} WHERE id = ?`)
      .get(inviteId) as
      | {
          id: string;
          game_id: string;
          inviter_id: number;
          invitee_id: number;
          rules_json: string | null;
          status: string;
        }
      | undefined;
    if (!row || row.status !== 'pending' || row.invitee_id !== inviteeId) {
      throw new Error('Invalid invite');
    }
    const rules = row.rules_json ? JSON.parse(row.rules_json) : {};
    const matchId = this.createHumanMatch(row.inviter_id, row.invitee_id, row.game_id, rules);
    this.db
      .prepare(`UPDATE ${this.tables.invites} SET status = 'accepted', match_id = ? WHERE id = ?`)
      .run(matchId, inviteId);
    return { matchId, inviteId, gameId: row.game_id, inviterId: row.inviter_id };
  }

  cancelInvite(inviteId: string, inviterId: number): { inviteId: string; inviteeId: number } {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tables.invites} WHERE id = ?`)
      .get(inviteId) as
      | { id: string; inviter_id: number; invitee_id: number; status: string }
      | undefined;
    if (!row || row.status !== 'pending' || row.inviter_id !== inviterId) {
      throw new Error('Invalid invite');
    }
    this.db
      .prepare(`UPDATE ${this.tables.invites} SET status = 'cancelled' WHERE id = ?`)
      .run(inviteId);
    return { inviteId, inviteeId: row.invitee_id };
  }

  declineInvite(inviteId: string, inviteeId: number): { inviteId: string; inviterId: number } {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tables.invites} WHERE id = ?`)
      .get(inviteId) as
      | { id: string; inviter_id: number; invitee_id: number; status: string }
      | undefined;
    if (!row || row.status !== 'pending' || row.invitee_id !== inviteeId) {
      throw new Error('Invalid invite');
    }
    this.db
      .prepare(`UPDATE ${this.tables.invites} SET status = 'declined' WHERE id = ?`)
      .run(inviteId);
    return { inviteId, inviterId: row.inviter_id };
  }
}
