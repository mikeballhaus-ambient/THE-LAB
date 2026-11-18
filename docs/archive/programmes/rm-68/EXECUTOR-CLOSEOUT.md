# rm-68 — Executor closeout

**Closed:** 2026-11-12  
**Programme:** Agent app awareness & prompt coherence (parent; siblings rm-68.1–68.4)

## Scope for this closeout

Rm-68 **siblings** shipped shell overlays, UI automation tagging, discover refactor, and workspace/catalog chrome (**68.1–68.4**). The parent item originally listed a full **sysMsg / persona / Sidecar / app-instruction inventory** ([plan](../../../../plans/roadmap/rm-68-agent-app-awareness.md) tracks A–D).

**Owner decision:** Close the parent after a **light straggler pass** — catalog actions Sidecar users expect (pin, edit tags, category filters) — rather than a repo-wide prompt rewrite. Tracks A–D remain **ongoing hygiene** (edit prompts when touching features; no separate programme).

## Delivered (straggler pass)

- **Catalog pin / favorite:** `toggle-pin`, `catalog-pin`, discover pool + Sidecar/MCP/docs ([lab-ui-automation.md](../../../platform/lab-ui-automation.md)).
- **Catalog edit tags (permissioned):** `edit-tags`, `catalog-edit-tags`, app-scoped attrs on grid **Tags** link; modal `lab-app-catalog-tags-dialog`.
- **Category filters:** `filter-tag`, `catalog-tag-filter`; discover on apps home with tag label `searchPattern` (e.g. Games).
- **Tests:** `ui-automation-catalog-discover`, `format-lab-sidecar-system-prompt`.

## Already shipped under rm-68.* (reference)

| Id | Focus |
|----|--------|
| [68.1](../rm-68.1/EXECUTOR-CLOSEOUT.md) | Sidecar shell overlays |
| [68.2](../rm-68.2/EXECUTOR-CLOSEOUT.md) | Record/catalog CRUD attrs |
| [68.3](../rm-68.3/EXECUTOR-CLOSEOUT.md) | Discover → `elementRef` |
| [68.4](../rm-68.4/EXECUTOR-CLOSEOUT.md) | Workspace + catalog chrome; Sidecar Tasks/Files; split-eligible panes |

## Pre-PR

`npm run test:pipeline` **deferred** by owner (batch before PR). Targeted tests run on catalog/Sidecar changes in this pass.

## Follow-up

- **rm-68.5** — Quarks UI overlay game hints ([plan](../../../../plans/roadmap/rm-68.5-quarks-game-hints.md)).
- **Prompt inventory (optional):** When editing `sysMsg.md`, personas, or app instructions, use [app-system-instructions.md](../../../platform/app-system-instructions.md) + [lab-sidecar.md](../../../platform/lab-sidecar.md); no dedicated tracker.
