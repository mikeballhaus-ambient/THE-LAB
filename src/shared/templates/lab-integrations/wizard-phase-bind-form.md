# Integration workflow — Bind form (rm-64)

**Prerequisite:** **Code** persona (silent `persona_manager_switch_persona` if not). Never `write_query` on `lab_integration_bindings`.

**Goal:** Provision a Forms Builder stub (if needed), save a global binding, and ensure launch dependencies are satisfied.

## Chart Builder (`app-lab-chartbuilder`)

Provision + bind **designer and connector** slots from host app system instructions — not only legacy `chart.create.dialog` / `chart.edit.dialog`. Minimum for in-app UX: `chart.designer.metadata`, `chart.designer.connector`, `chart.connector.create.dialog`, `chart.connector.edit.dialog`.

## Ordered steps

1. **Discover** (if not done): manifest + `lab_integrations_list_bindings` — if any row has `readiness: missing_provider_asset`, **provision stubs** for those slots before upsert; do not add duplicate bindings.
2. **Stub (required before bind):** `lab_integrations_provision_form_stub` with host `serviceId`, slot, and connector metadata from hub discovery — runs on platform **:3000** (no Forms Builder process required). This creates the **form + data connector** in Forms Builder’s DB. **Never** call `upsert_binding` with a guessed `providerRef` — bindings alone do not create forms. After bindings were cleared or connector model changed, use **`overwrite: true`** so task forms get lookup Select/MultiSelect components (not stale InputText stubs).
3. **Bind:** `lab_integrations_upsert_binding` with `kind: form.surface`, `providerAppId` (`forms-builder` / `app-lab-formsbuilder`), **`providerRef` = `formKey` from step 2**, `config.schemaVersion: 1`. Set **`presentation`**: `dialog` for modal hosts (Task List / Help Desk create/edit) or **`inline`** with **`placementRegionId`** from manifest (Chart Builder `designer.forms`). If the slot already has a binding, pass **`bindingId`** from `list_bindings` to update — do not create a second row.
4. **Launch deps:** `lab_integrations_resolve_launch_deps` — client launch should match; remind user to relaunch host if deps changed.
5. **Host UI:** Mount `LabIntegrationSurface` / `LabIntegrationHost` from `@/shared/integration` so bindings render at runtime.

## Permissions

Bindings require host **update** permission or admin. Tools enforce server-side — pass `userId` from system context.

## After success — tell the user (plain language)

Follow **`integration-stub-forms-user-messaging.md`**: stubs are **autopopulated** from the service model; bindings wire slots. User should **try Task List buttons first**. Forms Builder is **optional** (layout/appearance only), not “add all fields manually.”

## Failure recovery

- `FORBIDDEN` — check app permissions or use admin.
- `CONFLICT` / binding already exists for slot — call `lab_integrations_list_bindings`, then upsert with that row’s **`bindingId`** (update). For a fresh stub form, `provision_form_stub` with **`overwrite: true`** first, then update binding `providerRef`.
- Stub form `CONFLICT` — `provision_form_stub` with **`overwrite: true`** (boolean).
- Do not hand-edit `lab_integration_bindings` SQLite; use MCP tools only.
