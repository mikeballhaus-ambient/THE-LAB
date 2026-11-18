import type {
  LabVirtualBankLedgerEntry,
  LabVirtualBankReasonCode,
} from '@/shared/types/lab-virtual-bank';

/** Friendly app names for ledger rows (`source_app_id`). Extend as games ship. */
const QUARKS_LEDGER_APP_LABELS: Readonly<Record<string, string>> = {
  'app-battleship': 'Battleship',
  'app-checkers': 'Checkers',
  'app-chess': 'Chess',
  'app-connect-four': 'Connect Four',
  'app-hangman': 'Hangman',
  'app-poker-holdem': "Texas Hold'em",
  'app-blackjack': 'Blackjack',
  'app-tic-tac-toe': 'Tic-Tac-Toe',
  'app-word-tile': 'Word Tile',
  'app-polls-surveys': 'Polls & Surveys',
  'app-event-rsvp': 'Event RSVP',
  'app-training-quizzes': 'Training & Quizzes',
  'app-suggestion-box': 'Suggestion Box',
};

export function resolveQuarksLedgerAppLabel(appId: string): string {
  const known = QUARKS_LEDGER_APP_LABELS[appId];
  if (known) {
    return known;
  }
  return appId
    .replace(/^app-/, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isGameReason(code: LabVirtualBankReasonCode): boolean {
  return (
    code === 'game_win_reward' ||
    code === 'game_pot_win' ||
    code === 'game_pot_loss'
  );
}

/** Primary line: activity + game where applicable. */
export function formatQuarksLedgerActivityTitle(entry: LabVirtualBankLedgerEntry): string {
  if (entry.sourceAppId && isGameReason(entry.reasonCode)) {
    return `${resolveQuarksLedgerAppLabel(entry.sourceAppId)} — ${entry.reasonLabel}`;
  }
  if (entry.sourceAppId && entry.reasonCode !== 'daily_accrual' && entry.reasonCode !== 'account_opening') {
    return `${resolveQuarksLedgerAppLabel(entry.sourceAppId)} — ${entry.reasonLabel}`;
  }
  return entry.reasonLabel;
}

/** Secondary hint when the primary line is generic (future poll/activity rewards). */
export function formatQuarksLedgerActivityHint(entry: LabVirtualBankLedgerEntry): string | null {
  if (entry.reasonCode === 'poll_reward') {
    return 'Poll reward';
  }
  if (entry.reasonCode === 'activity_reward') {
    return 'Lab activity';
  }
  if (entry.reasonCode === 'manual_adjustment') {
    return 'Adjustment';
  }
  return null;
}
