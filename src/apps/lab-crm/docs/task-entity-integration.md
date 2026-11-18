# CRM tasks ↔ entity forms — integration approach

This doc describes how **entity records** (contacts, sales, etc.) and **tasks** work together without merging two different connectors into one form.

## Two form pipelines (keep them separate)

| Concern | Form binding | Submit path | Data lives in |
|--------|--------------|-------------|----------------|
| **Entity** create/edit | `entityKey` = `contacts`, `sales`, … | Forms Builder → **CRM** `/api/connector/{entityKey}` | CRM app SQLite (`entity_records`) |
| **Task** create/edit | `entityKey` = `tasks` (bindings only) | Forms Builder fields → **Task List** `/api/connector/tasks` + `X-Host-App-Id: app-lab-crm` | Task List SQLite (`tasks`, scoped lists) |

Entity forms should **not** embed task fields. Tasks use the published **Task List** task form (same as the Task List app), mounted from CRM with **presets** and **metadata**.

## Linking tasks to an entity record

### 1. `tasks.metadata` (Task List column)

Optional **TEXT** column on `tasks`, JSON string. CRM writes a versioned contract:

```json
{
  "schemaVersion": 1,
  "hostAppId": "app-lab-crm",
  "entityKey": "sales",
  "recordId": 42,
  "workflow": "pipeline",
  "stage": "proposal",
  "recordLabel": "Acme — $50k"
}
```

Helpers: `src/apps/crm/shared/types/crm-task-metadata.ts` (`buildCrmTaskMetadata`, `parseCrmTaskMetadata`, `crmTaskMatchesEntity`).

**List isolation** stays on `task_lists.app_id = app-lab-crm`. **Record linkage** stays in `metadata`, not in CRM DB duplicate rows.

### 2. Presets on the task form (create from entity context)

When the user clicks **Add task** on a sales record, CRM opens `CrmTaskFormPanel` with:

| Preset field | Value |
|--------------|--------|
| `taskListId` | Default CRM list (same as global Tasks view) |
| `metadata` | Set on submit via `buildCrmTaskMetadata({ entityKey, recordId, stage, recordLabel })` in `CrmTaskFormPanel` (`entityContext`) |
| Optional | `title` prefix, `dueDate`, etc. from workflow rules (later) |

Presets are applied in `FormMounter` (hidden or read-only fields in Forms Builder). Users edit **task** fields; CRM owns **context** fields.

### 3. Server-side safety (Task List)

On connector create/update with `X-Host-App-Id: app-lab-crm`:

- Validate `taskListId` is a CRM-scoped list (already in place).
- Optionally **merge or enforce** `metadata.hostAppId` and reject edits that clear `entityKey`/`recordId` when the task was created in entity context (phase 2).

CRM should not rely on the user typing JSON in the form; presets + server merge are the source of truth.

## UX surfaces (recommended order)

### A. Entity records view (`EntityRecordsView`)

Add a **Tasks** section (or tab) on the record **view** dialog / side panel:

1. Load tasks via `GET /api/app-scoped/tasks?appId=app-lab-crm&entityKey=&recordId=` (or client filter with `crmTaskMatchesEntity`).
2. **New task** → dialog with `CrmTaskFormPanel` + presets above.
3. **Edit** → same panel with `recordId` = task id (connector), metadata unchanged unless workflow allows.

Entity **create/edit** dialogs stay **EntityFormPanel** only — no task fields on the contact/sale form itself.

### B. Global CRM **Tasks** nav (current)

Shows all CRM-scoped tasks; metadata columns (entity, record label) improve triage. Click row → jump to entity view (future deep link).

### C. Pipeline / workflow (later)

On **sales** stage change (entity update via form or API):

- Read stage from record `data.stage`.
- Create or complete tasks from templates (e.g. “Send proposal” when stage → `proposal`).
- Store `workflow: "pipeline"` and `stage` in metadata at creation time.

Templates live in CRM config (not Task List), but task **instances** remain Task List rows.

## Forms Builder setup

### Entity forms (unchanged)

- One published form per entity (or shared create/edit key).
- Connector: **CRM** discovery for that `entityKey`.
- No task connector on entity forms.

### Task form (CRM + Task List)

1. Keep using the **task-list** connector on the task form (Tasks entity in FB).
2. Add a field mapped to connector property **`metadata`** when the column exists:
   - **Hidden** or read-only in the designer.
   - Not shown on Task List personal app creates (metadata null).
3. CRM **never** depends on users filling `metadata`; `CrmTaskFormPanel` presets it on load/submit.

Optional: second “CRM task” form variant with metadata hidden by default — only if you need different layouts for personal vs CRM tasks.

## Query API (Task List — follow-up)

For performance on busy records, extend app-scoped reads:

```http
GET /api/app-scoped/tasks?appId=app-lab-crm&entityKey=sales&recordId=42
```

Implementation: `json_extract(metadata, '$.entityKey')` / `$.recordId` with indexes documented in Task List docs.

## Summary

- **Entity forms** = CRM records only.
- **Task forms** = Task List connector + CRM host header + `taskListId` + **`metadata`** for entity/workflow context.
- **Entity UI** mounts task forms with presets; **does not** mix connectors on one form.
- **Workflow** = CRM rules that create/update tasks and set metadata; Task List remains the task store.

Next implementation steps: Task List `metadata` migration + connector field → CRM record task panel → scoped query filters → pipeline templates.
