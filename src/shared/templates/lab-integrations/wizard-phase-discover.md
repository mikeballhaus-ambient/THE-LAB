# Integration workflow — Discover (rm-64)

**Goal:** Understand the host app manifest, existing bindings, and target slot before changing anything.

## Host scope (do not mix hosts)

| Host | Typical slots | Kind |
|------|----------------|------|
| `app-lab-tasklist` | `task.*.dialog`, `reports.by-status`, `reports.by-priority` | forms + **chart.surface** on Task List reports |
| `app-lab-chartbuilder` | `chart.designer.metadata`, `chart.designer.connector`, `chart.connector.*`, `chart.delete.dialog` | **form.surface** on designer/connectors views (not legacy `chart.edit.dialog` for in-app edit) |
| `app-lab-helpdesk` | `ticket.*`, `kanban.*`, report charts | per manifest |

Always pass the **host the user is working in** to `get_manifest` / `list_bindings`. “Chart Builder bindings” in chat may mean **Task List report charts** — confirm before delete.

## Mandatory first step (integration “what’s configured?”)

If the user asks what is **configured**, **wired**, **missing**, or **set up** for plugin forms/charts (including “clean slate”, “wizard”, or Task List **New Task** / **New List** dialogs):

1. Call **`lab_integrations_get_manifest`** for the host (`app-lab-tasklist` or short id).
2. Call **`lab_integrations_list_bindings`** for the same host.

Inspect **`bindingReadiness`** and **`readinessSummary`** in the list_bindings response (not bindings alone):

| `readiness` | Meaning for the user |
|-------------|----------------------|
| `ready` | Binding exists **and** Forms Builder / Chart Builder has the stub asset (`providerAssetExists: true`). |
| `missing_provider_asset` | Binding row exists but **no stub** in the provider app — run **`provision_form_stub`** (or chart stub) before claiming “wired”. |
| `not_applicable` | Non form/chart binding kinds. |

Report **manifest slots** vs **bindings**, then **stub readiness**. A slot is fully wired only when it has an enabled binding with `readiness: ready`. Map gaps in plain language (e.g. “New Task: binding present but stub missing — provision `task.create.dialog`”).

**Never** tell the user integrations are complete or “✅ Connected” when `readinessSummary.missingProviderAsset > 0`.

**Do not** answer from host REST routes, connector handlers, `form-keys.ts`, or repository search — those are **runtime APIs**, not stub/binding state. Repo/file reads are only for host shell layout **after** manifest + list_bindings audit is loaded.

## Other discover tools

3. `lab_integrations_hub_discovery` — when you know `serviceId` from manifest `integrationServices`.
4. `lab_integrations_resolve_launch_deps` — which provider apps must launch with the host.
5. `app_management_get_app` — ports and dependencies only (not a substitute for `list_bindings`).
6. `read_file` / `search_repository` — host `LabIntegrationSurface` / layout in `src/apps/{id}/` when manifest + bindings are already loaded.

## Task List pilot hints

- Host: `app-lab-tasklist` (or `task-list`).
- Common slots: `task.create.dialog` (`form.surface`), `reports.by-status` (`chart.surface`).
- Registry may already list `app-lab-formsbuilder` as a seed dependency; bindings can promote additional providers.

## Output for the user

Short plan in **plain language** (user actions: “new list”, “edit task” — not binding UUIDs). For each action: binding present? stub **`ready`**?

When **`readiness: ready`**, stubs were **autopopulated** — user can try Task List buttons; Forms Builder is for layout tweaks. Suggest **Refresh** in Forms Builder if they had the app open during provisioning.

When **`missing_provider_asset`**, provision stubs **before** upsert (or re-provision with `overwrite: true` if keys already match `providerRef`). Do **not** assume Forms Builder already has forms.

When **no binding** for a manifest slot, provision stub then **`upsert_binding`** — confirm before delete.
