/**
 * App system instructions for CRM (seeded into apps.app_system_instructions).
 * Structure follows src/shared/templates/app-system-instructions.md
 */

import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const crmAppInstructions = `# App System Instructions: CRM

## Overview
CRM (\`app-lab-crm\`) is a **hybrid** THE-LAB app (Vue UI + Fastify on port **3010**) with a **metadata-driven** entity store (contacts, leads, sales, service, products, inventory, quotes, plus custom entities). **Demo entity rows** (hero marker \`avery.chen@northwind.example\`) are **replaced on each CRM server start** so manual testing (e.g. \`approvalStatus: pending\`) does not survive relaunching the app; disable via Settings demo-data remove (\`crm_demo_seed_disabled\`) or \`CRM_SKIP_DEMO_SEED=1\`. **Create/edit/delete**, **related tasks**, **related Help Desk tickets**, **platform approvals**, **ledger posting**, and **dashboard charts** use **rm-64 integration bindings** (\`LabIntegrationSurface\`, slot \`crm.{entityKey}.*.dialog\`, \`crm.task.*\`, \`crm.ticket.*\`, \`crm.approval.*\`, \`crm.ledger.*\`, \`reports.*\`) — not hard-coded form keys or nested FormMounter dialogs. Shell: \`surfaceId\` \`crm.workspace\`, regions \`dialogs\` + \`reports.grid\`; Task List / Help Desk submit via \`peerConnectorUrls.taskList\` / \`helpDesk\`; **Approvals & Policies** and **Financial Ledger** use \`peerConnectorUrls.platform\` (**3000** connectors). Record context for approvals: \`subjectAppId: app-lab-crm\`, \`subjectEntityType\` = entity key, \`subjectEntityId\` = record id. Inspect wiring: \`lab_integrations_get_manifest\` + \`lab_integrations_list_bindings\` for \`app-lab-crm\`. Legacy CRM Settings **Form bindings** are deprecated for product UI; provision stubs then upsert bindings. Registry dependencies: **Forms Builder**, **Task List**, **Help Desk**, **Chart Builder** (charts). Peer URLs: \`GET /api/platform/apps/server-urls\` on **3000**.

## Key UI Components & Layout

### Root Container Structure
\`\`\`html
<div id="app-app-crm">
  <div class="crm-app app-loaded-container">
    <header class="crm-app-header">...</header>
    <div class="crm-app-body">
      <aside class="crm-sidebar">...</aside>
      <main class="crm-main">...</main>
    </div>
  </div>
</div>
\`\`\`

### Component Breakdown

**1. App shell (\`crm-app\`, \`crm-app-header\`, \`crm-app-body\`)**
- **Purpose**: Root layout, title, **Settings** button (\`crm-settings-btn\` id prefix).
- **Key Elements**: \`crm-sidebar\` entity navigation; \`crm-main\` hosts dashboard or entity views.

**2. Sidebar (\`crm-sidebar\`)**
- **Purpose**: Switch **Dashboard**, **Tasks**, open **Add new entity**, select entity tabs.
- **Key IDs**: \`crm-nav-dashboard\`, \`crm-nav-tasks\`, \`crm-nav-add-entity\`, \`crm-nav-entity-{entityKey}\` (generated prefixes).

**2b. Tasks (\`crm-tasks-view\`)**
- **Purpose**: List/create/edit CRM-scoped tasks (Task List connector + bindings for entity key \`tasks\`).
- **Key IDs**: \`crm-tasks-view\`, \`crm-new-task-btn\`, \`crm-tasks-table\`, \`crm-create-task-dialog\`, \`crm-edit-task-dialog\`.
- **Form actions**: \`crm-task-form-mounter-primary\` / \`crm-task-form-mounter-cancel\` id prefixes inside dialogs.

**2c. Related tasks on records (\`entity-record-tasks-panel\`)**
- **Where**: **View** and **Edit** record dialogs (\`crm-view-dialog\`, \`crm-edit-dialog\`) below the main entity form.
- **Key IDs**: \`crm-add-record-task-{recordId}\`, \`crm-record-tasks-table-{recordId}\`, \`crm-edit-record-task-{taskId}\`, \`crm-record-task-create-{recordId}\`, \`crm-record-task-edit-{recordId}\`.

**2d. Related tickets (\`entity-record-tickets-panel\`)**
- **Where**: Same view/edit dialogs when Help Desk URL + form bindings for entity key \`tickets\` are available.
- **Key IDs**: \`crm-add-hd-ticket-{recordId}\`, \`crm-record-hd-table-{recordId}\`, \`crm-edit-record-ticket-{ticketId}\`, \`crm-record-hd-ticket-create-{recordId}\`, \`crm-record-hd-ticket-edit-{recordId}\`.
- **Form actions**: \`crm-hd-ticket-form-mounter-primary\` / \`crm-hd-ticket-form-mounter-cancel\` id prefixes.

**2e. Related approvals (\`entity-record-approvals-panel\`)**
- **Where**: Record view/edit related panels + **Sales** / **Quotes** view dialog header quick actions when bindings exist.
- **Platform**: \`peerConnectorUrls.platform\` → :3000 \`lab-approval-requests\` connector.
- **Context**: \`subjectAppId\` = \`app-lab-crm\`, \`subjectEntityType\` = entity key, \`subjectEntityId\` = record id. **Submit** calls \`POST /api/integrations/approval-request/submit\` on the CRM app server (comments only); Workflow Studio demo graphs raise requests with CRM sales/quote policies. **Decide** still uses \`crm.approval.request.decide.dialog\`.

**2f. Ledger (\`entity-record-ledger-panel\`)**
- **Where**: Same related panels; admins see **New account** when \`crm.ledger.account.create.dialog\` is bound.
- **Post entry** presets debit/credit from DEMO-CASH/DEMO-REV or 1000/4000 when accounts exist.

### Integration slots (host \`app-lab-crm\`)

| Slot | Service | Notes |
|------|---------|--------|
| \`crm.approval.request.decide.dialog\` | \`lab-approvals-policies.approval-requests\` | \`requestId\` context |
| \`crm.ledger.entry.post.dialog\` | \`lab-financial-ledger.ledger-entries\` | Demo COA preset |
| \`crm.ledger.account.create.dialog\` | \`lab-financial-ledger.ledger-accounts\` | Admin optional |
| \`reports.ledger.activity\` | \`lab-financial-ledger.ledger-entries\` | Dashboard chart |

Optional registry \`optionalDependencies\`: \`app-lab-approvals-policies\`, \`app-lab-financial-ledger\` (catalog apps not required for CRM bindings).

**3. Dashboard (\`crm-dashboard\`)**
- **Purpose**: Pipeline/service summary cards and charts (\`crm-bar-chart\`).
- **Key Elements**: \`crm-dashboard-title\` id prefix.

**4. Entity records (\`crm-entity-records-view\`)**
- **Purpose**: List, filter, export, create/edit/view records for one entity.
- **Key Elements**: \`crm-entity-toolbar\`, \`crm-new-record-btn\`, \`crm-export-records-btn\`, \`crm-records-search-input\`, \`crm-records-filter-select\`, \`crm-records-table\`, \`crm-view-record-btn\`, \`crm-convert-lead-btn\` (leads), \`crm-records-empty-state\`, \`crm-records-load-error\`.

**5. Dialogs**
- \`crm-view-dialog\` — **EntityRecordPreviewPanel** (FormMounter layout preview) when an edit form key exists; else \`crm-record-detail-panel\` fallback.
- \`crm-create-dialog\` / \`crm-edit-dialog\` — **EntityFormPanel** (\`crm-entity-form-panel\`) with FormMounter; save/cancel id prefixes \`crm-form-mounter-primary\` / \`crm-form-mounter-cancel\`.
- Edit dialog may also show related **tasks** and **tickets** panels (sections 2c–2d).

**6. Settings (\`crm-settings-dialog\`)**
- **Purpose**: **Entity models** (\`crm-entity-admin\`) and **Form bindings** (\`crm-form-bindings-admin\`).
- **Key Elements**: \`crm-settings-tab-entities\`, \`crm-settings-tab-bindings\`, \`crm-entity-admin-new\`, \`crm-entity-admin-save\`, \`crm-entity-admin-table\`, \`crm-bindings-table\`, \`crm-binding-save\`, \`crm-binding-copy-discovery\`, \`crm-binding-entity\`, \`crm-binding-form-key\`.

### SearchPattern Table for Agents for UI Automation Tool:
- **Discovery**: Prefer \`contextArea\`: \`crm-app\` (scopes to CRM UI). Use \`app-list-container\` or \`lab-app-catalog-sidebar\` only to **launch** (\`[data-appname="CRM"]\`). Avoid \`app-loaded-container\` alone when multiple apps are running — the Lab \`#render-container\` also uses that class.
- **Actions**: \`ui_automation_element_action\` with \`target\` selectors from discovery (prefer discovered \`id\`).

| Area | Class Name / ID | Purpose |
|------|-----------------|---------|
| Mount root | \`#app-app-crm\` | Platform Vue mount wrapper |
| App root | \`crm-app\` | Whole CRM UI (best discovery scope) |
| Header | \`crm-app-header\` | Title and Settings |
| Sidebar | \`crm-sidebar\` | Dashboard + entity nav |
| Add entity (nav) | \`crm-nav-add-entity-btn\` | Opens settings → new entity |
| Main content | \`crm-main\` | Dashboard or entity view |
| Dashboard | \`crm-dashboard\` | Home metrics/charts |
| Entity list | \`crm-entity-records-view\` | Records workspace |
| New record | \`crm-new-record-btn\` | Create dialog |
| Table | \`crm-records-table\` | DataTable rows |
| Search | \`crm-records-search-input\` | Client filter |
| Export | \`crm-export-records-btn\` | CSV export |
| View record | \`crm-view-record-btn\` | Read-only dialog |
| Convert lead | \`crm-convert-lead-btn\` | Lead → sale |
| Form panel | \`crm-entity-form-panel\` | Entity create/edit FormMounter |
| Tasks nav | \`crm-nav-tasks\`, \`crm-tasks-view\` | CRM-scoped task list |
| Record tasks | \`crm-add-record-task-*\` | Task FormMounter on record |
| Record tickets | \`crm-add-hd-ticket-*\` | Ticket FormMounter on record |
| Peer URL retry | \`crm-peer-urls-retry\` | Reload dependency URLs from port 3000 |
| Entity admin | \`crm-entity-admin\` | Custom entity definitions |
| New entity (admin) | \`crm-entity-admin-new\` | Create definition |
| Form bindings | \`crm-form-bindings-admin\` | Map entity → form key (\`tasks\`, \`tickets\`, CRM entities) |
| Settings dialog | \`crm-settings-dialog\` | Admin modal shell |
| Launch (dashboard) | \`app-list-container\` / \`lab-app-catalog-sidebar\` | \`[data-appname="CRM"]\` — grid or \`lab-catalog-sidebar-launch\` |

## Visual Flowchart

### UI Flow
\`\`\`mermaid
flowchart TD
    Launch[Launch app-crm] --> Shell[crm-app shell]
    Shell --> Nav{Sidebar}
    Nav --> Dash[crm-dashboard]
    Nav --> Entity[crm-entity-records-view]
    Entity --> New[crm-new-record-btn]
    New --> Form[crm-entity-form-panel FormMounter]
    Form --> Submit[Forms Builder submit to CRM connector]
    Submit --> Refresh[Table refresh / socket crm-entity-records-changed]
    Shell --> Settings[crm-settings-btn]
    Settings --> Admin[crm-entity-admin / crm-form-bindings-admin]
\`\`\`

### Back-end Flow
\`\`\`mermaid
flowchart TD
    UI[CRM Vue UI :3010] --> API[CRM Fastify API]
    API --> AppDB[(crm app SQLite)]
    FormMounter --> Load[GET Forms Builder /api/v1/forms/load/:key]
    FormMounter --> Post[POST Forms Builder /api/v1/forms/submit/:key]
    Post --> Connector[CRM /api/connector/* routes]
    Connector --> AppDB
\`\`\`

## Unique Workflows
- **Create/edit record:** Integration dialogs (\`crm.{entity}.create|edit.dialog\`) → Forms Builder → CRM connector CRUD on port **3010**. **Edit** dialogs and the **View** action show **Related tasks** / **Help desk tickets** below the record (not on the form stub itself).
- **Lead convert:** \`crm-convert-lead-btn\` → confirm → \`POST /api/leads/:id/convert\` (lead must not already be converted).
- **Custom entity:** Settings → **Entity models** → **New entity**; platform auto-provisions rm-64 dialog stubs/bindings (same as built-ins). Legacy **Form bindings** tab still supports manual \`form_key\` overrides.
- **Form keys:** Convention \`crm-{entityKey}-create|edit\` — see \`src/apps/lab-crm/docs/form-keys.md\` and \`entity-form-keys.ts\`.
- **Realtime:** Lists may refresh on Socket.IO \`crm-entity-records-changed\`.

## Common Pitfalls & Warnings
- **Timing**: Wait for \`crm-records-table\` or dashboard load to finish; avoid clicking **New** while \`crm-records-load-error\` is shown.
- **Ports**: CRM REST **3010**; Forms Builder **3011**; Task List **3005**; Help Desk **3012**. Peer URLs come from main backend **3000** (\`/api/platform/apps/server-urls\`), not the CRM app port.
- **Discovery scope**: With multiple Lab apps open, use \`contextArea: crm-app\`, not bare \`app-loaded-container\`.
- **Dual Lab view**: Apps workspace may be blurred when **Laboratory** (full-screen chat) is focused; automation still finds elements if visible in DOM.
- **Generated IDs**: Re-discover after dialogs open; match id **prefixes** from \`useUniqueElementId()\`, not hard-coded full ids.
- **Dependency tab**: Forms Builder may be hidden unless **Show Dependency Apps** is on; designer may still run in background.
- **Connectors**: Forms must link to CRM discovery URLs — \`src/apps/lab-crm/docs/connector-registration.md\`.
- **Deletes**: Referenced records may return **409** from connector/REST delete.
- **Roles**: Admin gates not fully enforced — \`src/apps/lab-crm/docs/crm-security.md\`.

## Success Indicators
- **New / Edit record** → success toast; row appears or updates in \`crm-records-table\`.
- **Convert lead** → toast; lead \`status\` shows converted.
- **Entity admin save** → new entity appears in \`crm-sidebar\` nav.
- **Form binding save** → row in \`crm-bindings-table\`; create form loads in FormMounter.
- **Health** → \`GET {serverUrl}/health\` OK after server launch.

## FAQs & Agent Guidance

Use MCP \`ui_automation_discover_elements\` and \`ui_automation_element_action\`.

**Question: "Launch CRM"**
- Discover \`contextArea\`: \`app-list-container\` (or \`lab-app-catalog-sidebar\` if workspace tabs are open); click Launch via \`[data-appname="CRM"]\` / \`lab-catalog-sidebar-launch\`.
- Ensure dependencies **Forms Builder**, **Task List**, and (for tickets) **Help Desk** can start; CRM blocks main UI if FB or Task List URL is missing.

**Question: "Open Contacts and create a record"**
- Discover \`contextArea\`: \`crm-app\`; \`searchPattern\`: \`crm-nav-entity-contacts\` or button label **Contacts**.
- Click \`crm-new-record-btn\`; discover form in \`crm-entity-form-panel\`; submit via primary form action id prefix \`crm-form-mounter-primary\`.

**Question: "Open CRM settings / add custom entity"**
- Click Settings (\`crm-settings-btn\` prefix) or sidebar **Add new entity**.
- In \`crm-settings-dialog\`, use **Entity models** tab; \`crm-entity-admin-new-btn\` to create definition.

**Question: "Register CRM connector in Forms Builder"**
- Forms Builder → Data Connectors; discovery URL e.g. \`http://localhost:3010/api/connector/discovery/contacts\` (see connector-registration doc).

**Question: "Map form keys"**
- CRM Settings → **Form bindings** (\`crm-form-bindings-admin\`) or \`POST /api/form-bindings\` after publishing forms. Bind entity \`tasks\` to Task List forms; entity \`tickets\` to Help Desk ticket form (\`form_1791054325120_stz7jkl\`).

**Question: "Add a support ticket on a sales record"**
- Open entity → **View** or **Edit** row → section **Related support tickets** → \`crm-add-hd-ticket-{recordId}\` → submit via \`crm-hd-ticket-form-mounter-primary\` prefix.

**Question: "Add a task on a record"**
- **View/Edit** dialog → **Related tasks** → \`crm-add-record-task-{recordId}\` → \`crm-task-form-mounter-primary\` prefix.



${formatCatalogHostRecordAutomationSection({
  appId: 'app-lab-crm',
  displayName: 'CRM',
  contextAreaClass: 'crm-app',
  primaryRecordLabel: 'entity record',
  extraBullets: [
    "Entity grid **Edit** uses the first visible column value as `data-lab-record-name` (see `recordLabelFromRow`).",
    "Scope discovery to `crm-entity-records-view` when working a single entity list.",
  ],
})}

## Unique Class Names for Agent Identification
- \`crm-app\` — CRM root (preferred automation scope)
- \`crm-sidebar\` — Entity navigation
- \`crm-main\` — Active view host
- \`crm-dashboard\` — Home dashboard
- \`crm-entity-records-view\` — Entity list workspace
- \`crm-entity-form-panel\` — FormMounter in create/edit dialogs
- \`crm-entity-admin\` — Entity model editor (settings)
- \`crm-form-bindings-admin\` — Form key registry (settings)
- \`crm-settings-dialog\` — Settings modal

## Component Hierarchy Diagram
\`\`\`mermaid
flowchart TD
    CrmApp[crm-app] --> Header[crm-app-header]
    CrmApp --> Body[crm-app-body]
    Body --> Sidebar[crm-sidebar]
    Body --> Main[crm-main]
    Main --> Dash[crm-dashboard]
    Main --> Records[crm-entity-records-view]
    Records --> Table[crm-records-table]
    Records --> Dialogs[crm-create-dialog / crm-edit-dialog]
    Dialogs --> Panel[crm-entity-form-panel]
\`\`\``;
