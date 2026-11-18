/**
 * App system instructions for Financial Ledger (seeded into apps.app_system_instructions).
 */

import { formatPlatformRecordListAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const labFinancialLedgerAppInstructions = `# App System Instructions: Financial Ledger

## Overview

Financial Ledger (\`app-lab-financial-ledger\`) is a **browser** catalog app (no app server port). Double-entry **chart of accounts** and **journal entries** live on **port 3000**. UI mirrors **Settings → Financial ledger** / **Ledger accounts (admin)**.

**rm-64 host:** \`PlatformCatalogIntegrationHost\` with \`inlineRegionIds: ['reports.journal']\` on the Journal tab only (dialog-only hosts use an empty inline region list). Manifest \`app-lab-financial-ledger\` / surface \`lab-financial-ledger.workspace\`. Forms and **Chart Builder** journal chart slots use integration bindings — use \`lab_integrations_*\` MCP tools for wiring.

Docs: \`docs/platform/lab-financial-ledger.md\`.

## Shell layout

\`\`\`html
<div class="lab-financial-ledger-app lab-platform-catalog-app">
  <!-- PlatformCatalogIntegrationHost + reports.grid -->
  <tab>Journal</tab>
  <tab>Accounts (admin)</tab>
</div>
\`\`\`

| Tab | Component | Who |
|-----|-----------|-----|
| **Journal** | \`LabLedgerJournal\` | Chart-of-accounts balances + journal list (filter by account/memo, expand rows for lines); post via \`ledger.entry.post.dialog\`; activity chart in reports region |
| **Accounts** | \`LabLedgerAccountsAdmin\` | All members can view; owners/admins CRUD via \`ledger.account.*.dialog\` slots |

## Integration slots

| Slot | Service | Connector segment |
|------|---------|-------------------|
| \`ledger.account.create|edit|delete.dialog\` | \`lab-financial-ledger.ledger-accounts\` | \`lab-ledger-accounts\` |
| \`ledger.entry.post.dialog\` | \`lab-financial-ledger.ledger-entries\` | \`lab-ledger-entries\` (fields: debit/credit account ids, \`amountDollars\`) |
| \`ledger.activity.chart\`, \`ledger.postings-by-credit.chart\`, \`ledger.account-balances.chart\` | Chart Builder | \`reports.journal\` region (compact grid on Journal tab) |

## Behavior

- Amounts: **integer cents** on server; journal UI uses dollars.
- Entries must **balance** (debits = credits).
- Default accounts seed on first platform ledger init (Cash, AP, Equity, Revenue, Expenses). Sample balanced journal entries seed when the ledger has no entries yet; phase-2 demo pack adds a DEMO-CASH / DEMO-REV posting on sync.
- **Demo journal reset:** With the demo pack installed, each main backend start purges journal rows that are not fixed seed ids (workflow/CRM/manual test posts), then restores missing canonical samples. Restart **port 3000**, not only the browser app tab.

## Domain event

- \`platform-ledger.entry.posted\` (\`sourceAppId\`: \`platform-ledger\`) — full publish pipeline.

## Platform APIs (port 3000)

- \`GET/POST/PUT/DELETE /api/platform/lab-ledger/accounts\`
- \`GET /api/platform/lab-ledger/entries\`
- \`POST /api/platform/lab-ledger/entries\`

Client: \`src/shared/services/platform-lab-ledger.client.ts\`



${formatPlatformRecordListAutomationSection({
  contextArea: 'lab-financial-ledger-app',
  recordLabel: 'ledger account',
  launchHint: "Launch **Financial Ledger** → **Accounts (admin)** for the accounts table.",
})}

## Agent checklist

1. Ledger CRUD → platform ledger APIs only.
2. Charts on \`reports.*\` slots → Chart Builder bindings for this host (Wave B).
3. Restart main backend after instruction updates so \`syncSeededAppSystemInstructions()\` refreshes SQLite.
`;
