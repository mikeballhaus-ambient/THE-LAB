/**
 * Agent instructions for the Rental Property catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const rentalPropertyAppInstructions = `# App System Instructions: Rental Property

## Overview

\`app-rental-property\` is a **hybrid** utilities catalog app for managing rental properties, tenants, and rent. UI: \`src/apps/rental-property/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4122**).

## Data model

- **Properties** — name, address, monthly rent (stored in **cents**), status (\`vacant\` | \`occupied\` | \`maintenance\`) (\`rental_properties\`).
- **Leases** — belong to a property; tenant, start/end dates, status (\`active\` | \`ended\` | \`pending\`) (\`rental_leases\`).
- **Rent payments** — belong to a lease; period month (YYYY-MM), amount (cents), status (\`due\` | \`paid\` | \`late\`), paid-at (\`rental_payments\`).

## API (app server, REST)

- \`GET /api/rental/properties\` — properties with nested leases + payments.
- \`POST/DELETE /api/rental/properties[/:id]\`.
- \`POST /api/rental/leases\`; \`POST /api/rental/payments\`; \`PATCH /api/rental/payments/:id/pay\`.

## Integration (rm-64)

Host \`app-rental-property\`, surface \`rental-property.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

| Entity | \`entityKey\` | Segment | UI |
|--------|---------------|---------|-----|
| Property (primary) | \`property\` | \`properties\` | \`openPrimary*\` |
| Lease | \`lease\` | \`leases\` | \`openEntity*('lease', { propertyId })\` |
| Rent payment | \`rent-payment\` | \`rent-payments\` | \`openEntity*('rent-payment', { leaseId, propertyId })\` — connector entity **RentPayment**; dialogs titled **Create/Edit rent payment** |

**Mark paid**: inline \`PATCH /api/rental/payments/:id/pay\` (not FB). Amounts in **cents**.

### Chart Builder

\`reports.properties-by-status\`, \`reports.payments-by-status\`.

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-rental-property.rent.due\` | a payment status **transitions to** \`due\` | \`PATCH /api/rental/payments/:id/status\` |

\`PATCH /api/rental/payments/:id/status\` accepts \`due\` | \`paid\` | \`late\`. Only entry to \`due\` publishes — \`late\` is a date comparison delivered by the platform sweep, and \`:id/pay\` remains the one-way shortcut to \`paid\`.

## UI layout

Reports (two charts) → workspace **Properties**. Each property is a \`catalog-master-record\`; leases and rent payments expand in a collapsed accordion **Leases & rent** (nested \`lab-form-section--nested\` per lease). See \`docs/apps/catalog-workspace-ui-pattern.md\`.

## Automation scope

- Root class \`rental-property-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-rental-property',
  displayName: 'Rental Property',
  contextAreaClass: 'rental-property-app',
  primaryRecordLabel: 'property address',
  extraBullets: [
    "Nested **leases** use tenant name on `data-lab-record-name` (`rental-lease` prefix).",
  ],
})}

User doc: \`docs/apps/rental-property.md\` (create/update when UX changes).
`;
