# rm-68 — Agent app awareness & prompt coherence

**Status:** ✅ Closed 2026-11-12 — light straggler pass (catalog pin/tags/filter automation); tracks A–C deferred to ongoing hygiene · [closeout](../../docs/archive/programmes/rm-68/EXECUTOR-CLOSEOUT.md) · [tracker](../../rm-68/IMPLEMENTATION-TRACKER.md)  
**Roadmap:** [docs/roadmap.md](../../docs/roadmap.md) (rm-68)

**Goal:** One coherent prompt stack for **app usage, creation, integrations, and Sidecar** — no contradictions between `sysMsg.md`, personas, Sidecar appendices, and per-app system instructions.

## Tracks

| Track | Deliverable |
|-------|-------------|
| **A. Inventory** | Map every layer that reaches the model (sysMsg, user instructions, persona, Sidecar, app instructions, integration templates). |
| **B. Conflict fixes** | Align App Builder vs integration vs Code-persona routing; document in [docs/platform/app-system-instructions.md](../../docs/platform/app-system-instructions.md). |
| **C. App intelligence** | Richer seeds + `app_management_get_app`; when to use connectors, Forms/Chart patterns. |
| **D. Sidecar vs Laboratory** | Rules per `toolProfile` / view mode. |

## Phasing (within rm-68)

1. **Inventory** — Map prompt layers + conflict fixes (no new product features).  
2. **Integration playbooks** — Sidecar `integration` profile + sysMsg/Sidecar alignment.  
3. **Per-catalog-app instruction packs** — Deeper seeds where needed.

**Roadmap siblings:** [rm-68.1](./rm-68.1-sidecar-shell-features-awareness.md) (closed) — shell overlays; [rm-68.2](./rm-68.2-ui-automation-tagging-audit.md) — list/catalog CRUD tagging; [rm-68.3](./rm-68.3-ui-automation-discovery-refactor.md) (closed) — `searchPattern` / `elementRef`; [rm-68.4](./rm-68.4-lab-shell-ui-automation.md) — **workspace + catalog chrome** UI automation (launch search vs launcher sidebar, tabs, split, rails) — recommended before rm-68; [rm-68.5](./rm-68.5-quarks-game-hints.md) — **queued after rm-68** — Quarks-purchased **UI overlay** hints (not Sidecar/agent aim hints).

## Key files

- `src/shared/templates/sysMsg.md`
- `src/backend/utils/format-lab-sidecar-system-prompt.ts`
- `src/shared/templates/lab-integrations/`
- `src/backend/db/Apps/app-instructions/*.ts`

## References

- [lab-sidecar.md](../../docs/platform/lab-sidecar.md)
- [lab-app-integrations.md](../../docs/platform/lab-app-integrations.md)
- [app-system-instructions.md](../../docs/platform/app-system-instructions.md)
