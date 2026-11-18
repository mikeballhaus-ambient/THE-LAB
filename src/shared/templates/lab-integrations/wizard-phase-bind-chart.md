# Integration workflow — Bind chart (rm-64)

**Goal:** Provision a Chart Builder stub (if needed), save a global `chart.surface` binding, satisfy launch dependencies.

## Ordered steps

1. **Discover:** `lab_integrations_get_manifest` + `lab_integrations_list_bindings` — identify `chart.surface` slots (e.g. Task List `reports.by-status`).
2. **Stub:** `lab_integrations_provision_chart_stub` with `hostAppId`, `serviceId`, `slot`, optional `chartType` / `suggestedChartKey` — platform **:3000** (Chart Builder process not required). Use **`overwrite: true`** after model or binding reset.
3. **Bind:** `lab_integrations_upsert_binding` with `kind: chart.surface`, `providerAppId` (`chart-builder` / `app-lab-chartbuilder`), **`providerRef` = chart key from stub**, `config.schemaVersion: 1`. Pass **`bindingId`** to update an existing row.
4. **Launch deps:** `lab_integrations_resolve_launch_deps` — relaunch host if providers changed.
5. **Host UI:** Region must render chart bindings (e.g. `LabIntegrationSurface` on reports surface).

## Permissions

Same as form bind — host **update** or admin.

## After success

Tell the user to open the host **reports/dashboard** region; chart data comes from the host connector + Chart Builder data connector created by the stub.

## Failure recovery

- Missing chart asset — provision chart stub before upsert.
- `CONFLICT` on stub — `overwrite: true` on provision tool.
- Binding duplicate — `list_bindings` → upsert with `bindingId`.
