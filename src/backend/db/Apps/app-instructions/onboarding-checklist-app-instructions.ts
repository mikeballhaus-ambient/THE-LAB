/**
 * Agent instructions for the Onboarding Checklist catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const onboardingChecklistAppInstructions = `# App System Instructions: Onboarding Checklist

## Overview

\`app-onboarding-checklist\` is a **hybrid** learning catalog app for onboarding checklists with per-hire task tracking. UI: \`src/apps/onboarding-checklist/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4119**).

## Data model

- **Checklists** — one per new hire (name, role, start date) (\`onboarding_checklists\`).
- **Tasks** — belong to a checklist; title, owner, optional due date (\`YYYY-MM-DD\`), status (\`todo\` | \`doing\` | \`done\`), order (\`onboarding_tasks\`). Checklist progress is derived (done / total).

## API (app server, REST)

- \`GET /api/onboarding\` — checklists with nested tasks + progress.
- \`POST/DELETE /api/onboarding[/:id]\`.
- \`POST/DELETE /api/onboarding-tasks[/:id]\`; \`PATCH /api/onboarding-tasks/:id/status\`.

## Integration (rm-64)

Host \`app-onboarding-checklist\`, surface \`onboarding-checklist.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

| Entity | \`entityKey\` | Segment | UI |
|--------|---------------|---------|-----|
| Checklist (primary) | \`checklist\` | \`checklists\` | \`openPrimary*\` |
| Onboarding task | \`onboarding-task\` | \`onboarding-tasks\` | \`openEntity*('onboarding-task', { checklistId })\` |

### Chart Builder

\`reports.checklists-by-role\`.

### Inline (non-FB)

Task status cycle: \`PATCH /api/onboarding-tasks/:id/status\`.

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-onboarding-checklist.onboarding.completed\` | closing the **last** open task makes every sibling \`done\` | \`PATCH /api/onboarding-tasks/:id/status\` |
| \`app-onboarding-checklist.task.overdue\` | open task is one+ days past \`dueDate\` | **platform requirement sweep** (not a route) |

There is no checklist-level status. Completion is inferred from the sibling set and published **once**, after the whole set is evaluated — never per task in a batch. Re-saving a \`done\` task publishes nothing.

## UI layout

Reports (two charts) → checklist masters with accordion **Onboarding tasks**. **Complete:** button above the task list marks the next open task \`done\` (first by order with status ≠ \`done\`); hide empty due dates. Notifications use the **lab shell** top-center toast only — do not mount \`<Toast>\` in the app. Accordion: PrimeVue 4 \`:value\` / \`@update:value\` + \`useCatalogSingleAccordion()\`. See \`docs/apps/catalog-workspace-ui-pattern.md\`.

## Automation scope

- Root class \`onboarding-checklist-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-onboarding-checklist',
  displayName: 'Onboarding Checklist',
  contextAreaClass: 'onboarding-checklist-app',
  primaryRecordLabel: 'checklist (new hire name)',
  extraBullets: [
    "Nested **tasks** use task title as `data-lab-record-name` (`onboarding-task` id prefix).",
  ],
})}

User doc: \`docs/apps/onboarding-checklist.md\` (create/update when UX changes).
`;
