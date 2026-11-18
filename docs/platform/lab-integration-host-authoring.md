# Integration host authoring

Guide for **developers** and **agents** adding or extending integration hosts (rm-64). End users should start with [lab-app-integrations.md](lab-app-integrations.md).

## Two sides, two jobs

You are either **consuming** another app's service or **providing** one. The rules differ, and so do
the failure modes — a provider that under-advertises returns zero rows; a host that under-seeds renders
`nothing` and usually fails silently.

### As a host (consumer)

1. **Manifest** — `accepts` (slot, kind, presentation) and `integrationSurfaces` on the app registry row (App Management).
2. **Integration services** — connector routes + discovery; mirror Task List / Help Desk connector handlers under `src/apps/{app-id}/back-end/`.
3. **Vue shell** — `LabIntegrationSurface` / `LabIntegrationHost` from `@/shared/integration`; pass `serverUrl`, `hostAppId`, `surfaceId`, runtime `context`.
4. **Bindings — the step that gets skipped.** Declaring a slot in `accepts` and seeding it are **one change**. Pick the seeder your host belongs to:

   | Seeder | Host list | Covers |
   |---|---|---|
   | [`catalog-binding-seeds.ts`](../../src/backend/db/LabIntegrations/catalog-binding-seeds.ts) | `CATALOG_HOST_APP_IDS` | Wave C catalog apps |
   | [`platform-catalog-binding-seeds.ts`](../../src/backend/db/LabIntegrations/platform-catalog-binding-seeds.ts) | `PLATFORM_CATALOG_HOSTS` | Approvals, Ledger, App Builder |
   | [`pilot-host-binding-seeds.ts`](../../src/backend/db/LabIntegrations/pilot-host-binding-seeds.ts) | `GOLDEN_INTEGRATION_PILOT_HOST_IDS` | Task List, Help Desk, **and any provider that is also a host** |

   **If your host is in none of them, its slots bind nothing and the UI renders nothing** — with no
   error. `LabIntegrationSurface` returns early, and a `hasEnabledBinding(slot) … return` guard in the
   app does the same silently.

5. **App system instructions** — `src/backend/db/Apps/app-instructions/{app-id}-app-instructions.ts` (sync on backend init).

### Seeding rules that have already cost us defects

- **Generate the loop from the manifest, not from a hand-written list.** Some slots are generated per
  entity or per record (`crm.<entity>.create.dialog`) and cannot be enumerated as constants. A seeder
  that lists named slots silently misses every generated one — that is how all seven CRM entity
  families shipped with inert **New / Edit / Delete** buttons.
- **A provider can also be a host.** Chart Builder renders its own connector dialogs, so it belongs in
  neither catalog list and must be registered as a pilot host explicitly. Its absence is what made
  every data connector uneditable.
- **Some slots are deliberately native** (the app's own form, e.g. `chart.designer.metadata`). Record
  them in `UNBOUND_FORM_SLOT_EXCEPTIONS` in
  [`verify-integration-seed-pack.ts`](../../src/backend/lab-integrations/verify-integration-seed-pack.ts)
  **with a reason**. Never widen that list to silence a failure — if the guard fails, the answer is a
  seeder.
- **The gate:** `npm run verify:integration-seeds` asserts every accepted slot has an **enabled
  binding**. It fails before the UI does, so run it after touching a manifest or a seeder.

### Platform bridges (Approvals, Ledger) via domain events

Some host actions should **not** open a Forms Builder connector for submit/post. The supported pattern:

1. **Native dialog or API** on the host app collects intent (memo, amount, comment).
2. **Host back-end** calls `publishLabDomainEvent` with a catalog event type and payload (include
   `subjectAppId`, `subjectEntityType`, `subjectEntityId` when workflows should raise approvals or
   post money against a record).
3. **Workflow Studio demo graphs** (or tenant workflows) listen on that event and call
   `raise_approval` or `ledger_post_entry` with demo policy / COA account ids.
4. **Response workflows** (one graph per host entity) use trigger `platform-approvals.request.*`,
   a rule on CRM subject, one **`integration_update`** (`approvalStatus` ← `requestStatus`), then **IF**
   on `requestStatus` for approved vs rejected **notify** copy.
   Human approval is async — the request graph does not block on the canvas for a decision.
5. **Integration slots** remain for human-in-the-loop steps only — e.g. `crm.approval.request.decide.dialog`,
   `crm.ledger.account.create.dialog`.

Reference: CRM sales/quotes **Submit approval** and **Post entry** (`src/apps/lab-crm/back-end/routes/integrations.ts`).
Catalog apps that already publish mutation facts (expense approved, timesheet submitted) wire the same way
without a bridge dialog — enable the matching demo workflow seeds after backend init.

### As a provider

1. **Declare the service** — `integrationServices` with a connector segment and a read-only discovery
   path, plus an `offers` entry. Use `offers`, **not** `accepts`: `accepts` means "I host a form here".
2. **Add the route** — the connector endpoint and its discovery contract. A consumer binds what you
   advertise; an unadvertised lookup resolves to **zero rows** rather than erroring, which reads as
   "no data" rather than "not configured".
3. **Verify discovery** — `GET /api/connector/discovery` on the app's own port must describe the entity.

## Agent playbooks (injected by phase)

| Phase | Template | Intent |
|-------|----------|--------|
| discover | `wizard-phase-discover.md` | What’s configured / missing |
| bind_form | `wizard-phase-bind-form.md` | Wire Forms Builder slot |
| bind_chart | `wizard-phase-bind-chart.md` | Wire Chart Builder slot |
| export_host | `wizard-phase-export-host.md` | Expose integration service for other apps |
| host_shell | `wizard-phase-host-shell.md` | Add surfaces / migrate to plugin UI |

Routing: `src/shared/config/lab-integrations-prompt.ts` + `lab-integrations-system-prompt.ts`.

## MCP tools (Code persona / Sidecar `integration` profile)

| Tool | Purpose |
|------|---------|
| `lab_integrations_get_manifest` | Host slots & services |
| `lab_integrations_list_bindings` | Bindings + readiness |
| `lab_integrations_hub_discovery` | Service model snapshot |
| `lab_integrations_provision_form_stub` | Forms Builder stub |
| `lab_integrations_provision_chart_stub` | Chart Builder stub |
| `lab_integrations_upsert_binding` | Create/update binding |
| `lab_integrations_delete_binding` | Remove binding + stub cleanup |
| `lab_integrations_resolve_launch_deps` | Launch order |

## Reference implementation

- **Host:** `src/apps/task-list/` — `TaskList.vue`, manifest seeds, connector `tasks` / `task-lists`
- **Shared runtime:** `src/shared/integration/`, `src/shared/forms/ConnectorFormPanel.vue`

## Slot naming

Slot ids use `{entity}.{action}.{presentation}` on manifests (`form.surface` / `chart.surface` in `accepts`); copy patterns from `src/shared/lab-integrations/catalog-manifests.ts`.
