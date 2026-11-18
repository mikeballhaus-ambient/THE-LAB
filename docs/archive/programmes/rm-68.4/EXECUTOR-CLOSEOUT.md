# rm-68.4 — Executor closeout

**Closed:** 2026-11-12  
**Programme:** Lab shell UI automation (workspace, catalog chrome, discover-only launch/close)

## Delivered

- **Shell contract:** `lab-shell-workspace-automation.ts`, `data-lab-shell-action`, `uiRole` + `shellAction` (`close-app`, layout modes, rails).
- **Workspace chrome:** `AppViewLayout.vue` tab bar, split/tabs/anchored, dependency toggle, minimize/restore rails.
- **Catalog chrome:** App launcher sidebar (full registry when apps running), search launch on apps home, `close-tab` on running rows.
- **Discover:** Shell slices in `ui-automation-discover-intent.ts`; workspace layout in Sidecar view context (`workspaceLayoutMode`).
- **Split fix:** Secondary pane picks **visible** apps only (not hidden dependency launches) — `app-view-layout-utils` + `useLabApps` eligible-app ids.
- **Sidecar UX (post-matrix):** Session **Tasks** and **Files** overlay strips under session tabs (Dexie session; overlay over chat, not Laboratory-only).
- **Docs:** [lab-ui-automation.md](../../../platform/lab-ui-automation.md) shell map; [lab-sidecar.md](../../../platform/lab-sidecar.md) Tasks/Files.

## Owner spot-check matrix

| # | Scenario | Pass |
|---|----------|------|
| 1 | Apps home: launch via **Search** (beyond first 8) | Owner |
| 2 | Launch second app from **app launcher sidebar** | Owner |
| 3 | Switch active tab by app name | Owner |
| 4 | **Split** with two user-visible apps | Owner (after split-eligible fix) |
| 5 | Expand **Open app launcher** rail | Owner (implicit in flow) |
| 6 | **Running apps** rail; **Restore** minimized | Not explicitly re-run this session |
| 7 | **Close tab** via tab bar discover | Owner (implicit in flow) |
| 8 | **Close tab** from launcher sidebar | Owner (implicit in flow) |

**Reference run (Sidecar, 2026-11-12):** Agent `todo_list` + UI automation — Expense Reports + Weather Dashboard, close apps siderail, split view — **executed correctly.**

## Pre-PR

`npm run test:pipeline` **deferred** by owner (batch with upcoming roadmap work). Re-run before merge/PR.

## Follow-up

- **rm-68** — closed 2026-11-12 ([closeout](../rm-68/EXECUTOR-CLOSEOUT.md)).
- **rm-68.5** — Quarks UI overlay hints (active).
