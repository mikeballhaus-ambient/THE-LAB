import type { MatchRow } from '@/shared/game-platform/match-service';
import { applyLabVirtualBankAdjustment } from '@/shared/services/lab-virtual-bank-client.node';
import { resolveVirtualBankWinReward } from '@/shared/types/lab-virtual-bank';
import { LAB_QUARKS_CURRENCY } from '@/shared/constants/lab-quarks-currency';
import type { GameServerAdapter, VirtualBankSettlementLine } from '@/shared/game-platform/types';

async function applyLine(appId: string, line: VirtualBankSettlementLine): Promise<void> {
  await applyLabVirtualBankAdjustment({
    userId: line.labUserId,
    delta: line.delta,
    reasonCode: line.reasonCode,
    reasonLabel: line.reasonLabel,
    sourceAppId: appId,
    sourceRef: line.sourceRef,
  });
}

/** Best-effort credits/debits when a turn-based match finishes. */
export async function applyVirtualBankForFinishedMatch(options: {
  appId: string;
  gameId: string;
  row: MatchRow;
  state: unknown;
  winnerUserId: number | null;
  adapter: GameServerAdapter | undefined;
}): Promise<void> {
  const { appId, gameId, row, state, winnerUserId, adapter } = options;

  if (adapter?.virtualBankSettlements) {
    const ctx = {
      matchId: row.id,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
    };
    const lines = adapter.virtualBankSettlements(state, ctx);
    for (const line of lines) {
      if (line.delta === 0) {
        continue;
      }
      await applyLine(appId, { ...line, sourceRef: line.sourceRef ?? row.id });
    }
    return;
  }

  const reward = resolveVirtualBankWinReward(appId, gameId);
  if (reward == null || reward <= 0) {
    return;
  }

  const creditWinner = async (userId: number, outcome: 'win' | 'draw') => {
    if (outcome !== 'win') {
      return;
    }
    await applyLine(appId, {
      labUserId: userId,
      delta: reward,
      reasonCode: 'game_win_reward',
      reasonLabel: LAB_QUARKS_CURRENCY.gameWinBonusLabel,
      sourceRef: row.id,
    });
  };

  if (row.opponent_kind === 'ai') {
    const outcome =
      winnerUserId === row.player1_id ? 'win' : winnerUserId == null ? 'draw' : 'loss';
    if (outcome === 'win') {
      await creditWinner(row.player1_id, 'win');
    }
    return;
  }

  if (winnerUserId === row.player1_id) {
    await creditWinner(row.player1_id, 'win');
  } else if (winnerUserId == null) {
    await creditWinner(row.player1_id, 'draw');
  }
  if (winnerUserId === row.player2_id) {
    await creditWinner(row.player2_id, 'win');
  } else if (winnerUserId == null) {
    await creditWinner(row.player2_id, 'draw');
  }
}
