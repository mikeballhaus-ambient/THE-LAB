# Lab approvals (platform v1)

Multi-step **approve/reject** requests on port **3000** — policies, inbox, and domain events. **CRM** (`app-lab-crm`) **Submit approval** on sales/quotes publishes `app-lab-crm.sales.approval_submitted` / `app-lab-crm.quotes.approval_submitted`, sets the deal’s **`approvalStatus`** enum to **`pending`**, and the record view shows a **Pending approval** badge instead of the submit button until an outcome workflow sets **`approved`** / **`rejected`**. Demo **Workflow Studio** uses a **request + response** pair per entity policy:

1. **Request** — intent event → `raise_approval` on the CRM sales or quote policy.
2. **Response (approved / rejected)** — one workflow per entity; trigger `platform-approvals.request.*`, rule on policy + CRM subject, **IF** on `requestStatus` → `integration_update` → **Notify lab users** (`notify_users` with **From payload** on `requesterUserId`).

Approvers use integration slot `crm.approval.request.decide.dialog` (Forms Builder stub → `lab-approvals-policies.approval-requests` on :3000). The decide dialog includes a **Show previous activity** toggle (earlier step decisions, submit comments, and timestamps) for multi-step policies. Assignees use the Approvals inbox; the inbox **reloads over `/lab-events`** when requests are created or decided (same socket auth as notifications). **Bell notifications** for new steps come from seeded Workflow Studio graphs on `platform-approvals.request.created` and `platform-approvals.step.pending` (**Notify lab users** → **From payload** on `assigneeUserId`). Policies alone do not push notifications.

### Decide dialog (Forms Builder)

The decide stub exposes **Decision** as a Select with embedded enum lookups (`approve` / `reject`). After connector hydration, empty values are restored so the control stays editable. Restart the main backend so stub provisioning and `DEMO_AUTOMATION_DEFINITION_REVISION` sync pick up contract changes.

### View CRM record (Settings inbox)

When a request’s subject is a CRM sales or quote record (`subjectAppId` = `app-lab-crm`), **View CRM record** focuses the apps workspace, launches CRM, and opens that record’s detail view via host context keys `crmOpenEntityKey` / `crmOpenRecordId` / `crmOpenReadOnly`. In that read-only view, integration actions (Post entry, suggested tasks, Add task, New ticket) are disabled; use **Decide** in Approvals to act on the request.

## Concepts

| Piece | Role |
|-------|------|
| **Policy** | Admin-defined **1–10** ordered steps; each step has one `assigneeUserId` and an optional **label** (step name shown in the UI) |
| **Request** | Instance tied to `subjectAppId` + `subjectEntityType` + `subjectEntityId` |
| **Inbox** | Pending requests where you are assignee on the current step |

## Domain events (`platform-approvals`)

Published through the full lab-events pipeline (notifications, rules, workflows):

- `platform-approvals.request.created`
- `platform-approvals.step.pending`
- `platform-approvals.step.approved`
- `platform-approvals.request.approved`
- `platform-approvals.request.rejected`

`sourceAppId`: `platform-approvals`

## Settings

- **Approvals** — inbox, my requests, submit (member+)
- **Approval policies** — admin CRUD

## API

- `GET/POST/PUT/DELETE /api/platform/lab-approvals/policies`
- `GET /api/platform/lab-approvals/inbox`
- `GET /api/platform/lab-approvals/requests/mine`
- `POST /api/platform/lab-approvals/requests`
- `POST /api/platform/lab-approvals/requests/:id/decide`

Client: `src/shared/services/platform-lab-approvals.client.ts`

## Demo pack (platform catalog seed)

Several policies ship with Workflow Studio host-app demos:

| Policy | Used by |
|--------|---------|
| `…000003` — **Demo 3 step approval (expense)** | Legacy reference only; expense demo workflows are no longer seeded. |
| `…000010` / `…000011` — **CRM sales / quote approval** | CRM Submit approval → request workflows; Decide in CRM UI. |
| `…000012` — **Timesheet weekly approval** | Time Tracking `timesheet.submitted` → request workflow; response workflow writes `approvalStatus` and notifies submitter. |
| `…000013` — **Expense report approval** | Expense Reports `expense.submitted` → request workflow; response workflow sets expense `status` and notifies submitter. |
| *(workflows)* — **Platform: notify assignee on approval created / step pending** | Bell inbox for first and next-step assignees (`assigneeUserId`). |

CRM **response** workflows use trigger `platform-approvals.request.*`, filter on policy and subject,
then branch on payload **`requestStatus`** (`approved` | `rejected`) with IF nodes before update and notify.

Restart the main backend to sync seed policies and workflow graphs from code (`DEMO_AUTOMATION_DEFINITION_REVISION`). On each startup sync, **all approval requests** whose `policyId` is one of the seeded demo policies above are **removed** (including pending inbox rows from manual testing) so the inbox stays clean; policies themselves are kept.

## Out of scope (v1)

Catalog app, CRM/Help Desk embedded actions, parallel approvers, delegation.

## Related

- [Lab domain events](docs/platform/lab-domain-events.md)
