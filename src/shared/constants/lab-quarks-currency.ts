/**
 * Lab play-money currency — **display naming only** (not real currency).
 *
 * Change the strings here to rebrand the whole lab; APIs and tables stay
 * `virtual-bank` internally. Import these constants/formatters everywhere
 * user-facing copy mentions the currency.
 */

export const LAB_QUARKS_CURRENCY = {
  /** Plural unit name (e.g. balance line, most toasts). */
  name: 'Quarks',
  /** Singular unit name (exactly ±1). */
  nameSingular: 'Quark',
  /** Compact chrome label (header badge). */
  badgeLabel: 'Quarks',
  /** Toast / notification title when balance changes. */
  toastSummary: 'Quarks',
  /** Toast title when daily Quarks are credited on first balance read of the UTC day. */
  dailyAccrualToastSummary: 'Daily allotment',
  /** Wallet dialog (quick nav) title. */
  walletDialogTitle: 'Quarks wallet',
  /** Ledger + policy copy for first credit. */
  welcomeCreditLabel: 'Welcome Quarks',
  /** Ledger copy for daily drip (single day). */
  dailyAccrualLabel: 'Daily Quark allotment',
  /** Ledger copy when multiple offline days accrue at once. */
  dailyAccrualMultiDayLabel: 'Daily Quark allotment',
  /** Non-wagering game win credit. */
  gameWinBonusLabel: 'Win bonus',
  /** Short disclaimer for game lobbies. */
  playMoneyDisclaimer: 'Play Quarks only — not real money.',
} as const;

function pluralUnit(absAmount: number): string {
  return absAmount === 1 ? LAB_QUARKS_CURRENCY.nameSingular : LAB_QUARKS_CURRENCY.name;
}

/** Absolute amount with unit, e.g. `10,000 Quarks` or `1 Quark`. */
export function formatLabQuarksAmount(amount: number): string {
  const n = Math.trunc(amount);
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const sign = n < 0 ? '−' : '';
  return `${sign}${formatted} ${pluralUnit(abs)}`;
}

/** Signed delta, e.g. `+250 Quarks` or `−100 Quarks`. */
export function formatLabQuarksDelta(delta: number): string {
  const n = Math.trunc(delta);
  if (n === 0) {
    return `0 ${LAB_QUARKS_CURRENCY.name}`;
  }
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const sign = n > 0 ? '+' : '−';
  return `${sign}${formatted} ${pluralUnit(abs)}`;
}

/** Toast detail: `+250 Quarks (10,250 Quarks total)`. */
export function formatLabQuarksDeltaWithBalance(delta: number, balanceAfter: number): string {
  return `${formatLabQuarksDelta(delta)} (${formatLabQuarksAmount(balanceAfter)} total)`;
}

/** Toast detail when daily accrual lands (includes multi-day catch-up). */
export function formatLabQuarksDailyAccrualToastDetail(
  delta: number,
  days: number,
  balanceAfter: number,
): string {
  if (days > 1) {
    return `${formatLabQuarksDelta(delta)} (${days} days) · ${formatLabQuarksAmount(balanceAfter)} total`;
  }
  return formatLabQuarksDeltaWithBalance(delta, balanceAfter);
}

/** Numeric only (charts, tight spaces) — unit omitted. */
export function formatLabQuarksNumber(amount: number): string {
  return Math.trunc(amount).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
