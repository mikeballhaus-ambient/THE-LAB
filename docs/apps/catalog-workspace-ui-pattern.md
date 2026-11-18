# Catalog workspace UI pattern (Wave C)

Non-game catalog apps share the same shell layout:

1. **Header** — `lab-app-header shrink-0`, title, actions.
2. **Reports** — `CatalogAppReportsSection` (rule 13 section card). **Two chart slots** per app when reports exist, so the grid stays visually balanced.
3. **Workspace** — `CatalogAppFormSection` with `catalog-app-workspace-section` (scrollable).

## Master + child records

When the domain is **one primary entity with child rows** (objective → key results, trip → itinerary items, charter → scope fields, checklist → tasks, event → RSVPs, property → leases, asset → tasks, poll → options):

- Stack masters in **`ul.catalog-master-list`** → **`li`** → **`section.lab-form-section.catalog-master-record`**.
- Show summary on the master (title, meta, actions, optional `lab-form-section__lead`).
- One **`Accordion`** per master (`catalog-details-accordion`), collapsed by default — use **`useCatalogSingleAccordion()`** from `@/shared/composables/catalog/useCatalogSingleAccordion`. Bind PrimeVue 4 with **`:value="accordionValue(id)"`** and **`@update:value="(v) => onAccordionChange(id, v)"`** (not `model-value`).
- Child content lives inside **`AccordionContent`** (nested `lab-form-section--nested` blocks for labeled detail groups, or a simple list for line items).
- **Item lists inside accordion content:** **`ul.catalog-accordion-item-list`** with one **`li`** per row — alternating row surfaces and **muted dividers** between rows via platform CSS (**AGENTS.md §17**). Use **`catalog-accordion-item-list--cards`** for card-shaped `li` rows (quiz questions); **`catalog-accordion-item-list__row--emphasis`** for the highlighted “next” task row.

- Shared styling lives in **`src/assets/styles/platform-catalog-app.css`** (`.catalog-master-list`, `.catalog-details-accordion`, `.catalog-details-inner`, `.catalog-detail-text`, **`.catalog-accordion-item-list`**).
- **Toasts:** use **`useLabAppToast()`** (or `useToast()`) only — the lab shell renders one **top-center** toast; do **not** add `<Toast>` in catalog `App.vue` (PrimeVue’s global bus would duplicate every message).

**Scrolling:** Only **`catalog-app-workspace-section`** scrolls (`overflow-y: auto` in platform CSS). The master list must not set its own `overflow-y` or `flex: 1` scroll trap — with one record the workspace stays still; with many records or expanded accordions, the workspace section scrolls as a whole.

## Flat single-entity apps

Expense reports, suggestion box, job applicant kanban, and time tracking use the same **reports + workspace** sections but **no master/accordion** (single table/board or split panels). Each row or card uses **`catalog-master-list`** + **`catalog-master-record`** (or nested **`lab-form-section--nested`** for kanban columns and time-tracking panes). Use **`lab-*`** tokens only.

## Live updates (required)

Catalog hosts must keep the workspace in sync when data changes elsewhere (workflow **`integration_update`**, another user, or connector CRUD):

1. **Server** — `createAppServer({ attachSocketIO: true, catalogHostAppId: 'app-…' })` so successful `/api/` writes emit **`catalog-host:data-changed`** ([`catalog-host-socket-events.ts`](../../src/shared/types/catalog-host-socket-events.ts)).
2. **Client** — `useCatalogHostLiveRefresh({ hostAppId, serverUrl: () => base.value, onRefresh })` in `App.vue`; reload lists and bump **`chartContext.dataRevision`** when using `CatalogAppReportsSection`.

See **AGENTS.md §15** and [`useCatalogHostLiveRefresh.ts`](../../src/shared/composables/catalog/useCatalogHostLiveRefresh.ts).

**Training & quizzes** uses the master + accordion pattern: quiz masters with **Questions & attempt** accordion (replaces the old split-pane layout).

## Exceptions

- **Weather dashboard** — no chart slots (live conditions only); do not rework for catalog polish.
- **Knowledge base** — hybrid doc browser; reports + custom article UI.
- **OKR / Travel / Project Charter** — verified reference layouts; optional shared-class cleanup only when owner allows edits.

After chart slot changes, restart the **main backend (:3000)** so integration chart stubs and bindings reprovision.

## UI automation (record lists)

Catalog and Settings list surfaces share the same row-action contract for Sidecar / Laboratory automation:

| Piece | Convention |
|-------|------------|
| Row wrapper | `data-catalog-primary-id` on the list `li` (deep link / scroll) |
| Edit / delete (table or master header) | [`LabRecordRowActions.vue`](../../src/shared/ui/LabRecordRowActions.vue) or `labRecordActionRootAttrs()` on PrimeVue `:pt.root.attrs` |
| Stable click target | `button[data-lab-record-id="<id>"][data-lab-record-action="edit"]` |
| Name search | `searchPattern` matches `data-lab-record-name` even when the control is icon-only |

Helpers live in [`lab-record-automation.ts`](../../src/shared/constants/lab-record-automation.ts). Per-row element ids must include the record id (`generateUniqueId(\`polls-edit-${poll.id}\`)`) — never a bare `generateUniqueId('…-edit')` inside `v-for` (duplicate ids).

Forms Builder save/cancel bars should use the same `data-lab-record-action` values (`save` | `cancel`) when the dialog is tied to a known record id.
