/**
 * Agent instructions for the Suggestion Box catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const suggestionBoxAppInstructions = `# App System Instructions: Suggestion Box

## Overview

\`app-suggestion-box\` is a **hybrid** productivity catalog app for collecting and upvoting team ideas. UI: \`src/apps/suggestion-box/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4115**).

## Data model

- **Suggestions** — title, body, author, status (\`open\` | \`planned\` | \`in-progress\` | \`done\` | \`declined\`), votes (\`suggestions\`). Listed by most votes.

## API (app server, REST)

- \`GET /api/suggestions\`.
- \`POST/PUT/DELETE /api/suggestions[/:id]\`.
- \`POST /api/suggestions/:id/vote\` — body \`{ delta: 1 | -1 }\` (votes clamped at 0).

## Integration (rm-64)

Host \`app-suggestion-box\`, surface \`suggestion-box.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

Suggestion (primary): \`entityKey\` \`suggestion\`, segment \`suggestions\` — \`openPrimary*\`.

### Chart Builder

\`reports.suggestions-by-status\` and \`reports.suggestions-by-vote\` (bar: vote totals per suggestion title).

### Inline (non-FB)

\`POST /api/suggestions/:id/vote\` with \`{ delta: 1 | -1 }\`. Reports charts refetch when the list refreshes (\`chartContext.dataRevision\` on \`CatalogAppReportsSection\`).

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-suggestion-box.suggestion.promoted\` | status moves **out of** \`open\` | \`PUT /api/suggestions/:id\` |

Later moves between \`planned\` / \`in-progress\` / \`done\` are not promotions. Intended trigger for ticket or task creation.

## UI layout

Reports (two charts) → flat suggestion list (\`catalog-master-list\` / \`catalog-master-record\` per row with vote controls). See \`docs/apps/catalog-workspace-ui-pattern.md\`.

## Automation scope

- Root class \`suggestion-box-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-suggestion-box',
  displayName: 'Suggestion Box',
  contextAreaClass: 'suggestion-box-app',
  primaryRecordLabel: 'suggestion title',
})}

User doc: \`docs/apps/suggestion-box.md\` (create/update when UX changes).
`;
