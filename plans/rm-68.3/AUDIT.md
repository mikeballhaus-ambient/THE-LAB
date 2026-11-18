# rm-68.3 — UI automation discovery audit (2026-11-12)

## Pipeline

```
MCP ui_automation_discover_elements
  → backend socket emit UI_AUTOMATION_DISCOVER_REQUEST
  → Lab dashboard UIAutomationHandler.enumerateInteractiveElements (browser)
  → socket UI_AUTOMATION_DISCOVER_RESPONSE
  → buildUiAutomationDiscoverToolMessage (may truncate large JSON)
  → model reads elements[].elementRef + target

MCP ui_automation_element_action
  → socket → executeBatchActions
  → resolveUiAutomationElement(elementRef | target)
  → click / setValue / …
```

## Gaps found (pre-refactor)

| Issue | Impact | Fix (rm-68.3) |
|-------|--------|----------------|
| `new RegExp(pattern)` on agent text | CSS-like patterns, quotes → zero hits | `compileUiAutomationSearchPattern` — literal default |
| `div[class]` in scoped discover | Hundreds of nodes, pagination loops | Context profiles + catalog launch selector |
| Launch button text only "Launch" | Name search on text failed | `data-app-*`, `aria-label`, search on attrs |
| No `elementRef` | Fragile class stacks on act | `data-lab-ui-automation-ref` + schema |
| Empty discover → generic message | Model kept paging | `resultMessage` + pattern echo in tool text |
| `resultMessage` dropped in MCP | Hints never reached model | `buildUiAutomationDiscoverToolMessage` options |

## Residual risks

- **10s discover timeout** on very large unscoped trees — mitigated by profiles + `searchPattern` warning.
- **Tool result truncation** — prefer small `totalCount` via pattern; attrs live in JSON until truncated.
- **Teleported dialogs** — use `lab-settings-dialog` / `p-dialog-mask` context, not app root alone.
- **Sidecar discover response** requires active assistant placeholder in session (existing chat wiring).

## Verification

- CI: `ui-automation-search-pattern`, `ui-automation-target`, `lab-record-automation`
- Manual: Sidecar apps home → discover `Workflow Studio` → act `elementRef` → workspace tab
