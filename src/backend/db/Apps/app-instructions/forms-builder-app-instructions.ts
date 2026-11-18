/**
 * App system instructions for Forms Builder (seeded into apps.app_system_instructions).
 * Structure follows src/shared/templates/app-system-instructions.md
 */

import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const formsBuilderInstructions = `# App System Instructions: Forms Builder

## Overview
Forms Builder is a hybrid app (Vue UI + Fastify on port **3011**) for designing dynamic forms: drag-and-drop canvas, validation rules, data connector linking, and publishing schemas consumed by **FormMounter** in host apps (**Task List**, **CRM**, **Help Desk**). Agents create/edit forms and link app connectors (task-list **3005**, CRM **3010**, help-desk **3012**) so host submit flows hit \`/api/connector/*\` on the target app.

## Key UI Components & Layout

### Root Container Structure
\`\`\`html
<div class="forms-builder-app app-loaded-container min-h-full h-full flex flex-col overflow-hidden">
  <header class="lab-app-header">...</header>
  <main class="lab-app-body">
  <!-- Landing: lab-app-kpi dashboard + Forms / Connectors panels -->
  <!-- Header: Refresh (forms-builder-refresh-catalog) reloads forms + connectors after integration wizard -->
  <!-- Home: Manage Forms / Add Data Connector -->
  <!-- OR Forms Management list -->
  <!-- OR Form Designer: metadata + DesignCanvas + Save -->
  <!-- OR Data Connectors management -->
</div>
\`\`\`

### Component Breakdown

**1. App Root (\`forms-builder-app\`)**
- **Purpose**: Scrollable shell for all Forms Builder views
- **Key Elements**: Navigation buttons, view-specific panels

**2. Forms Management**
- **Purpose**: List saved forms; open designer or create new
- **Key IDs (via \`useUniqueElementId()\`)**: \`create-form-btn\`, \`forms-management-heading\`, \`form-designer-back-btn\`

**3. Form Designer**
- **Purpose**: Edit form name/description, canvas layout, properties, connector, save
- **Key IDs**: \`form-name-input\`, \`form-description-input\`, \`save-form-btn\`, \`connector-options-btn\`, \`autopopulate-form-btn\`, \`form-designer-heading\`
- **DesignCanvas**: Toggle **Preview Form** vs grid; preview uses \`form-layout-preview\`; canvas uses \`GridCanvas\`

**4. Data Connectors**
- **Purpose**: Register connector discovery URLs for host apps (examples: task-list \`:3005/api/connector/discovery\`, CRM \`:3010/api/connector/discovery/{entityKey}\`, help-desk \`:3012/api/connector/discovery/ticket\`)

### SearchPattern Table for Agents for UI Automation Tool:
- **Discovery**: Prefer \`contextArea\`: \`forms-builder-app\`. Use \`app-list-container\` or \`lab-app-catalog-sidebar\` only to **launch**. Avoid \`app-loaded-container\` alone when multiple apps are visible (shared with Lab render container).
- **Actions**: \`ui_automation_element_action\` with CSS selectors from discovery (prefer discovered \`id\` attributes).

| Area | Class Name / ID | Purpose |
|------|-----------------|---------|
| Mount root | \`#app-app-forms-builder\` | Platform Vue mount wrapper |
| App Root | \`forms-builder-app\` | Entire Forms Builder UI (best scope) |
| Launch (dashboard) | \`app-list-container\` / \`lab-app-catalog-sidebar\` | \`[data-appname="forms builder"]\` — grid or \`lab-catalog-sidebar-launch\` |
| Create Form | \`create-form-btn\` (generated id prefix) | Start new form workflow |
| Save Form | \`save-form-btn\` | Persist schema to Forms Builder DB |
| Form Name | \`form-name-input\` | Edit display name |
| Designer Canvas | \`form-layout-preview\` / grid canvas | Layout preview or edit |
| Connectors | \`connectors-management-heading\` | Connector admin view |

## Visual Flowchart

### UI Flow
\`\`\`mermaid
flowchart TD
    Launch[Launch Forms Builder] --> Home[Home actions]
    Home --> Manage[Forms Management]
    Home --> Connectors[Data Connectors]
    Manage --> Designer[Form Designer]
    Designer --> Save[Save form schema]
    Save --> Host[Validate in host app e.g. Task List]
\`\`\`

### Back-end Flow
\`\`\`mermaid
flowchart TD
    UI[Forms Builder UI] --> API[Forms Builder API :3011]
    API --> DB[(forms-builder app SQLite)]
    Host[Host app FormMounter] --> Load[GET /api/v1/forms/load/:key]
    Host --> Post[POST /api/v1/forms/submit/:key]
    Post --> Connector[App connector CRUD e.g. task-list :3005]
\`\`\`

## Unique Workflows
- **Save before use**: Forms must be saved in designer before host apps can load them by key.
- **Connector link**: Form must reference a data connector (e.g. task-list) for submit/load in host apps.
- **Validation**: Required rules sync to \`validationRules\` and component metadata; runtime enforced in FormMounter.

## Common Pitfalls & Warnings
- **Discovery scope**: With multiple Lab apps open, use \`contextArea: forms-builder-app\`, not bare \`app-loaded-container\`.
- **Dual Lab view**: App may be visually blurred when **Laboratory** is focused; UI automation still discovers visible elements under \`forms-builder-app\`.
- **Generated IDs**: Always re-discover after navigation; do not hard-code full element ids — match prefix from \`generateUniqueId('save-form-btn')\` etc.
- **Preview toggle**: Designer preview is non-functional for submit; validate end-to-end in the **target host app** (Task List, CRM, Help Desk) after linking the connector.

## Success Indicators
- **Save form** → Toast or no error; form appears in Forms Management list.
- **Link connector** → Connector options show linked app; host app FormMounter load/submit succeeds.

## FAQs & Agent Guidance

Use MCP tools \`ui_automation_discover_elements\` and \`ui_automation_element_action\`.

**Question: "Launch Forms Builder"**
- \`ui_automation_discover_elements\` with \`contextArea: "app-list-container"\` (or \`lab-app-catalog-sidebar\` when workspace tabs are open); \`ui_automation_element_action\` click \`[data-appname="forms builder"]\`.

**Question: "Create and save a test form"**
- Click \`create-form-btn\`; complete designer metadata; add fields on canvas; click \`save-form-btn\`; confirm form key in management list.

**Question: "Link task-list connector"**
- Data Connectors → register task-list discovery (port **3005**); assign to Task List form keys (\`form-keys.ts\` in task-list app).

**Question: "Link CRM or Help Desk connector"**
- CRM: per-entity discovery e.g. \`http://localhost:3010/api/connector/discovery/contacts\`; Help Desk ticket: \`http://localhost:3012/api/connector/discovery/ticket\`. Publish form keys used by CRM bindings or Help Desk \`TICKET_FORM_KEY\`.

## Unique Class Names for Agent Identification
- \`forms-builder-app\` — root
- \`form-layout-preview\` — designer preview surface
- \`form-layout-preview-grid\` — preview form grid



${formatCatalogHostRecordAutomationSection({
  appId: 'app-lab-formsbuilder',
  displayName: 'Forms Builder',
  contextAreaClass: 'forms-builder-app',
  primaryRecordLabel: 'form name',
  extraBullets: [
    "Form list edit/delete uses `formKey` as `data-lab-record-id` and form **name** as `data-lab-record-name`.",
    "Connector cards use connector id + **entity name** on edit/delete.",
  ],
})}

## Component Hierarchy Diagram
\`\`\`mermaid
flowchart TD
    forms-builder-app --> management[Forms Management]
    forms-builder-app --> designer[Form Designer]
    forms-builder-app --> connectors[Data Connectors]
    designer --> DesignCanvas
    DesignCanvas --> preview[form-layout-preview]
    DesignCanvas --> grid[GridCanvas]
\`\`\``;
