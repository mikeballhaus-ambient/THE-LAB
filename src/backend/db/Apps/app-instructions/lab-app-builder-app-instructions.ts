/**
 * App system instructions for App Builder catalog (seeded into apps.app_system_instructions).
 */

export const labAppBuilderCatalogAppInstructions = `# App System Instructions: App Builder

## Overview

App Builder (\`app-lab-app-builder\`) is a **browser** catalog app (no app server port). It provides a **guided 5-step wizard** (name → describe → catalog section → icon → review) and embeds the same flow in **Settings → Administration → App Builder**.

The app **mounts no integration host**. Catalog tag CRUD lives in **Settings → Catalog tags** (\`AppCatalogTagsManagement\`), so the app only *reads* tags to populate the wizard's "Catalog section" question. \`APP_BUILDER_INTEGRATION_MANIFEST\` still declares \`catalog-tag.*\` slots; those are served by the **Settings** host.

Scaffolding and registry changes use **App Management MCP** (\`app_management_*\`) **only after** the user and agent agree on scope. Deep \`src/apps/**\` source edits belong in full **Laboratory** (Code persona), not Sidecar-only flows.

Docs: \`docs/platform/lab-app-builder.md\`, \`docs/platform/lab-sidecar.md\`.

## Shell layout

\`\`\`html
<div class="lab-app-builder-app app-loaded-container lab-app-body">
  <!-- LabAppBuilderWizard only; catalog tag admin is Settings → Administration -->
</div>
\`\`\`

Platform catalog tag **CRUD** for the home grid lives in **Settings → Catalog tags** only. It is deliberately **not** duplicated in this app: after clicking Continue in the wizard, the **Lab Assistant** proposes or creates tags via \`catalogTags\` / \`catalogTagIds\` on \`app_management_create_app\`.

## Wizard → Sidecar handoff

1. User completes the wizard and clicks **Continue with Lab Assistant**.
2. Shell bridge: **new chat session tab** (does not reuse the current session), Sidecar **panel expands**, session persona **Code** (Chat cannot \`app_management_create_app\`), \`toolProfile: app_builder\`, apps workspace focused.
3. Wizard steps: **Name → Describe → Catalog section → Icon → Review**. Catalog section loads live platform tags (\`GET /api/platform/app-tags\`) or **Recommend for me** (agent proposes tags during consultation).
4. First message is formatted with marker \`[THE-LAB App Builder — new app consultation]\` plus draft name, \`faIcon\`, description, and catalog tag choice.

**Catalog tags on scaffold:** Pass \`catalogTags\` or \`catalogTagIds\` (primary first) on **\`app_management_create_app\`** — missing platform sections are **created** and the app is **linked** automatically. If the user picked a section in the wizard, include that id (and label when new). **Recommend for me:** propose tag(s) in chat, then pass them on create. Use \`PUT /api/platform/apps/catalog-tags\` only to change tags later.

## Sidecar tool profile (\`app_builder\`)

- Allowed: \`app_management_*\`, \`ui_automation_*\`, \`awaiter\`
- Not allowed: file/repo MCP (\`read_file\`, \`update_file\`, etc.) — direct users to **Open Laboratory** for code work.

Owners/admins only (\`create-apps\` / \`app_management_create_app\` enforcement).

## Typical agent flow

1. User sends consultation message from the wizard (or opens Sidecar manually with \`app_builder\` profile).
2. Agent is on **Code** (shell default). If not, **\`persona_manager_switch_persona\` → Code** is the first action — before discovery or scaffold.
3. Agent **does not** call \`app_management_create_app\` yet — runs discovery: refine name/description/icon, **catalog tag(s)**, workflows, app type, proposed \`app-*\` id, collision check via \`app_management_get_apps\`.
4. Agent presents a summary and asks for **explicit approval** to scaffold.
5. After approval: \`app_management_create_app\` / \`update_app\` / per-app DB helpers as needed.
6. Optional: UI automation to launch the new app from the catalog.
7. Implementation in Vue/server → **Open Laboratory** (Code persona; Sidecar has no file MCP).

## Do not reinvent the wheel (mandatory after scaffold)

Before proposing custom UI or new platform patterns, **inventory what already exists**:

1. **\`app_management_get_apps\`** — enabled catalog apps, types, ports, \`dependencies\`.
2. **Peer app system instructions** — CRM, Help Desk, Task List, Forms Builder, Chart Builder, Financial Ledger, Workflow Studio, Approvals, etc. (patterns for hybrid hosts, permissions, connectors).
3. **\`docs/platform/lab-app-integrations.md\`** — manifests, slots, bindings, stubs, provider apps.

During **consultation**, call out which existing apps can be **dependencies** or **integration providers** instead of rebuilding the same capability inside the new app.

## Forms: always Forms Builder + rm-64 (not inline host forms)

After the template scaffold exists, **do not** implement product create/edit/delete flows as large hand-written PrimeVue form pages inside the new host app.

**Required pattern (same as Task List, Help Desk, CRM):**

- Host declares **integration manifest** slots (\`form.surface\`, dialog region) and mounts \`LabIntegrationSurface\` / \`openSlot(...)\`.
- **Forms Builder** (\`app-forms-builder\`) is the **provider** — forms, validation layout, submit UX.
- Host **server** exposes **connector** routes (\`/api/connector/...\`, discovery) for CRUD; Forms Builder submits to those endpoints.
- Wire bindings with **\`lab_integrations_*\`** in Laboratory (provision form stub → upsert binding). Set registry **\`dependencies\`** / \`optionalDependencies\` so launch order includes Forms Builder.

Forms Builder is for **layout and appearance** on stubs the integration wizard created — not for replacing the connector + binding model with one-off Vue forms in \`front-end/\`.

## Charts: always Chart Builder + rm-64 (not ad-hoc host charts)

For dashboards, reports, KPI visuals on a **hybrid/server host**:

- **Do not** embed ad-hoc Chart.js (or copy-paste chart components) in the host as the primary reports story.
- Use **Chart Builder** (\`app-lab-chartbuilder\`) via **\`chart.surface\`** slots, \`reports.grid\` (or manifest regions), \`lab_integrations_provision_chart_stub\` + \`lab_integrations_upsert_binding\`.
- Host passes **integration context** (e.g. list id, filters); connector-backed charts load data on the Chart Builder side per \`lab-app-integrations.md\`.
- Charts inherit lab theme via shared chart helpers (\`lab-chart-theme.ts\`) when embedded through integration surfaces — prefer that path over bespoke chart styling in the host.

Exception: trivial **browser-only** demos with no server reports requirement — still prefer Chart Builder when the app will grow into hybrid later.

## Post-scaffold implementation checklist (Laboratory / Code)

1. Add **dependencies** (Forms Builder, Chart Builder, Task List, Help Desk, CRM, Ledger, …) only when the product needs them — not “just in case.”
2. Copy **host shell patterns** from a reference app (e.g. \`task-list\`, \`help-desk\`) — integration surface, connector layout, \`serverUrl\`, unbind handler if bindable.
3. Update the **new app’s** \`app-instructions\` file via App Management when UX or integration behavior changes (\`docs/platform/app-system-instructions.md\`).
4. Never duplicate Financial Ledger, Approvals, or Workflow Studio **platform** capabilities inside a random new app — integrate or link via catalog dependencies and documented APIs.

## Domain events (when the app will publish)

If the product emits lab domain events (Workflow Studio triggers):

1. Scaffold already includes \`shared/lab-domain-events.manifest.ts\` (may start empty).
2. After routes call \`publishLabDomainEvent\`, add manifest rows (label, payload field hints) and register the file in \`domain-event-manifest-index.ts\`.
3. \`npm run verify:domain-event-manifests\` must pass before merge.

See \`docs/platform/lab-domain-events.md\`.

## Agent checklist

1. Registry metadata → **App Management** tools only (not ad-hoc SQL on \`apps\`).
2. Consultation before create when the consultation marker is present.
3. **Forms** → Forms Builder + integration bindings; **charts** → Chart Builder + bindings — not inline host implementations.
4. Research existing apps and \`lab-app-integrations\` before designing new screens.
5. Restart main backend after instruction updates so \`syncSeededAppSystemInstructions()\` refreshes SQLite.
`;
