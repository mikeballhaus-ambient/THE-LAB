/** Seeded Forms Builder keys for Wave B platform catalog apps (rm-64 phases 15–19). */

function hostPrefix(hostAppId: string): string {
  return hostAppId.replace(/^app-/, '');
}

export function platformCatalogFormKey(hostAppId: string, slot: string): string {
  return `${hostPrefix(hostAppId)}.${slot}`;
}

export const LEDGER_ACTIVITY_CHART_KEY = 'lab-financial-ledger.ledger.activity.chart';
export const LEDGER_POSTINGS_BY_CREDIT_CHART_KEY = 'lab-financial-ledger.ledger.postings-by-credit.chart';
export const LEDGER_ACCOUNT_BALANCES_CHART_KEY = 'lab-financial-ledger.ledger.account-balances.chart';
