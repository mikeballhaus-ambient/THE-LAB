# Integration workflow — Export host service (rm-64)

**Goal:** Let other apps consume this app’s data via **registry `integrationServices`** + connector routes — not copy-paste forms or SQL.

## When to use

User wants to **share**, **expose**, or **publish** entities (tasks, tickets, contacts) for Forms Builder / Chart Builder / other hosts.

## Ordered steps

1. **Read contract:** [lab-integration-host-authoring.md](../../../../docs/platform/lab-integration-host-authoring.md) and existing app under `src/apps/{app-id}/back-end/` connector routes.
2. **Implement service:** `LabIntegrationService` (or domain service + connector mappers) with `list` / `getById` / `create` / `update` / `delete`, `toConnectorRecord`, optional lookups.
3. **Discovery:** `GET /discovery` (or app pattern) returns model + `buildStandardConnectorCrudPaths` segment — mirror Task List `tasks` / `task-lists` services.
4. **Registry manifest:** Update `integrationServices` on the app row via **App Management** (`app_management_update_app`) — not hand-edited seed unless maintaining platform seeds.
5. **Hub smoke:** `lab_integrations_hub_discovery` with `hostAppId` + `serviceId` — contract loads from registry without launching the host.
6. **Document slots:** Add `accepts` entries (`form.surface` / `chart.surface`) when hosts will bind UI — see `wizard-phase-host-shell.md`.

## Permissions

Exporting services is **code + registry** work; binding is separate (`update` on consumer host). Use owner/admin for registry metadata changes.

## Output for the user

Plain-language summary: what entities are exposed, which app ids can bind forms/charts, and that **consumers** still need stub + binding steps (`bind_form` / `bind_chart` playbooks).
