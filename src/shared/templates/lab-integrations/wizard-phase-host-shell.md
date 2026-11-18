# Integration workflow — Host shell & slots (rm-64)

**Goal:** Mount integration UI from **bindings** using `LabIntegrationSurface` / manifest slots — no hard-coded `formKey` in host Vue.

## When to use

- New dialog or inline region for a form/chart
- Migrate template CRUD off bespoke components to plugin surfaces
- Add `integrationSurfaces` regions (Approach D — `LabIntegrationHost`)

## Ordered steps

1. **Manifest:** `lab_integrations_get_manifest` — note `accepts[]` (slot, kind, `presentation`: dialog | inline) and `integrationSurfaces[]` (regionId, layout).
2. **Layout:** In `src/apps/{host}/front-end/`, use `LabIntegrationSurface` with `hostAppId`, `surfaceId`, `serverUrl`, and optional `context` (e.g. `taskListId`).
3. **Open slots:** Dialog slots use `openSlot(slot)` from `useLabIntegrationSurface`; inline slots render when bindings exist.
4. **Registry:** If a slot is missing from `accepts`, extend manifest via App Management, then re-run discover.
5. **Wire bindings:** After shell exists, run **`bind_form`** or **`bind_chart`** for each slot — stubs before upsert.
6. **App instructions:** Update `src/backend/db/Apps/app-instructions/{app-id}-app-instructions.ts` for agents (discover tools, not legacy FormMounter paths).

## Reference

- Task List pilot: `src/apps/task-list/front-end/components/TaskList.vue`
- Slot naming: `src/shared/lab-integrations/catalog-manifests.ts` (`form.surface` / `chart.surface`)

## Output for the user

Which buttons/screens will appear after bindings are **ready** (`bindingReadiness: ready`). Do not promise UI until stubs + bindings are complete.
