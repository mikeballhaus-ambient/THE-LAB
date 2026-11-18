/**
 * Agent instructions for the Project Charter catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const projectCharterAppInstructions = `# App System Instructions: Project Charter

## Overview

\`app-project-charter\` is a **hybrid** productivity catalog app for defining a project's charter. UI: \`src/apps/project-charter/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4112**).

## Data model

- **Charter** — title, sponsor, purpose, goals, in-scope, out-of-scope, stakeholders, status (\`draft\` | \`active\` | \`on-hold\` | \`complete\`) (\`charters\`).

## API (app server, REST)

- \`GET /api/charter/charters\`.
- \`POST/PUT/DELETE /api/charter/charters[/:id]\` (connector; UI via Forms Builder).

## Integration (rm-64)

Host \`app-project-charter\`, surface \`project-charter.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

Charter (primary): \`entityKey\` \`charter\`, segment \`charters\` — \`openPrimaryCreate/Edit/Delete\`. Edit form: **Scope**, **Out of scope**, and **Goals** are full-width textareas; **Stakeholders** is a lab-user **MultiSelect** (display names stored on the charter row; user ids in \`stakeholder_user_ids\` for round-trip). Reprovision the charter form stub with \`overwrite: true\` after manifest/layout changes.

### Chart Builder

\`reports.charters-by-status\` (doughnut). \`reports.charters-by-sponsor\` (bar).

### Workspace UI

Charter list uses \`lab-form-section\` cards: title, status pill, sponsor line, purpose as lead. One accordion toggle per charter (**Goals, scope & stakeholders**) reveals all detail sections together (collapsed by default).

### HTTP

\`catalogAppRequest\` (Bearer JWT). Connectors: \`/api/connector/charters\`.

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-project-charter.charter.approved\` | status moves **\`draft\` → \`active\`** | \`PUT /api/charter/charters/:id\` |
| \`app-project-charter.charter.scope_changed\` | \`scope\` or \`outOfScope\` text changed | \`PUT /api/charter/charters/:id\` |

\`approved\` is narrower than "status became active": a later \`active → on-hold → active\` is not an approval. A save that changes only the title publishes nothing.

## Automation scope

- Root class \`project-charter-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-project-charter',
  displayName: 'Project Charter',
  contextAreaClass: 'project-charter-app',
  primaryRecordLabel: 'charter title',
})}

User doc: \`docs/apps/project-charter.md\` (create/update when UX changes).
`;
