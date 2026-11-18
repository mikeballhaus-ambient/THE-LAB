/**
 * Agent instructions for the Home Maintenance Log catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const homeMaintenanceAppInstructions = `# App System Instructions: Home Maintenance Log

## Overview

\`app-home-maintenance\` is a **hybrid** utilities catalog app for logging home maintenance tasks and history. UI: \`src/apps/home-maintenance/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4121**).

## Data model

- **Assets** — home systems/items (name, category, location, notes) (\`home_assets\`).
- **Maintenance tasks** — belong to an asset; title, due date, status (\`scheduled\` | \`due\` | \`done\` | \`skipped\`), priority (\`low\` | \`normal\` | \`high\`), optional **cost (USD)**, completed-at (\`home_maintenance_tasks\`).

## API (app server, REST)

- \`GET /api/home/assets\` — assets with nested tasks.
- \`POST/DELETE /api/home/assets[/:id]\`.
- \`POST/DELETE /api/home/tasks[/:id]\`; \`PATCH /api/home/tasks/:id/status\`.

## Integration (rm-64)

Host \`app-home-maintenance\`, surface \`home-maintenance.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

| Entity | \`entityKey\` | Segment | UI |
|--------|---------------|---------|-----|
| Maintenance task (primary) | \`maintenance-task\` | \`maintenance-tasks\` | \`openPrimary*\` (header **New task**) |
| Home asset | \`home-asset\` | \`home-assets\` | \`openEntity*\` (no parent context) |

Task **status** updates: \`PATCH /api/home/tasks/:id/status\` (not FB). In the UI, **Complete:** + next open task (first \`scheduled\` or \`due\` by due-date order) marks that row \`done\`; skipped/done rows are not auto-completed. Status badges in the list are read-only — no per-row status cycle control. Shell toast only (no app \`<Toast>\`).

### Chart Builder

\`reports.tasks-by-status\`, \`reports.tasks-by-priority\`, \`reports.cost-by-asset\` (sum of optional \`cost\` grouped by asset name).

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## UI layout

Reports (three charts on one row) → workspace **Assets & tasks**. Each asset is a \`catalog-master-record\`; tasks expand in a collapsed accordion **Maintenance tasks** with a **Complete:** outlined button above a \`catalog-accordion-item-list\` task table (column headers, optional cost column, priority badges). See \`docs/apps/catalog-workspace-ui-pattern.md\` and AGENTS.md §17.

## Automation scope

- Root class \`home-maintenance-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-home-maintenance',
  displayName: 'Home Maintenance',
  contextAreaClass: 'home-maintenance-app',
  primaryRecordLabel: 'asset name',
  extraBullets: [
    "Maintenance **tasks** on an asset use attrs with the task title.",
  ],
})}

User doc: \`docs/apps/home-maintenance.md\` (create/update when UX changes).
`;
