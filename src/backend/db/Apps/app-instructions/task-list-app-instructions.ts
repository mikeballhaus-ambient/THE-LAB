/**
 * App system instructions for Task List (seeded into apps.app_system_instructions).
 */

import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const taskListInstructions = `# App System Instructions: Task List


## Overview
Task List is a hybrid app (Vue UI + Fastify on port **3005**) for organizing tasks in named lists. **Create/edit UI** is driven by **rm-64 integration bindings** (Forms Builder / Chart Builder plugins), not hard-coded form keys in the host. The UI mounts \`LabIntegrationSurface\` (\`host-app-id\` \`app-task-list\`, surface \`task-list.workspace\`); **New List**, **New Task**, and edit actions call \`openSlot(...)\` for manifest slots (\`task-list.create.dialog\`, \`task.create.dialog\`, etc.). **To see what is wired:** use \`lab_integrations_get_manifest\` + \`lab_integrations_list_bindings\` for \`app-task-list\` — do not infer from connector route source alone. Backend still exposes \`/api/connector/tasks\` and \`/api/connector/task-lists\` for Forms Builder connectors. Launch deps may include \`app-lab-formsbuilder\` (and \`app-lab-chartbuilder\` when chart bindings exist).


## Key UI Components & Layout

### Root Container Structure
\`\`\`html
<div class="task-list-app app-loaded-container min-h-full h-full flex flex-col overflow-hidden">
  <header class="lab-app-header"><h1>Task Manager</h1></header>
  <main class="lab-app-body">
    <div class="task-list-container lab-app-landing">...</div>
  </main>
</div>
\`\`\`

### Component Breakdown

**1. Dashboard + list panel (\`task-list-container\`, \`lists-panel\`)**
- KPI row (\`kpi-lists\`, \`kpi-tasks\`, etc.) then list tabs.

**2. List tabs (\`tabs-container\`)**
- Buttons per task list; click to select active list.
- **New List** opens **Create New Task List** dialog (Forms Builder form).

**3. Main content (\`active-task-list-container\`, \`main-content\`)**
- **TaskFilters**, **TaskStats**, **New Task**, list description row with **Edit List**.
- **tasks-container** — **TaskItem** rows with edit/delete actions.

**4. Integration dialogs (\`LabIntegrationSurface\` + bindings)**
| Slot (manifest) | Trigger | Purpose |
| \`task-list.create.dialog\` | New List | Create list (plugin form) |
| \`task-list.edit.dialog\` | Edit List | Update list |
| \`task.create.dialog\` | New Task | Create task |
| \`task.edit.dialog\` | TaskItem edit | Update task |
| \`reports.by-status\` / \`reports.by-priority\` | Reports region | Chart plugins (when bound) |
If a button does nothing, check **bindings** with \`lab_integrations_list_bindings\` — not whether connector POST exists.

**5. Delete task**
- Confirmation dialog; delete uses Task List REST API (not Forms Builder submit).

### SearchPattern Table for Agents for UI Automation Tool:
- **Discovery**: Prefer \`contextArea\`: \`task-list-app\`. Avoid \`app-loaded-container\` alone when multiple apps are running (Lab \`#render-container\` shares that class).
- **Launch**: \`app-list-container\` or \`lab-app-catalog-sidebar\` (when workspace tabs are open); \`[data-appname="task list"]\` or \`lab-catalog-sidebar-launch\`.
- **Actions**: \`ui_automation_element_action\` with selectors from discovery.

| Area | Class / pattern | Purpose |
|------|-----------------|--------|
| Mount root | \`#app-app-task-list\` | Platform Vue mount wrapper |
| App root | \`task-list-app\` | Whole app (best scope) |
| Launch (dashboard) | \`app-list-container\` / \`lab-app-catalog-sidebar\` | \`[data-appname="task list"]\` — grid or \`lab-catalog-sidebar-launch\` |
| List workspace | \`task-list-container\` | Dashboard + lists panel |
| List tabs | \`tabs-container\` | Switch lists (\`list-btn-{id}\`) |
| New List | \`new-list-btn\` | Create list form |
| Edit List | \`edit-list-btn\` | Edit list form |
| New Task | \`new-task-btn\` | Create task form |
| Tasks | \`tasks-container\`, \`task-item-*\` | Task rows |
| Form actions | ids from \`generateUniqueId('task-form-mounter-primary')\` etc. | Save/cancel on mounted forms |


## Unique Workflows
- **Selected list required** before **New Task**; create task form may pre-fill \`taskListId\` for the active list.
- **Edit task/list**: Form loads record from connector GET, then save via Forms Builder submit (update).
- **Forms Builder must be running** (dependency) for form dialogs to load schemas.


## Common Pitfalls & Warnings
- **Discovery scope**: With multiple Lab apps open, use \`contextArea: task-list-app\`, not bare \`app-loaded-container\`.
- Create/edit requires **global bindings** + Forms Builder running (promoted via launch deps). Empty bindings = buttons open no dialog until the integration wizard provisions stubs and upserts bindings.
- Peer app URLs resolve via platform server-url APIs; hybrid UI uses \`serverUrl\` on the Task List app server, not port 3000 for task CRUD.


## Success Indicators
- **New List / Edit List** → tab label and description update after save toast.
- **New Task / Edit Task** → task appears or updates in **tasks-container** for the selected list.


## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-lab-tasklist.task.created\` | a new task is saved | \`POST /api/tasks\` |
| \`app-lab-tasklist.task.completed\` | status **transitions to** \`completed\` | \`PUT /api/tasks/:id\` |

\`task.completed\` publishes on the transition only — re-saving an already-completed task does not re-fire it.

## FAQs & Agent Guidance

**Question: "Launch Task List"**
- \`ui_automation_discover_elements\` with \`contextArea: "app-list-container"\` (or \`lab-app-catalog-sidebar\` when workspace tabs are open); \`ui_automation_element_action\` click \`[data-appname="task list"]\`.

**Question: "Create a task list"**
- Click **New List**; integration form (Forms Builder plugin) opens with fields **autopopulated** from the task-list service model; submit to save.

**Question: "Set up / wire integrations" (agent)**
- Use \`lab_integrations_*\` tools. \`provision_form_stub\` creates **non-empty** published forms (fields + required/hidden from manifest). Tell the user to **try Task List buttons** after bind; Forms Builder is only for **layout/appearance** tweaks, not adding standard fields from scratch.

**Question: "Rename or change list description"**
- Select the list tab; click **Edit List**; submit updated fields.

**Question: "Delete or remove a task list"**
- Select the list; **Remove List** → integration slot \`task-list.delete.dialog\` (Forms Builder confirm form → connector \`DELETE\`).

**Question: "Create or edit a task"**
- Select a list; **New Task** or task row **Edit**; submit through integration form.

**Question: "Delete or remove a task"**
- Task row **Delete** → \`task.delete.dialog\` binding (confirm form → connector \`DELETE /api/connector/tasks/:id\`).



${formatCatalogHostRecordAutomationSection({
  appId: 'app-task-list',
  displayName: 'Task List',
  contextAreaClass: 'task-list-app',
  primaryRecordLabel: 'task title',
  extraBullets: [
    "**Task list** Edit/remove buttons (selected tab) use list id + list name in `data-lab-record-*`.",
    "Each **task row** uses the task title as `data-lab-record-name`.",
  ],
})}

**Question: "Design or change task/list forms"**
- Open **Forms Builder** (dependency app); edit forms keyed for Task List; link **task-list** connector endpoints.`;
