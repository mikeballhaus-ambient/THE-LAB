# Lab app integrations (plugins)

THE-LAB connects apps through **registry manifests**, **global bindings**, and shared **host renderers** — instead of hard-coded `formKey` strings in each app. Configuration is **AI-first**: ask **Laboratory** or **Lab Sidecar** (integration profile) to wire forms and charts; optional read-only inspection via platform APIs.

Architecture: manifests in `src/shared/lab-integrations/catalog-manifests.ts`, bindings in main DB, runtime in `src/shared/integration/`.

## Concepts

| Term | Meaning |
|------|---------|
| **Host app** | App that shows integrated UI (e.g. Task List). Declares `accepts` slots and `integrationSurfaces` in its manifest. |
| **Provider app** | Supplies assets — **Forms Builder** (`form.surface`) or **Chart Builder** (`chart.surface`). |
| **Binding** | Row in `lab_integration_bindings`: host + slot + kind + `providerRef` (form/chart key). |
| **Stub** | Auto-generated form or chart in the provider app DB from the host’s **integration service** model. |
| **Integration service** | Connector API + discovery contract (e.g. Task List `tasks`, `task-lists`). |

Bindings are stored in the **main** SQLite DB. Provider stubs live in each provider app’s DB. Launching a host can **promote** provider apps into `dependencies` when bindings are enabled.

**Warm-up:** On main backend start, THE-LAB **warm-ups** enabled hybrid/server app backends (dependency order) so connector HTTP and workflows do not require opening each app in the UI first. See [lab-stack.md](../operations/lab-stack.md#app-server-warm-up). Opt out with `LAB_APP_SERVER_WARMUP=0`.

### Form presentation: modal vs inline

Each **form.surface** binding can control how the host renders the Forms Builder plugin:

| Layer | Field | Values |
|-------|--------|--------|
| **Binding** (wins) | `config.placement.presentation` | `dialog` (modal) or `inline` (embedded in a surface region) |
| **MCP upsert** | `presentation` + `placementRegionId` (+ optional `placementSurfaceId`, `placementOrder`) | Merged into `config.placement` |
| **Manifest slot** | `accepts[].defaultPresentation` | Default when binding omits presentation |
| **Manifest region** | `integrationSurfaces[].regions[].defaultPresentation` | Fallback for the region |

**Examples:** Task List / Help Desk **New ticket** slots use **dialog** (opened via `openSlot`). **Chart Builder** designer slots (`chart.designer.metadata`, `chart.designer.connector`) default to **inline** in region `designer.forms` on surface `chart-builder.designer`. Chart Builder depends on **Forms Builder** for those bindings.

### Chart Builder: data connectors vs host-supplied data

Chart Builder follows the same **discovery contract** idea as Forms Builder, but charts support **two modes**:

| Mode | When | Render request |
|------|------|----------------|
| **No data connector** | Manual library charts, sample seeds (`chart_seed_*`) | Host sends `{ data: ChartDataPayload }` (segments, labels, etc.). |
| **Connector-backed** | Integration wizard stubs for host `chart.surface` slots | Host sends `{ context }` only; Chart Builder loads rows via `data_connectors` + `dataMapping` and aggregates on the server. |

Wizard flow: `lab_integrations_provision_chart_stub` → creates/updates a **data connector** row and a **chart** linked to it → `lab_integrations_upsert_binding` points the host slot at that `chartKey`.

An in-app **Manage data connectors** screen (like Forms Builder) is still planned; today connectors for integration charts come from the wizard (or API/DB). Designer **Forms Builder** bindings configure chart metadata and connector linkage in the UI — they do not replace connector-backed render.

## Task List pilot (reference)

Task List is the reference host:

- **Create / edit task** — dialog slots bound to Forms Builder stubs (`ConnectorFormPanel` at runtime).
- **Reports** — chart slots bound to Chart Builder stubs.
- UI uses `LabIntegrationSurface` — no embedded Forms Builder URL in `App.vue`.

Try **New task** / **Edit** after bindings show **ready** in integration status (stubs exist in Forms Builder).

**Reports charts** (Chart Builder) appear under the KPI row when `chart.surface` bindings exist for `reports.by-status` / `reports.by-priority`. The host passes `taskListId` in integration context (select a list first). Assistant flow: `lab_integrations_provision_chart_stub` for each slot, then `lab_integrations_upsert_binding` with `providerRef` = chart key; launch **Chart Builder** (or let integration launch promote the dependency). Verify in Task List **Reports** — two chart panels in a grid when both slots are bound.

## Help Desk host (phase 12)

Help Desk (`app-lab-helpdesk`) uses the same bindings-only pattern:

- Surface `help-desk.workspace`; **New ticket** → `ticket.create.dialog`; list **Edit** / **Remove** → `ticket.edit.dialog` / `ticket.delete.dialog` (pass `ticketId` in context).
- KPI tiles stay native; chart bindings render in `reports.grid` for `reports.by-status`, `reports.by-priority`, `reports.queue-funnel`, `reports.priority-breakdown` (no host context keys — all tickets).
- Registry dependencies: **Forms Builder** + **Chart Builder**. Rework **Help Desk before CRM** (CRM lists `app-lab-helpdesk` as a launch dependency).

## Configuring integrations (Assistant)

1. Open **Laboratory** or launch an app and use **Lab Sidecar** with integration intent.
2. Ask in plain language, e.g. “What’s wired on Task List?” or “Bind the create-task form.”
3. The assistant switches to **Code** persona (silently), runs **`lab_integrations_get_manifest`** and **`lab_integrations_list_bindings`**, then provisions stubs and upserts bindings via MCP tools.

**Readiness:** A slot is fully wired only when `bindingReadiness` is **`ready`** (binding + provider asset exists). `missing_provider_asset` means run stub provision first.

User-facing messaging for stub forms: agents follow `integration-stub-forms-user-messaging.md` — stubs are **autopopulated** from the service model; Forms Builder is for layout tweaks, not re-entering every field.

## Permissions

| Action | Who |
|--------|-----|
| View bindings / manifest | Signed-in user with host access |
| Create/update/delete bindings, provision stubs | Host app **update** permission, **manage apps**, or **owner/admin** |

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Dialog empty / “form not ready” | Missing binding or stub — check list_bindings readiness |
| Save works but list unchanged | Refresh host view; confirm binding targets correct slot |
| Forms Builder shows no forms | Stubs not provisioned — provision stubs, then Refresh in Forms Builder |
| Chart missing on reports | `chart.surface` binding or chart stub missing |

## Developers & agents

- **Host authoring:** [lab-integration-host-authoring.md](lab-integration-host-authoring.md)
- **Unbind cleanup:** [lab-integration-provider-unbind.md](lab-integration-provider-unbind.md)
- **Playbooks:** `src/shared/templates/lab-integrations/wizard-phase-*.md`

## Seed pack (fresh installs)

Golden integration pack: `npm run verify:integration-seeds`, export scripts, and code-first binding seeds on backend boot. Gate: `bindings=153`, zero warnings after manifest/seeder changes.

**Program status:** integrations **shipped** — [docs/roadmap.md](../roadmap.md).
