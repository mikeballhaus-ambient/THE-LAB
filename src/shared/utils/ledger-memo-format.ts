/**
 * Ledger ↔ CRM crossover: company names live in journal memos (no customer dimension on COA).
 * @see demo ledger memos in platform demo seed scripts
 */
export function ledgerMemoForCompany(company: string, what: string): string {
  const companyTrim = company.trim();
  const whatTrim = what.trim();
  if (!companyTrim) {
    return whatTrim.slice(0, 500);
  }
  if (!whatTrim) {
    return companyTrim.slice(0, 500);
  }
  return `${companyTrim} — ${whatTrim}`.slice(0, 500);
}
