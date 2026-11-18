# Lab integration — provider unbind cleanup (rm-64)

When a platform binding is deleted (`lab_integrations_delete_binding` or HTTP `DELETE …/bindings/:id`), THE-LAB removes more than the binding row:

1. **Host dependencies** — demote provider apps from the host `dependencies` list when no enabled binding on that host still needs them.
2. **Provider assets** — when **no binding anywhere** still references the same `providerRef`, the **bindable provider app** deletes its rm-64 stub asset and any **orphan integration connector** in that app’s SQLite DB.

## Contract (all bindable provider apps)

Shared types: `src/shared/lab-integrations/integration-provider-unbind.ts`

| Piece | Responsibility |
|-------|----------------|
| **Platform** | `cleanupProviderAssetsAfterUnbind` → `runLabIntegrationProviderUnbindCleanup` in `integration-provider-unbind-registry.ts` |
| **Provider app** | Implement `LabIntegrationProviderUnbindHandler` and register in the registry |

Each handler declares:

- `registryAppId` — e.g. `app-lab-formsbuilder`, `app-lab-chartbuilder`
- `kinds` — e.g. `form.surface`, `chart.surface`
- `cleanupAfterUnbind(context)` — delete stub by `providerRef` when safe

### Stub detection (do not delete user-authored assets)

Only delete when the asset is an **integration stub**:

- Description contains `(rm-64)` / documented stub markers (`integration-stub-markers.ts`), **or**
- Linked data connector uses a **platform hub** discovery URL (`/api/platform/lab-integrations/hub/`)

If the user bound a hand-picked form/chart, cleanup returns `not_integration_stub`.

### Connector orphan rule

After deleting the asset, delete the provider’s data connector row **only if** no remaining forms/charts in that app DB reference the same `data_connector_id`.

### Reference implementations

| Provider | Handler module | Binding kind | Asset key |
|----------|----------------|--------------|-----------|
| Forms Builder | `src/backend/lab-integrations/providers/forms-builder-unbind-provider.ts` | `form.surface` | `formKey` = `providerRef` |
| Chart Builder | `src/backend/lab-integrations/providers/chart-builder-unbind-provider.ts` | `chart.surface` | `chartKey` = `providerRef` |

### Adding a new bindable app

1. Provision stubs via platform (or app) with rm-64 description markers and hub discovery URLs on connectors.
2. Add `LabIntegrationProviderUnbindHandler` under `src/backend/lab-integrations/providers/{app-id}-unbind-provider.ts`.
3. Register in `DEFAULT_HANDLERS` in `integration-provider-unbind-registry.ts`.
4. Add Jest coverage mirroring `lab-integrations-unbind-cleanup.test.ts`.

MCP `delete_binding` response includes `cleanup`: `{ assetDeleted, connectorDeleted, skipped, skipReason, formDeleted?, chartDeleted? }`.
