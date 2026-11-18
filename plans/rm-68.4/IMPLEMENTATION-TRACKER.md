# rm-68.4 — Implementation tracker

**Plan:** [rm-68.4-lab-shell-ui-automation.md](../roadmap/rm-68.4-lab-shell-ui-automation.md)  
**Opened:** 2026-11-12  
**Closed:** 2026-11-12 — [EXECUTOR-CLOSEOUT.md](../../docs/archive/programmes/rm-68.4/EXECUTOR-CLOSEOUT.md)

**Constraint:** No MCP launch/teardown — UI automation only.

## Status

| Phase | Status | Notes |
|-------|--------|--------|
| A. Shell action contract + `uiRole` schema | ✅ Done | `lab-shell-workspace-automation.ts`; `shell-rail` + `shellAction` |
| B. Workspace tab bar + layout tagging | ✅ Done | `AppViewLayout.vue`, rails close/restore |
| C. Catalog chrome (rails, search launch playbook) | ✅ Done | Sidebar `isAppRunning`; `close-tab`; rail attrs |
| D. Discover intent / profile refactor | ✅ Done | `ui-automation-discover-intent.ts`; chrome pool |
| E. Sidecar workspace state + prompts | ✅ Done | `workspaceLayoutMode`; shell workspace appendix; Tasks/Files overlays |
| F. Docs + owner spot-check | ✅ Done | Owner Sidecar orchestration signed **2026-11-12** |

## Owner spot-check matrix (sign-off)

| # | Scenario | Pass |
|---|----------|------|
| 1 | Apps home: launch app via **Search** (not in first 8 of section) | Owner |
| 2 | Apps running: launch second app from **app launcher sidebar** | Owner |
| 3 | Switch active tab by app name | Owner |
| 4 | Enable **Split ↔** with two apps open | Owner |
| 5 | Expand **Open app launcher** rail on demand | Owner |
| 6 | Expand **running apps** rail; **Restore** minimized app | — |
| 7 | **Close tab** via `lab-workspace-tabbar` discover (`shellAction: close-app`) | Owner |
| 8 | **Close tab** from app launcher sidebar (`close-tab` on running row) | Owner |

## Pre-PR

- [ ] `npm run test:pipeline` (deferred — owner batch with next roadmap items)

## Closeout

- [x] `docs/archive/programmes/rm-68.4/EXECUTOR-CLOSEOUT.md`
- [x] `docs/roadmap.md` rm-68.4 → ✅
