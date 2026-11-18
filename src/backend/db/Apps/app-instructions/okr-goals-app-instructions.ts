/**
 * Agent instructions for the OKR / Goals catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const okrGoalsAppInstructions = `# App System Instructions: OKR / Goals

## Overview

\`app-okr-goals\` is a **hybrid** productivity catalog app for tracking quarterly objectives and key results. UI: \`src/apps/okr-goals/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4110**).

## Data model

- **Objectives** — title, owner, quarter (\`okr_objectives\`).
- **Key results** — belong to an objective; baseline → target with a current value and a status (\`not-started\` | \`on-track\` | \`at-risk\` | \`done\`) (\`okr_key_results\`).
- Objective progress is the average of each KR's derived progress (clamped 0–100%).

## API (app server, REST)

- \`GET /api/okr/objectives\` — objectives with nested key results + progress.
- \`POST/PUT/DELETE /api/okr/objectives[/:id]\` — CRUD objectives.
- \`POST/PUT/DELETE /api/okr/key-results[/:id]\` — CRUD key results.

## Integration (rm-64)

Host \`app-okr-goals\`, surface \`okr-goals.workspace\`. Components: \`CatalogIntegrationHost\` + \`CatalogReportsPanel\` in \`App.vue\`. Manifest/bindings on main backend **:3000** (\`lab_integrations_get_manifest\`, \`lab_integrations_list_bindings\`); connectors on **\`props.serverUrl\`**.

### Forms Builder

| Entity | Manifest \`entityKey\` | Connector segment | UI |
|--------|----------------------|-------------------|-----|
| Objective (primary) | \`objective\` | \`objectives\` | \`openPrimaryCreate/Edit/Delete\` |
| Key result | \`key-result\` | \`key-results\` | \`openEntityCreate/Edit/Delete('key-result', { objectiveId })\` |

KR **current** progress: inline \`InputNumber\` + \`PUT /api/okr/key-results/:id\` (not a form slot).

### Chart Builder

Slots: \`reports.kr-by-status\`, \`reports.objectives-by-quarter\` (inline in Reports section).

### HTTP

\`catalogAppRequest\` (Bearer user JWT) for all app API calls.

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-okr-goals.key-result.at_risk\` | a key result status **transitions to** \`at-risk\` | \`PUT /api/okr/key-results/:id\` |
| \`app-okr-goals.objective.completed\` | the last key result of an objective reaches \`done\` (roll-up; objectives have no status column) | \`PUT /api/okr/key-results/:id\` |

Both are transition-guarded: a save that leaves the status or the roll-up unchanged publishes nothing. \`key-result.at_risk\` is the intended trigger for escalation workflows.

## Automation scope

- Root class \`okr-goals-app\`. All controls use \`useUniqueElementId()\`.
- Uses \`lab-*\` theme tokens throughout.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-okr-goals',
  displayName: 'OKR Goals',
  contextAreaClass: 'okr-goals-app',
  primaryRecordLabel: 'objective title',
  extraBullets: [
    "**Key results** under an objective use the same attrs; `data-lab-record-name` is the KR title.",
  ],
})}

User doc: \`docs/apps/okr-goals.md\` (create/update when UX changes).
`;
