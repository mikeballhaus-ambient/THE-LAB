/**
 * Optional frame wager (Quarks) for head-to-head catalog matches — same tiers as billiards.
 */
import type { GameDifficulty, GameServerAdapter, MatchCreateConfig, VirtualBankSettlementLine } from './types';

export const CATALOG_WAGER_STAKES_BY_DIFFICULTY: Readonly<Record<GameDifficulty, number>> = {
  easy: 50,
  medium: 250,
  hard: 500,
  boss: 1000,
};

export const CATALOG_PVP_WAGER_STAKES: readonly number[] = [50, 250, 500, 1000];

export function catalogWagerStakeForDifficulty(difficulty: GameDifficulty): number {
  return CATALOG_WAGER_STAKES_BY_DIFFICULTY[difficulty];
}

export function resolveCatalogAiMatchWagerQuarks(
  difficulty: GameDifficulty,
  requested: number | undefined,
): number {
  const tierStake = catalogWagerStakeForDifficulty(difficulty);
  const want = requested ?? 0;
  if (want <= 0) {
    return 0;
  }
  if (want !== tierStake) {
    throw new Error(`Wager must be ${tierStake} Quarks at ${difficulty} difficulty (or play with no bet).`);
  }
  return tierStake;
}

export function resolveCatalogPvpWagerQuarks(requested: number | undefined): number {
  const want = requested ?? 0;
  if (want <= 0) {
    return 0;
  }
  if (!CATALOG_PVP_WAGER_STAKES.includes(want)) {
    throw new Error(`Wager must be one of: ${CATALOG_PVP_WAGER_STAKES.join(', ')} Quarks (or play with no bet).`);
  }
  return want;
}

export function readWagerQuarksFromState(state: unknown): number {
  if (!state || typeof state !== 'object') {
    return 0;
  }
  const raw = (state as { wagerQuarks?: unknown }).wagerQuarks;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

/** True when the lobby frame wager is on the match (not practice / simulated table money only). */
export function matchHasFrameWagerSettlement(match: {
  practice?: boolean;
  state?: unknown;
}): boolean {
  if (match.practice === true) {
    return false;
  }
  return readWagerQuarksFromState(match.state) > 0;
}

function wagerReasonLabel(gameLabel: string, won: boolean): string {
  return won ? `${gameLabel} wager won` : `${gameLabel} wager lost`;
}

/** Win/loss frame wager lines (draw or unfinished → none). */
export function catalogHeadToHeadWagerSettlementLines(
  state: unknown,
  ctx: { matchId: string; player1Id: number; player2Id: number },
  gameLabel: string,
  isFinished: () => boolean,
  winnerSeat: () => number | null,
): VirtualBankSettlementLine[] {
  const stake = readWagerQuarksFromState(state);
  if (!isFinished() || stake <= 0) {
    return [];
  }
  const winner = winnerSeat();
  const humanPvP = ctx.player2Id > 0;
  if (winner === 1) {
    const lines: VirtualBankSettlementLine[] = [
      {
        labUserId: ctx.player1Id,
        delta: stake,
        reasonCode: 'game_pot_win',
        reasonLabel: wagerReasonLabel(gameLabel, true),
        sourceRef: ctx.matchId,
      },
    ];
    if (humanPvP) {
      lines.push({
        labUserId: ctx.player2Id,
        delta: -stake,
        reasonCode: 'game_pot_loss',
        reasonLabel: wagerReasonLabel(gameLabel, false),
        sourceRef: ctx.matchId,
      });
    }
    return lines;
  }
  if (winner === 2) {
    if (humanPvP) {
      return [
        {
          labUserId: ctx.player2Id,
          delta: stake,
          reasonCode: 'game_pot_win',
          reasonLabel: wagerReasonLabel(gameLabel, true),
          sourceRef: ctx.matchId,
        },
        {
          labUserId: ctx.player1Id,
          delta: -stake,
          reasonCode: 'game_pot_loss',
          reasonLabel: wagerReasonLabel(gameLabel, false),
          sourceRef: ctx.matchId,
        },
      ];
    }
    return [
      {
        labUserId: ctx.player1Id,
        delta: -stake,
        reasonCode: 'game_pot_loss',
        reasonLabel: wagerReasonLabel(gameLabel, false),
        sourceRef: ctx.matchId,
      },
    ];
  }
  return [];
}

function injectWagerQuarksIntoState(state: unknown, wagerQuarks: number): unknown {
  if (wagerQuarks <= 0 || state === null || state === undefined) {
    return state;
  }
  if (typeof state !== 'object') {
    return state;
  }
  return { ...(state as object), wagerQuarks };
}

export function catalogMatchWagerAdapterFields(
  gameLabel: string,
  adapter: Pick<GameServerAdapter, 'createInitialState' | 'isFinished' | 'winnerSeat'>,
): Pick<
  GameServerAdapter,
  'createInitialState' | 'resolveAiMatchWagerQuarks' | 'resolveHumanMatchWagerQuarks' | 'virtualBankSettlements'
> {
  const origCreate = adapter.createInitialState.bind(adapter);
  return {
    createInitialState(config: MatchCreateConfig) {
      const created = origCreate(config);
      const wager = Math.max(0, config.rules?.wagerQuarks ?? 0);
      return injectWagerQuarksIntoState(created, wager);
    },
    resolveAiMatchWagerQuarks: resolveCatalogAiMatchWagerQuarks,
    resolveHumanMatchWagerQuarks: resolveCatalogPvpWagerQuarks,
    virtualBankSettlements(state, ctx) {
      return catalogHeadToHeadWagerSettlementLines(
        state,
        ctx,
        gameLabel,
        () => adapter.isFinished(state),
        () => adapter.winnerSeat(state),
      );
    },
  };
}

/** Attach billiards-style optional frame wager to a turn-based adapter. */
export function withCatalogMatchWager(
  adapter: GameServerAdapter,
  options: { gameLabel: string },
): GameServerAdapter {
  return {
    ...adapter,
    ...catalogMatchWagerAdapterFields(options.gameLabel, adapter),
  };
}
