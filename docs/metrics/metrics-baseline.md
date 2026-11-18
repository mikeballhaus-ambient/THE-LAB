# rm-46 metrics baseline

**Generated:** 2026-10-04 via `npm run metrics:baseline`  
**Regenerate:** after major refactors; compare Phase 2 gate (**2.6**).

## Summary

| Metric | Value |
|--------|-------|
| Files scanned (`src/backend/routes` + `src/apps/*/back-end`) | 80 |
| `any` occurrences (heuristic) in those paths | 62 |
| Top-level `src/**` files counted | 703 |

## Top 25 largest files under `src/` (by line count)

| Lines | `any` (file) | Path |
|------:|---------------:|------|
| 1247 | 2 | `src/apps/forms-builder/front-end/App.vue` |
| 1077 | 0 | `src/apps/forms-builder/front-end/components/PropertyEditor.vue` |
| 1015 | 3 | `src/shared/composables/components/useLabDashboard.ts` |
| 932 | 0 | `src/apps/crm/front-end/components/EntityRecordsView.vue` |
| 893 | 2 | `src/apps/forms-builder/front-end/components/ConnectorManagement.vue` |
| 848 | 0 | `src/shared/composables/components/app-view-layout-utils.ts` |
| 784 | 3 | `src/backend/AppManager.ts` |
| 671 | 0 | `src/apps/help-desk/front-end/App.vue` |
| 631 | 0 | `src/apps/crm/front-end/components/EntityAdmin.vue` |
| 623 | 0 | `src/dashboard/components/app/About.vue` |
| 594 | 4 | `src/backend/routes/appRoutes.ts` |
| 575 | 0 | `src/backend/mcp/mcp-servers/persona/utils/persona-manager-utils.ts` |
| 564 | 4 | `src/backend/utils/chat/utils.ts` |
| 546 | 6 | `src/backend/utils/mcp-utils.ts` |
| 537 | 0 | `src/backend/mcp/mcp-servers/apps/utils/app-manager-base-handlers.ts` |
| 529 | 5 | `src/backend/AppDatabaseService.ts` |
| 512 | 12 | `src/backend/routes/utils/auth-routes-utils.ts` |
| 510 | 13 | `src/backend/ai/providers/openai-provider.ts` |
| 506 | 9 | `src/shared/composables/components/useMessageInput.ts` |
| 503 | 0 | `src/apps/forms-builder/front-end/components/form-designer/DesignCanvas.vue` |
| 498 | 0 | `src/backend/mcp/mcp-servers/apps/utils/app-manager-db-handlers.ts` |
| 490 | 2 | `src/backend/utils/template-manager.ts` |
| 477 | 1 | `src/shared/services/ui-automation-handler.ts` |
| 473 | 0 | `src/apps/crm/back-end/db/bootstrap.ts` |
| 472 | 0 | `src/apps/help-desk/front-end/components/HelpDeskKanbanTab.vue` |

## `any` hotspots (`backend/routes` + app `back-end`)

| `any` count | Lines | Path |
|-------------:|------:|------|
| 16 | 287 | `src/apps/forms-builder/back-end/routes/connectors.ts` |
| 12 | 512 | `src/backend/routes/utils/auth-routes-utils.ts` |
| 10 | 176 | `src/apps/task-list/back-end/utils/appRoutes.ts` |
| 4 | 594 | `src/backend/routes/appRoutes.ts` |
| 4 | 293 | `src/apps/ai-tunes/back-end/server.ts` |
| 3 | 94 | `src/apps/forms-builder/back-end/utils/transaction-manager.ts` |
| 2 | 218 | `src/apps/forms-builder/back-end/middleware/request-tracing.ts` |
| 2 | 123 | `src/apps/forms-builder/back-end/routes/load.ts` |
| 2 | 167 | `src/apps/forms-builder/back-end/server.ts` |
| 2 | 136 | `src/apps/forms-builder/back-end/services/form-service.ts` |
| 2 | 150 | `src/apps/forms-builder/back-end/utils/api-version.ts` |
| 2 | 223 | `src/apps/forms-builder/back-end/utils/circuit-breaker.ts` |
| 1 | 101 | `src/backend/routes/appEndPoints.ts` |

## Runtime hooks (Phase 0.2)

| Signal | Where |
|--------|--------|
| `[TEMPLATE-MANAGER] init() completed in …ms` | `template-manager.ts` |
| `fetchRepoFiles(): … (call #N)` | `file-helpers.ts` — `getFetchRepoFilesCallCount()` |

---

_Phase 0 gate: store this file + green CI (**0.3**, **0.6**)._

**Phase 2 verification:** see [metrics-phase-2.md](./metrics-phase-2.md) (**2.6**).
