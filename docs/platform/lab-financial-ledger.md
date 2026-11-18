# Financial Ledger (platform v1)

Double-entry **chart of accounts** and **journal entries** on the main backend (**port 3000**). Catalog app **Financial Ledger** plus Settings admin. **CRM** (`app-lab-crm`) posts from record context via slot `crm.ledger.entry.post.dialog` (connector `lab-financial-ledger.ledger-entries` on :3000); optional dashboard chart `reports.ledger.activity`.

## Behavior

- Amounts stored as **integer cents** on the server; journal UI uses dollars.
- Each entry must **balance** (total debits = total credits).
- Account **balance** updates on post using each account’s **normal balance** (debit vs credit).
- On first DB init, five default accounts are seeded (Cash, AP, Equity, Revenue, Expenses).

## Settings

| Panel | Who |
|-------|-----|
| **Financial ledger** | Members+ post simple debit/credit entries, view balances and recent entries |
| **Ledger accounts** | Admins CRUD accounts |

## API

- `GET/POST/PUT/DELETE /api/platform/lab-ledger/accounts`
- `GET /api/platform/lab-ledger/entries`
- `POST /api/platform/lab-ledger/entries`

Client: `src/shared/services/platform-lab-ledger.client.ts`

## Domain event

- `platform-ledger.entry.posted` (`sourceAppId`: `platform-ledger`) — full publish pipeline (notifications, rules, workflows).

## Realtime journal refresh

After a balanced entry posts (Settings, Forms Builder dialog, or workflow `ledger_post_entry`), the main backend emits **`lab_events:ledger_journal_changed`** on `/lab-events`. **Financial Ledger** and **Settings → Financial ledger** subscribe via `useLabLedgerJournalLive` and reload accounts + journal rows without a manual refresh.

## Demo journal reset (local dev)

When the **platform ledger demo pack** is installed (DEMO-CASH account present) and demo seed boot is not disabled for Financial Ledger, every **main backend** `initialize()` runs `syncDemoAutomationDefinitions()` → **`purgeTestLedgerJournalEntriesOnDemoSync`**. That deletes journal rows whose ids are **not** in the fixed seed set (default three samples plus four demo-pack story lines), reverses account balances for removed lines, then re-inserts any missing canonical rows. CRM **Post entry**, workflow **`ledger_post_entry`**, and manual test posts therefore disappear after a backend restart — same idea as purging stale rows on demo approval policies. CRM entity demo data resets separately when you **relaunch the CRM app server** (see CRM app instructions). Disable ledger demo boot seeding in **Settings → App seed data** if you need test journal rows to persist across restarts.

## Out of scope (v1)

Catalog Ledger app, Chart Builder data source wiring, Expense reports integration, multi-currency, fiscal periods, reversing entries.

## Related

- [Lab domain events](lab-domain-events.md)
- [Approvals](docs/platform/lab-approvals.md) — future expense approval flows (Phase 3 apps)
