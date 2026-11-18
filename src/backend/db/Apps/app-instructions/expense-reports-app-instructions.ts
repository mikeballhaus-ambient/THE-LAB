/**
 * Agent instructions for the Expense Reports catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const expenseReportsAppInstructions = `# App System Instructions: Expense Reports

## Overview

\`app-expense-reports\` is a **hybrid** productivity catalog app for logging expenses and tracking reimbursement status. UI: \`src/apps/expense-reports/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4116**). Hard deps: \`app-lab-financial-ledger\`, \`app-lab-approvals-policies\`.

## Data model

- **Expense reports** — title, submitter, amount (stored in **cents**), currency, category, spent-on date, status (\`draft\` | \`submitted\` | \`approved\` | \`rejected\` | \`reimbursed\`), receipt URL, notes (\`expense_reports\`).
- **Submitted** rows are **pending manager approval** in the UI (Lab Approvals decides → workflow writes \`approved\` or \`rejected\`).

## API (app server, REST)

- \`GET /api/expenses\` — expenses + per-status totals.
- \`POST/PUT/DELETE /api/expenses[/:id]\`.
- \`PATCH /api/expenses/:id/status\` — submit, reimburse, resubmit (not inline approve while pending).

## Integration (rm-64)

Host \`app-expense-reports\`, surface \`expense-reports.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`. Live refresh: \`catalogHostAppId\` + \`useCatalogHostLiveRefresh\`.

### Forms Builder

Expense (primary): \`entityKey\` \`expense\`, segment \`expenses\` — \`openPrimary*\`. Connector maps **submitter** / **category** for Select hydration (\`expense-connector-body.ts\`). Connector **status-only** updates support workflow \`integration_update\`.

### Chart Builder

\`reports.expenses-by-status\`, \`reports.expenses-by-category\`. Charts refetch via \`chartContext.dataRevision\`.

### Inline (non-FB)

\`PATCH /api/expenses/:id/status\` — **Submit** (draft→submitted), **Reimburse** (approved→reimbursed), **Resubmit** (rejected→submitted). Managers approve in **Lab Approvals**, not via row **Approve**.

## Demo workflows

- **Request:** \`app-expense-reports.expense.submitted\` → raise approval (policy \`…000013\`, subject \`expense\` / \`expenseId\`).
- **Response:** \`platform-approvals.request.*\` → \`integration_update\` on \`expense-reports.expenses\` (\`status\` ← \`requestStatus\`) → notify \`requesterUserId\`.

## Events published (lab domain events)

| Event | Published when |
|-------|----------------|
| \`app-expense-reports.expense.submitted\` | status transitions **draft → submitted** |
| \`app-expense-reports.expense.approved\` | status transitions **to** \`approved\` (including workflow write-back) |

## UI layout

Reports (two charts) → status total chips + expense rows. See \`docs/apps/catalog-workspace-ui-pattern.md\`.

## Automation scope

- Root class \`expense-reports-app\`. \`useUniqueElementId()\`. \`lab-*\` theming. Amounts in integer cents.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-expense-reports',
  displayName: 'Expense Reports',
  contextAreaClass: 'expense-reports-app',
  primaryRecordLabel: 'expense title',
})}

User doc: \`docs/apps/expense-reports.md\`.
`;
