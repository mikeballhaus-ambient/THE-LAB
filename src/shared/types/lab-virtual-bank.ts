/** Platform-wide play-money bank (not real currency). User-facing unit names: `src/shared/constants/lab-quarks-currency.ts`. */

export type LabVirtualBankReasonCode =
  | 'account_opening'
  | 'daily_accrual'
  | 'game_win_reward'
  | 'game_pot_win'
  | 'game_pot_loss'
  | 'poll_reward'
  | 'activity_reward'
  | 'hint_purchase'
  | 'manual_adjustment';

export interface LabVirtualBankAccountView {
  balance: number;
  /** UTC calendar date of last processed daily accrual (`YYYY-MM-DD`). */
  lastDailyAccrualDate: string;
  dailyAccrualAmount: number;
  startingBalance: number;
  /** Present when this balance read applied daily accrual (first app open of a new UTC day). */
  accruedThisRequest?: LabVirtualBankAccrualApplied;
}

export interface LabVirtualBankAccrualApplied {
  delta: number;
  /** UTC calendar days credited (1 = today only; capped by max offline days). */
  days: number;
}

/** Read-only daily allotment decision for workflows (`virtual_bank_get_wallet`). */
export interface LabVirtualBankDailyAllotmentEligibility {
  balance: number;
  lastDailyAccrualDate: string;
  dailyAccrualAmount: number;
  balanceCap: number;
  dailyAllotmentEligible: boolean;
  projectedAllotmentDelta: number;
}

export interface LabVirtualBankLedgerEntry {
  id: number;
  delta: number;
  balanceAfter: number;
  reasonCode: LabVirtualBankReasonCode;
  reasonLabel: string;
  sourceAppId: string | null;
  sourceRef: string | null;
  createdAt: string;
}

export interface LabVirtualBankAdjustRequest {
  userId: number;
  delta: number;
  reasonCode: LabVirtualBankReasonCode;
  reasonLabel: string;
  sourceAppId?: string;
  sourceRef?: string;
  metadata?: Record<string, unknown>;
}

export interface LabVirtualBankAdjustResult {
  balance: number;
  ledgerEntryId: number;
  /** True when `sourceRef` already existed for this user — balance unchanged, no new credit. */
  skippedDuplicate?: boolean;
}

/** Default policy — admins may override later via settings table. */
export const LAB_VIRTUAL_BANK_STARTING_BALANCE = 10_000;
/** Daily drip on first balance read each UTC day (~5 Hold'em hands at default stake). */
export const LAB_VIRTUAL_BANK_DAILY_ACCRUAL = 500;
/** No daily accrual while balance is at or above this amount (wins/rewards may still exceed it). */
export const LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP = 15_000;
/** Cap offline accrual so returning after a year does not flood the economy. */
export const LAB_VIRTUAL_BANK_MAX_ACCRUAL_DAYS = 30;

/**
 * Win bonuses for non-wagering games (`appId:gameId` → Quark amounts).
 * Wagering games (poker) use adapter `virtualBankSettlements` instead.
 */
export const LAB_VIRTUAL_BANK_WIN_REWARDS: Readonly<Record<string, number>> = {
  'app-battleship:battleship': 250,
  'app-tic-tac-toe:tic-tac-toe': 75,
  'app-chess:chess': 150,
  'app-checkers:checkers': 100,
  'app-connect-four:connect-four': 100,
  'app-hangman:hangman': 75,
  'app-word-tile:word-tile': 125,
};

export function virtualBankWinRewardKey(appId: string, gameId: string): string {
  return `${appId}:${gameId}`;
}

export function resolveVirtualBankWinReward(appId: string, gameId: string): number | null {
  const key = virtualBankWinRewardKey(appId, gameId);
  if (!Object.prototype.hasOwnProperty.call(LAB_VIRTUAL_BANK_WIN_REWARDS, key)) {
    return null;
  }
  return LAB_VIRTUAL_BANK_WIN_REWARDS[key] ?? 0;
}

/** One-time lab activity credits (signed-in users; idempotent via ledger `sourceRef`). */
export const LAB_ACTIVITY_QUARK_REWARDS = {
  pollVote: 75,
  eventRsvp: 50,
  quizPass: 100,
  suggestionSubmit: 60,
} as const;

export type LabActivityQuarkRewardKind = keyof typeof LAB_ACTIVITY_QUARK_REWARDS;

export function labActivityQuarkSourceRef(
  kind: LabActivityQuarkRewardKind,
  ids: { userId?: number; pollId?: number; eventId?: number; quizId?: number; suggestionId?: number },
): string {
  switch (kind) {
    case 'pollVote':
      return `activity:poll-vote:poll:${ids.pollId}:user:${ids.userId}`;
    case 'eventRsvp':
      return `activity:rsvp:event:${ids.eventId}:user:${ids.userId}`;
    case 'quizPass':
      return `activity:quiz-pass:quiz:${ids.quizId}:user:${ids.userId}`;
    case 'suggestionSubmit':
      return `activity:suggestion:${ids.suggestionId}`;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
