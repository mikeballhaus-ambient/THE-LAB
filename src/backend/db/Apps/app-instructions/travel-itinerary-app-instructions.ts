/**
 * Agent instructions for the Travel Itinerary catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const travelItineraryAppInstructions = `# App System Instructions: Travel Itinerary

## Overview

\`app-travel-itinerary\` is a **hybrid** productivity catalog app for planning trips. UI: \`src/apps/travel-itinerary/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4111**).

## Data model

- **Trips** — name, destination, start/end dates, notes (\`travel_trips\`).
- **Itinerary items** — belong to a trip; kind (\`flight\` | \`hotel\` | \`activity\` | \`transport\` | \`other\`), title, times, location, confirmation (\`travel_items\`).

## API (app server, REST)

- \`GET /api/travel/trips\` — trips with nested items.
- \`POST/PUT/DELETE /api/travel/trips[/:id]\`.
- \`POST/PUT/DELETE /api/travel/items[/:id]\`.

## Integration (rm-64)

Host \`app-travel-itinerary\`, surface \`travel-itinerary.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`. Manifest/bindings **:3000**; connectors on **\`props.serverUrl\`**.

### Forms Builder

| Entity | \`entityKey\` | Segment | UI |
|--------|---------------|---------|-----|
| Trip (primary) | \`trip\` | \`trips\` | \`openPrimary*\` |
| Itinerary item | \`itinerary-item\` | \`itinerary-items\` | \`openEntity*('itinerary-item', { tripId })\` |

Trip **Start date** / **End date** use manifest \`dateOnly: true\` (calendar-only). Item **Starts** / **Ends** use **date+time** DatePicker (local \`YYYY-MM-DDTHH:mm:ss\` on save).

### Chart Builder

\`reports.trips-by-destination\` (bar). \`reports.itinerary-by-kind\` (doughnut): count of itinerary items by \`kind\` (flight, hotel, transport, activity, other).

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-travel-itinerary.trip.scheduled\` | a trip **gains both** \`startDate\` and \`endDate\` (on create, or on the update that completes the pair) | \`POST /api/travel/trips\`, \`PUT /api/travel/trips/:id\` |

A later edit to an already-dated trip publishes nothing. Itinerary items do not affect scheduling.

## Workspace UI

- Each trip card shows trip actions (Add item, edit, delete). **Itinerary items** use a single **accordion toggle** per trip (collapsed by default), matching OKR key results — header shows count \`Itinerary items (N)\`.

## Automation scope

- Root class \`travel-itinerary-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming. Item list toggle: \`travel-items-toggle-{tripId}\`.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-travel-itinerary',
  displayName: 'Travel Itinerary',
  contextAreaClass: 'travel-itinerary-app',
  primaryRecordLabel: 'trip name',
  extraBullets: [
    "Itinerary **line items** use attrs with the item title as `data-lab-record-name`.",
  ],
})}

User doc: \`docs/apps/travel-itinerary.md\` (create/update when UX changes).
`;
