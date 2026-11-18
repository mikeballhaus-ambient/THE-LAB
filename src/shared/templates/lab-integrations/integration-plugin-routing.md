# Integration / plugin work — persona routing (inject when relevant)

## Non-negotiable (first actions in the turn)

When the user asks to **integrate**, **bind**, **list/show bindings**, **unbind**, **remove/restore bindings**, **provision stubs**, **wire Forms Builder / Chart Builder**, **fix unbound slots**, or **what is configured/missing** for host UI:

1. If **current persona is not `Code`**, the **first tool call** MUST be `persona_manager_switch_persona` with `targetPersona: "Code"` and the session `sessionId` — **before** any user-visible reply, plan text, `read_query` / `write_query`, or file edits.
2. **Do not** announce the switch (no “switching to Code”, no meta-commentary). Continue in the same turn after the switch succeeds.
3. If already **Code**, skip step 1.

**Why:** **Chat** (and several personas) do **not** have `lab_integrations_*` tools. Staying on Chat leads to `write_query` on `lab_integration_bindings`, hallucinated “restored” bindings, and wrong hosts (e.g. deleting Task List **report charts** when fixing Chart Builder **forms**).

## Forbidden shortcuts

| Do not | Do instead |
|--------|------------|
| `write_query` / `read_query` on `lab_integration_bindings` (or any SQL) for wiring | `lab_integrations_list_bindings`, `lab_integrations_upsert_binding`, `lab_integrations_delete_binding` |
| Delete or disable bindings without `list_bindings` for the **exact** `hostAppId` | Discover first; confirm slot + host with the user when ambiguous |
| Treat “Chart Builder” as one host for all chart wiring | **`app-lab-tasklist`** `chart.surface` slots (`reports.*`) ≠ **`app-lab-chartbuilder`** `form.surface` designer/connector slots |
| Say “done / restored / removed all” without tool proof | Re-run `list_bindings` after changes and cite slots + `enabled` + `readiness` |
| Provision `chart.create.dialog` / `chart.edit.dialog` / `chart.connectors.manage.dialog` on Chart Builder | **Removed from manifest** — use designer + in-app connectors view slots only |

## Workflow

1. Follow the active **integration workflow playbook** under `shared/templates/lab-integrations/` (`discover` → stub → bind).
2. **Discovery:** `lab_integrations_get_manifest` + `lab_integrations_list_bindings` (use **`bindingReadiness`** — never “connected” when `missing_provider_asset`).
3. Use platform **`lab_integrations_*`** MCP tools; host shell edits only when playbooks require `src/apps/{app-id}/`.

**Sidecar:** When `labSidecarContext` includes `integrationIntent`, `toolProfile: integration`, or `hostAppId` plus integration-related text — treat as plugin work even if the user did not say “plugin”. Silent switch to Code.

**Permissions:** If any `lab_integrations_*` tool returns **`FORBIDDEN`**, follow `integration-permissions-and-errors.md` — stop retrying writes.

**Stub forms:** After `provision_form_stub` + bindings, forms are **autopopulated** — see `integration-stub-forms-user-messaging.md`. Never describe them as empty shells requiring manual field entry for basic CRUD.
