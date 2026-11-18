# Lab UI automation (discover → act)

MCP tools **`ui_automation_discover_elements`** and **`ui_automation_element_action`** drive the live Lab dashboard DOM (Laboratory and Sidecar on the apps workspace). They are **not** a substitute for app HTTP APIs.

There is **no** MCP tool to **launch** or **teardown** apps — agents use discover + click on catalog Launch / `close-tab` rows and workspace tab **`close-app`** controls (`contextArea: lab-workspace-tabbar` or `app-view-layout`).

## Discover

| Parameter | Use |
|-----------|-----|
| `contextArea` | Class substring on a shell region, e.g. `app-list-container`, `lab-workspace-tabbar`, `lab-catalog-sidebar-rail`, `lab-running-apps-rail`, `crm-app`, `settings-container` |
| `searchPattern` | **Plain substring** (case-insensitive) — app name, record title, registry id (`app-lab-crm`). Not a CSS selector; quoted values inside selector-shaped strings are extracted. **Several words:** split into tokens (layout noise like `header` / `toolbar` dropped); match if **any** token hits the control — e.g. `cancel back exit close` finds **Cancel**; ranking favors rows that match more tokens (e.g. both `webhook` and `loop` on a workflow title) |
| `maxResults` / `skip` | Pagination **after** filtering — avoid paging without `searchPattern` |

Every tool result includes a **`Discover pagination:`** block. If it says **MORE MATCHES EXIST**, call discover again with the same `contextArea` / `searchPattern` and the printed `skip=` (do not guess). `Match summary: totalCount=…, returnedInJson=…` repeats the counts.

Each element in the result includes:

- **`elementRef`** — stable id written to the DOM (`data-lab-ui-automation-ref`). **Use this for the next tool call.**
- **`target`** — canonical selector when available (`data-app-id` + catalog launch, `data-lab-record-*`, otherwise data attrs / ref selector)
- **`uiRole: "catalog-launch"`** + **`catalogLaunch`** — apps home only; the **Launch** button for that app (hero carousel and tag sections). `searchPattern` matches **display name / registry id on the button or parent card** — grid buttons often show only the label “Launch”.
- **`uiRole: "catalog-pin"`** + **`catalogLaunch`** — apps home only; the **star** control next to Launch (`data-lab-catalog-action="toggle-pin"`, aria-label **Pin app** / **Unpin app**). Same `searchPattern` matching as Launch (app id/name on the button or card).
- **`uiRole: "catalog-edit-tags"`** + **`catalogLaunch`** — permissioned **Tags** link on grid cards (`data-lab-catalog-action="edit-tags"`). Modal: `lab-app-catalog-tags-dialog`.
- **`uiRole: "catalog-tag-filter"`** — category nav chips (`data-lab-catalog-action="filter-tag"`); match with `searchPattern` = tag label (e.g. `Games`).
- **`uiRole: "record-action"`** + **`recordAction`** — list/table row edit, delete, or create (`data-lab-record-id`, `data-lab-record-name`, `data-lab-record-action`). Use `searchPattern` on the **record name** (e.g. workflow title), not the word “edit”.
- **`uiRole: "workspace-tab"`** + **`shellAction`** — tab bar: `focus-app-tab`, `close-app`, `minimize-app` (`data-lab-shell-action`, `data-lab-target-app-id`).
- **`uiRole: "workspace-layout"`** — Tabs / Split ↔ / Form designer pills.
- **`uiRole: "shell-rail"`** — expand/collapse app launcher or running-apps rail; `restore-app` on minimized apps.
- **`uiRole: "catalog-launch"`** — grid/sidebar **Launch** or running row **`close-tab`** (`data-lab-catalog-action`).
- **`parentContextHTML`** is omitted on catalog Launch rows to avoid mistaking nearby title text for the click target

**Apps home without `searchPattern`:** Launch buttons are **not** returned (only catalog toolbar controls). Always pass the app name or id in `searchPattern`.

Context profiles narrow which nodes are scanned (catalog launch/toolbar only in `app-list-container`; no layout `div` flood). Without `searchPattern`, discovery may return a warning when too many nodes match.

## Act

```json
{
  "actions": [
    { "order": 1, "elementRef": "<from discover>", "action": "click" }
  ]
}
```

`target` from the same discover row is an acceptable fallback if `elementRef` is missing. Re-run discover if the DOM changed (Vue re-render, tab switch).

## Catalog launch (Sidecar apps home)

Sidecar’s system appendix includes the **full enabled app registry** (id, name, description by category) on the apps workspace (catalog-only **or** while other apps are open).

| Catalog UI | When | Launch discovery |
|------------|------|------------------|
| Full grid | No workspace tabs | `app-list-container`; **8 apps per category** until “Show all” |
| Compact sidebar | One or more apps running | `lab-app-catalog-sidebar` inside `app-list-container`; expand `lab-catalog-sidebar-rail` if collapsed (`lab-catalog-sidebar-launch`) |
| Running apps rail | Minimized/parked apps | `lab-running-apps-rail` — **Restore**, not Launch |

1. `contextArea: "app-list-container"` or `"lab-app-catalog-sidebar"`
2. `searchPattern: "<display name or registry id from registry table>"` — discover **auto-fills** `input.lab-catalog-search` when in **catalog launch** mode. A collapsed **app launcher sidebar** expands only when `contextArea` includes `lab-app-catalog-sidebar` (not on every `app-list-container` call).

While a **mounted app** is open, `app-list-container` is **not** launch mode: catalog search and the sidebar rail are **not** auto-opened. Use the focused app root class (e.g. `lab-workflow-studio-app`) for in-app row actions.
3. Click `uiRole: "catalog-launch"` via **`elementRef`**

### Pin / favorite (star)

Pinned apps appear in the **Pinned** section when catalog filters are cleared (Dexie persistence per user).

1. Same discover flow as launch (`app-list-container`, `searchPattern` = app name or id).
2. Click `uiRole: "catalog-pin"` (not Launch).

### Edit catalog tags (permissioned)

1. Discover app by name/id; click `uiRole: "catalog-edit-tags"`.
2. `contextArea: "lab-app-catalog-tags-dialog"` → Save / Cancel.

### Filter by category

`searchPattern: "Games"` (or other tag label) → click `catalog-tag-filter`.

## Related

- [lab-sidecar.md](lab-sidecar.md) — when UI automation is in scope
- `src/shared/constants/lab-record-automation.ts` — list row edit/delete attrs
- `src/shared/constants/lab-shell-ui-automation.ts` — catalog launch attrs
