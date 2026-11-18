# Demo workflow seeds — sync from main database

The **Workflow Studio** demo graphs (see `DEMO_WORKFLOW_SEEDS` in `demo-workflow-seed-catalog.ts`, currently **14** rows) are seeded into the **main** SQLite database (`lab_workflows`, fixed ids). TypeScript modules under `src/shared/utils/demo-workflow-definition-*.ts` are the committed source of truth.

Removed catalog-only demos (expense, task routing, ledger notify, HTTP echo) are deleted on backend sync via `REMOVED_DEMO_WORKFLOW_IDS` when `DEMO_AUTOMATION_DEFINITION_REVISION` bumps.

## What happens on lab start

Every backend `initialize()` calls `syncDemoAutomationDefinitions()` **before** inserting missing rows. For each demo id that already exists, the platform **overwrites** name, description, priority, scope, and the full `definition` whenever they differ from `seed.buildDefinition()` in code.

So edits you save in the designer **persist until the next backend restart**, then revert to whatever is in the repo seeds — unless you export and apply (below).

Layout (node positions, viewport) is **preserved** on sync when automation content is unchanged (`labWorkflowDefinitionContentKey`). Committed seeds should include authored layout via `apply:demo-workflow-seeds` so fresh installs match the designer.

## Agent / developer workflow

After you finish testing a demo workflow in the UI:

1. **Export** (read-only JSON report):

   ```bash
   npm run export:demo-workflows -- --slug=webhook-loop
   ```

   Slugs: `crm-sales-approval`, `crm-quotes-approval`, `crm-sales-approval-response`,
   `crm-quotes-approval-response`,    `crm-sales-ledger-post`, `crm-quotes-ledger-post`,
   `timesheet-approval`,    `approval-request-created-notify`, `approval-step-pending-notify`, `polls-published-notify`,
   `webhook-loop` (full list in `demo-workflow-db-sync-manifest.ts`).

   Or `--id=<uuid>` / omit flags for all demo rows present in the DB.

2. **Apply** (writes snapshots + patches seeds):

   ```bash
   npm run apply:demo-workflow-seeds -- --slug=webhook-loop
   ```

   This writes `src/shared/seeds/demo-workflows/snapshots/<slug>.snapshot.ts`, updates catalog **name** and **priority** when possible, and rewires the definition module to build from the snapshot (positions + viewport from DB; `arrangeSeedLayoutIfUnpositioned` only when every node is still at `0,0`).

   Export JSON includes layout by default; pass `--strip-layout` on `export:demo-workflows` for automation-only diffs.

3. Run tests that touch workflows (`npm run test:path demo-workflow`).

**Manifest:** `src/shared/seeds/demo-workflows/demo-workflow-db-sync-manifest.ts` lists ids, slugs, and module names — start here when the user says “update the webhook demo seed from my DB”.

**Env:** `DATABASE_PATH` (default `db/the_lab.db`).

## Related

- Demo pack apply/remove: Settings → App demo data → Workflow Studio (`phase2-platform-demo`).
- Why catalog app packs read "Not present" until that app's server has run: [app-demo-data-seeding.md](app-demo-data-seeding.md).
- Integration bindings export (different tables): `npm run export:integration-seeds`.
