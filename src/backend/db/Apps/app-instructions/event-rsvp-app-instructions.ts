/**
 * Agent instructions for the Event Invitations & RSVP catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const eventRsvpAppInstructions = `# App System Instructions: Event Invitations & RSVP

## Overview

\`app-event-rsvp\` is a **hybrid** creative catalog app for creating events and collecting guest RSVPs. UI: \`src/apps/event-rsvp/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4123**).

## Data model

- **Events** — title, description, start/end, location, capacity (\`rsvp_events\`).
- **RSVPs** — guest name, response (\`yes\` | \`no\` | \`maybe\`), headcount, note (\`rsvp_responses\`). Attending count is derived from \`yes\` responses.

## API (app server, REST)

- \`GET /api/rsvp/events\` — events with nested RSVPs + attending count.
- \`POST/DELETE /api/rsvp/events[/:id]\`.
- \`POST/DELETE /api/rsvp/responses[/:id]\`.

## Integration (rm-64)

Host \`app-event-rsvp\`, surface \`event-rsvp.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

| Event (primary) | \`event\` | \`events\` | \`openPrimary*\` — **Starts** / **Ends** are datetime pickers (\`YYYY-MM-DDTHH:mm:ss\`); dialog titles use **event** |
| RSVP response | \`rsvp-response\` | \`rsvp-responses\` | \`openEntity*('rsvp-response', { eventId })\` — **Guest name** is plain text (not lab-user); **Response** Yes/No/Maybe |

Stub layout: \`event-rsvp-form-stub-layout.ts\`. After manifest/layout changes, re-provision FB stubs with **overwrite** (Settings integration tools or seed pack) so dialogs pick up new fields.

### Chart Builder

\`reports.rsvps-by-response\`.

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-event-rsvp.rsvp-response.received\` | a new response row is created | \`POST /api/rsvp/responses\` |

Creation is itself the transition; there is no prior state to compare. Payload includes \`response\` and \`headcount\`.

## UI layout

Reports (two charts) → event masters with accordion **RSVPs**. See \`docs/apps/catalog-workspace-ui-pattern.md\`.

## Automation scope

- Root class \`event-rsvp-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-event-rsvp',
  displayName: 'Event RSVP',
  contextAreaClass: 'event-rsvp-app',
  primaryRecordLabel: 'event title',
  extraBullets: [
    "**RSVP responses** under an event use guest name on `data-lab-record-name` (`rsvp-response` prefix).",
  ],
})}

User doc: \`docs/apps/event-rsvp.md\` (create/update when UX changes).
`;
