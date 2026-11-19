# rm-72 — Workflow automation expansion (active programme)

**Status:** ✅ Completed (2026-11-19) — owner-verified guinea pig ([rm-72.2](./rm-72.2-platform-session-virtual-bank-workflows.md)); follow-on backlog [rm-72.3](./rm-72.3-additional-workflow-opportunities.md).  
**Roadmap:** [docs/roadmap.md](../../docs/roadmap.md) (rm-72)  
**Tracker:** [plans/rm-72/IMPLEMENTATION-TRACKER.md](../rm-72/IMPLEMENTATION-TRACKER.md)  
**Prerequisites (done):** [rm-69.6](./rm-69.6-decentralize-domain-event-catalog.md) · [rm-69.7](../../docs/roadmap.md) · [rm-71](../../docs/roadmap.md)

---

## Goal

**Expand Workflow Studio** with new **platform action** step kinds and prove them on a **guinea pig** graph: login → get wallet → **if** → credit daily Quarks → **toast** (success / skip / failure paths).

KB **rm-72.1** is cancelled. **rm-72.2** (Quarks login workflow) shipped and verified. Next planning lives in **rm-72.3**.

---

## Workstreams

| Id | Plan | Status | Summary |
|----|------|--------|---------|
| rm-72.2 | [Quarks allotment guinea pig](./rm-72.2-platform-session-virtual-bank-workflows.md) | ✅ Done | `virtual_bank_get_wallet`, `virtual_bank_credit_daily_allotment`, `show_user_toast` + `platform.auth.session.established` |
| rm-72.3 | [Additional workflow opportunities](./rm-72.3-additional-workflow-opportunities.md) | 📋 Backlog | Triggers, step kinds, catalog/platform reference graphs |
| rm-72.1 | [KB agent view](./rm-72.1-kb-workflow-rag-and-agent-view.md) | ⏭ Cancelled | — |
| rm-69.6 / 69.7 | — | ✅ | Architecture + hygiene |

---

## Design principles

1. **Composable steps** — business rules stay in domain services; graphs **compose** reads, IF, writes, UX.
2. **Existing routers** — use **`if_condition`** (no custom “wallet if” node).
3. **Idempotent credit** — credit step uses repository accrual semantics, not arbitrary `adjust` deltas in JSON.
4. **Toasts ≠ notifications** — `show_user_toast` is a new shell channel; `notify_users` stays bell inbox.
5. **Guinea pig in seed pack** — demo workflow is the reference other platform automations copy.

---

## Programme exit

| Criterion | Check |
|-----------|--------|
| New platform steps shipped + Studio palette | Owner |
| Demo workflow on `session.established` | Owner smoke |
| `npm run test:pipeline` | Green |

## Child plans

- [rm-72.2](./rm-72.2-platform-session-virtual-bank-workflows.md) — completed  
- [rm-72.3](./rm-72.3-additional-workflow-opportunities.md) — backlog  