/**
 * App system instructions for Help Desk (seeded into apps.app_system_instructions).
 */

import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const helpDeskAppInstructions = `# App System Instructions: Help Desk

## Overview
Help Desk (\`app-help-desk\`) is a **hybrid** app (Vue UI + Fastify on port **3012**) for support tickets, KPI metrics, list view, and kanban boards. **Create ticket**, **kanban board management**, and **reports charts** are driven by **rm-64 integration bindings** (Forms Builder / Chart Builder), not hard-coded form keys. The shell mounts \`LabIntegrationSurface\` for **ticket dialogs** (\`dialogs\` region) and **reports** (\`reports.grid\`). **Manage boards** opens \`HelpDeskBoardManager\` (list only); create/edit/delete call the same \`LabIntegrationSurface.openSlot(...)\` **dialog** flow as tickets (\`dialogs\` region, \`boardId\` in context for edit/delete). **New ticket** → \`openSlot('ticket.create.dialog')\`. **To see what is wired:** \`lab_integrations_get_manifest\` + \`lab_integrations_list_bindings\` for \`app-help-desk\`. Connectors: \`/api/connector/tickets\`, \`/api/connector/kanban-boards\`; discovery \`/api/connector/discovery/ticket\`, \`/api/connector/discovery/kanban-board\`. Launch deps: **Forms Builder** + **Chart Builder**. Re-upsert kanban bindings with \`placement.regionId: "boards.manage"\` and \`presentation: "inline"\` if they still target \`dialogs\`.

## Key UI Components & Layout

### Root Container Structure
\`\`\`html
<div class="help-desk-app" id="help-desk-root">
  <header>New ticket → integration dialog</header>
  <HelpDeskMetrics> KPI tiles + chart bindings </HelpDeskMetrics>
  <Tabs> List | Board </Tabs>
</div>
\`\`\`

### Integration slots (manifest)
| Slot | Kind | Purpose |
|------|------|---------|
| \`ticket.create.dialog\` | form.surface | New ticket (Forms Builder plugin) |
| \`ticket.edit.dialog\` | form.surface | Edit ticket (\`ticketId\` in context) |
| \`ticket.delete.dialog\` | form.surface | Delete ticket confirm (\`ticketId\` in context) |
| \`kanban.board.create.dialog\` | form.surface | Create board (dialog; same shell as tickets) |
| \`kanban.board.edit.dialog\` | form.surface | Edit board (\`boardId\` in context, dialog) |
| \`kanban.board.delete.dialog\` | form.surface | Delete board confirm (\`boardId\`, dialog) |
| \`reports.by-status\` | chart.surface | Tickets by status |
| \`reports.by-priority\` | chart.surface | Tickets by priority |
| \`reports.queue-funnel\` | chart.surface | Queue funnel |
| \`reports.priority-breakdown\` | chart.surface | Priority breakdown |

### SearchPattern Table for Agents for UI Automation Tool:
- **Discovery**: Prefer \`contextArea\`: \`help-desk-app\` or id prefix \`help-desk-root\`.
- **New ticket**: \`help-desk-new-ticket\` → integration form dialog (discover fields inside dialog; no fixed \`TICKET_FORM_KEY\` in host).

| Area | Class / ID prefix | Purpose |
|------|-------------------|---------|
| App root | \`help-desk-app\` | Whole UI (best scope) |
| New ticket | \`help-desk-new-ticket\` | Open \`ticket.create.dialog\` |
| List tab | \`help-desk-tab-list\` | Ticket table |
| Board tab | \`help-desk-tab-board\` | Kanban |

## Unique Workflows
- **Wire integrations**: \`lab_integrations_provision_form_stub\` + \`lab_integrations_upsert_binding\` for \`ticket.create.dialog\`; chart stubs for each \`reports.*\` slot (see bind-chart playbook).
- **Create ticket**: New ticket → submit integration form → list refreshes.
- **Kanban move**: Board tab → drag card → API patch (no ticket edit dialog in Help Desk yet).

## Common Pitfalls & Warnings
- **Do not** reference \`front-end/config/form-keys.ts\` for runtime wiring — bindings only.
- **Ports**: Help Desk **3012**; Forms Builder **3011**; Chart Builder **3013**; platform integration API **3000**.
- **CRM before Help Desk in rework order**: CRM depends on Help Desk; finish Help Desk bindings before CRM integration rework.

## FAQs & Agent Guidance

**Question: "Set up Help Desk integrations"**
- Manifest host \`app-help-desk\`, service \`help-desk.tickets\`, slots above; provision stubs then upsert bindings; user verifies New ticket + Reports charts.

**Question: "Register connector in Forms Builder"**
- \`src/apps/lab-helpdesk/docs/connector-registration.md\`; discovery \`/api/connector/discovery/ticket\` on **3012**.



${formatCatalogHostRecordAutomationSection({
  appId: 'app-lab-helpdesk',
  displayName: 'Help Desk',
  contextAreaClass: 'help-desk-app',
  primaryRecordLabel: 'ticket subject',
  extraBullets: [
    "Ticket table **Edit** / **Remove** use ticket id + subject.",
  ],
})}

## Unique Class Names for Agent Identification
- \`help-desk-app\` — root
- \`help-desk-view-tabs\` — List / Board tabs
- \`help-desk-kanban\` — Board surface
`;
