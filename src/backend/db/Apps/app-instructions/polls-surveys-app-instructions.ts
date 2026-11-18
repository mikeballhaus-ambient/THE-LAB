/**
 * Agent instructions for the Polls & Surveys catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const pollsSurveysAppInstructions = `# App System Instructions: Polls & Surveys

## Overview

\`app-polls-surveys\` is a **hybrid** creative catalog app for creating polls and collecting votes. UI: \`src/apps/polls-surveys/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4124**).

## Data model

- **Polls** — question, kind (\`single\` | \`multi\`), status (\`draft\` | \`open\` | \`closed\`), allow-anonymous, **allow-multiple-votes** (\`polls\`). When allow-multiple-votes is false, each voter (platform user id, else voter name) may cast only one vote row.
- **Options** — belong to a poll; label, order (\`poll_options\`).
- **Votes** — poll, option, voter, created-at (\`poll_votes\`). Results (per-option counts) are derived; votes only count while the poll is \`open\`.

## API (app server, REST)

- \`GET /api/polls\` — polls with options + per-option tallies.
- \`POST/DELETE /api/polls[/:id]\`; \`PATCH /api/polls/:id/status\`.
- \`POST/DELETE /api/poll-options[/:id]\`.
- \`POST /api/poll-votes\` — body \`{ pollId, optionId, voter }\`; rejected when the poll is not open.

## Integration (rm-64)

Host \`app-polls-surveys\`, surface \`polls-surveys.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

| Entity | \`entityKey\` | Segment | UI |
|--------|---------------|---------|-----|
| Poll (primary) | \`poll\` | \`polls\` | \`openPrimary*\` |
| Poll option | \`poll-option\` | \`poll-options\` | \`openEntity*('poll-option', { pollId })\` |

### Chart Builder

\`reports.polls-by-status\`, \`reports.polls-by-kind\`. Live result tallies in the options accordion (derived from votes).

### Inline (non-FB)

\`PATCH /api/polls/:id/status\` (open/close); \`POST /api/poll-votes\` while poll is \`open\`.

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-polls-surveys.poll.published\` | status **transitions to** \`open\` (publish) | \`PATCH /api/polls/:id/status\`, \`POST /api/polls\` (create with \`open\`), connector \`polls\` create/update |
| \`app-polls-surveys.poll.closed\` | status **transitions to** \`closed\` | same status paths as above |
| \`app-polls-surveys.poll.results_ready\` | the same close, **and** at least one vote was recorded | same as \`poll.closed\` |

**Publish** is modeled as \`status: open\` (no separate publish flag). Re-opening a closed poll emits \`poll.published\` again. Re-closing a closed poll publishes nothing. An empty close is not "results ready", so only \`poll.closed\` fires when the vote count is 0.

Seeded demo workflow **Polls: notify lab on publish** listens for \`poll.published\` and bell-notifies every demo lab user (cast + admin) with a **Vote now** button that launches Polls & Surveys in **notification focus** mode: only that poll is shown (reports and other polls hidden) with voting controls; **All polls** restores the full workspace.

## UI layout

Reports (two charts) → workspace **Polls**. Each poll is a \`catalog-master-record\`; options, vote actions, and progress bars expand in a collapsed accordion **Options & results**. Optional voter name in the header. Bell **Vote now** uses \`catalogOpenPrimaryRecordId\` + \`useCatalogPrimaryRecordDeepLink\` (\`onDeepLink\` → focus view). See \`docs/apps/catalog-workspace-ui-pattern.md\`.

## Automation scope

- Root class \`polls-surveys-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-polls-surveys',
  displayName: 'Polls & Surveys',
  contextAreaClass: 'polls-surveys-app',
  primaryRecordLabel: 'poll question',
  extraBullets: [
    "Nested **poll options** use the same data attrs; `data-lab-record-name` is the option label.",
  ],
})}

User doc: \`docs/apps/polls-surveys.md\` (create/update when UX changes).
`;
