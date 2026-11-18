/**
 * App system instructions for Chart Builder (seeded into apps.app_system_instructions).
 */

import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const chartBuilderAppInstructions = `# App System Instructions: Chart Builder

## Overview
Chart Builder (\`app-lab-chartbuilder\`) is a **hybrid** app (Vue designer + Fastify on port **3013**, folder \`src/apps/lab-chartbuilder/\`). Authors define reusable **ChartSchema** records (type, title, legend, layout).

**Agents:** Any stub/bind/unbind work for this host → silent **\`persona_manager_switch_persona\` → Code** first, then **\`lab_integrations_*\`** only (never \`write_query\` on \`lab_integration_bindings\`). Task List report charts (\`reports.*\` on \`app-task-list\`) are separate — do not delete them when rewiring Chart Builder forms.

### Two chart data modes (rm-64)

| Mode | \`dataConnectorId\` | Render |
|------|---------------------|--------|
| **Host-supplied data** | none | \`POST /api/v1/charts/render/:chartKey\` with body \`{ data: ChartDataPayload }\` — host computes segments (legacy seeds, manual embeds). |
| **Connector-backed** | set + \`dataMapping\` / \`allowedFilters\` | Same endpoint with \`{ context: { ... } }\` only — Chart Builder fetches via **data connector** discovery URL and aggregates server-side. |

**Data connectors** live in Chart Builder SQLite (\`data_connectors\`: app/entity + discovery URL). Same discovery contracts as Forms Builder. Rows are created by:

- **Integration wizard** — \`lab_integrations_provision_chart_stub\` (per host \`chart.surface\` slot) creates connector + chart + mapping; binding \`providerRef\` = \`chartKey\`.
- **In-app** — Slots below (Forms Builder bindings); native UI when a slot is unbound.
- **Connectors API** — \`/api/v1/connectors\` + \`/api/connector/data-connectors\` (Forms CRUD); discovery \`/api/connector/discovery/data-connector\`.

Seed charts (\`chart_seed_*\`) are **host-data** samples (no connector). Integration-bound charts on Task List / Help Desk are **connector-backed**.

### Integration slots (\`chart-builder.workspace\` + \`chart-builder.designer\`)

| Slot | Context | Purpose |
|------|---------|---------|
| \`chart.designer.metadata\` | \`chartKey\` | **Primary** chart fields — inline on \`chart-builder.designer\` / region \`designer.forms\` (use for create + edit; opens with preview) |
| \`chart.designer.connector\` | \`chartKey\` | Data source + mapping — inline on same designer surface |
| \`chart.delete.dialog\` | \`chartKey\` | Delete confirm (dialog on \`chart-builder.workspace\` OK) |
| \`chart.connector.create.dialog\` | — | **Add** connector — inline on \`chart-builder.connectors\` / \`connectors.forms\` (Manage data connectors view) |
| \`chart.connector.edit.dialog\` | \`connectorId\` | **Edit** connector — inline on \`chart-builder.connectors\` / \`connectors.edit\` (opened from list **Edit** button) |
| \`chart.connector.delete.dialog\` | \`connectorId\` | Remove connector (dialog on workspace OK) |
### Seeding — this app is a provider that is also a host

\`app-lab-chartbuilder\` is registered in \`GOLDEN_INTEGRATION_PILOT_HOST_IDS\`, so
\`pilot-host-binding-seeds.ts\` binds its three **connector** slots on boot. This matters when
diagnosing "the Edit button shows an unbound-slot hint":

- Chart Builder is in **neither** \`CATALOG_HOST_APP_IDS\` nor \`PLATFORM_CATALOG_HOSTS\`, so the two
  other seeders skip it. Only the pilot seeder covers it, and it builds the discovery contract from
  **this app's own manifest** — \`catalogServiceDescriptor()\` cannot resolve \`chart-builder.*\` and is
  not used here.
- The seeder is **allowlisted** to \`chart.connector.create|edit|delete.dialog\`.
  \`chart.designer.metadata\` and \`chart.designer.connector\` are deliberately **not** seeded: they are
  rendered inline by the app's native \`ChartDesignerForm\`, so a generated stub would replace a
  working editor. A test asserts they stay unbound — do not "fix" that by seeding every
  \`form.surface\`.
- Port matters: the stub's discovery URL is built from the host port, which falls back to **3013**.

### Agent wiring checklist (\`app-lab-chartbuilder\`)

Legacy slots \`chart.create.dialog\`, \`chart.edit.dialog\`, and \`chart.connectors.manage.dialog\` are **removed from the manifest** — do not provision or bind them. Create/edit charts use **designer** slots; **Manage data connectors** is an in-app view only.

| Slot | serviceId | Surface | Region | Presentation |
|------|-----------|---------|--------|----------------|
| \`chart.designer.metadata\` | \`chart-builder.charts\` | \`chart-builder.designer\` | \`designer.forms\` | inline |
| \`chart.designer.connector\` | \`chart-builder.charts\` | \`chart-builder.designer\` | \`designer.forms\` | inline |
| \`chart.delete.dialog\` | \`chart-builder.charts\` | \`chart-builder.workspace\` | \`dialogs\` | dialog |
| \`chart.connector.create.dialog\` | \`chart-builder.data-connectors\` | \`chart-builder.connectors\` | \`connectors.forms\` | inline |
| \`chart.connector.edit.dialog\` | \`chart-builder.data-connectors\` | \`chart-builder.connectors\` | \`connectors.edit\` | inline |
| \`chart.connector.delete.dialog\` | \`chart-builder.data-connectors\` | \`chart-builder.workspace\` | \`dialogs\` | dialog |

\`lab_integrations_provision_form_stub\` returns \`recommendedPlacement\`; \`lab_integrations_upsert_binding\` applies manifest placement automatically when \`config.placement.regionId\` is omitted.

Region \`designer.forms\` sets **\`hideButtons: true\`** in the integration manifest — inline forms omit Save/Cancel; Chart Designer hosts shared actions and calls \`submitInlineRegion('designer.forms')\`.

**Designer stubs:** \`chart.designer.metadata\` and \`chart.designer.connector\` must be **separate** stubs (field subsets). After platform stub-filter changes, re-run \`provision_form_stub\` with **\`overwrite: true\`** for both slots so metadata is not duplicated and \`chartType\` renders as a **Select** (lookup).

Charts entity connector: \`/api/connector/charts\`, discovery \`/api/connector/discovery/chart\`. Depends on \`app-forms-builder\`.

## API
- CRUD: \`/api/v1/charts\`
- Load definition: \`/api/v1/charts/load/:chartKey\`
- Render: \`POST /api/v1/charts/render/:chartKey\` — \`{ data }\` **or** \`{ context }\` (connector charts only)
- Auth: lab app JWT (same as Forms Builder)

## UI
- Root class: \`chart-builder-app\`
- Header **Refresh** reloads chart library after integration provisioning.
- Home → chart library; **Manage data connectors** → dedicated view (add form + registered list with Edit / Verify / Delete). Forms are **bindings-only** (unbound slots show hints).

## UI automation
- **Discovery**: Prefer \`contextArea\`: \`chart-builder-app\`.
- **Launch**: \`[data-appname="Chart Builder"]\` or \`lab-catalog-sidebar-launch\`.



${formatCatalogHostRecordAutomationSection({
  appId: 'app-lab-chartbuilder',
  displayName: 'Chart Builder',
  contextAreaClass: 'chart-builder-app',
  primaryRecordLabel: 'chart name',
  extraBullets: [
    "Charts table uses `chartKey` as record id and chart **name** for search.",
  ],
})}

## Embedding
\`\`\`ts
import { loadChartSchema, ChartRuntime, ChartContextReportWidget } from '@/shared/charts';
// Host-data: pass segments/chartData to ChartReportWidget
// Connector: pass chartKey + chartBuilderUrl + context (e.g. taskListId)
\`\`\`
`;
