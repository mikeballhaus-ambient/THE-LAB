# Agent handoff — read this first

Agents: read this file at session start, then do the **Next action** below. Rules: [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md).

| Field | Value |
|---|---|
| **Last updated** | 2026-11-19 |
| **Active programme** | **rm-72.3** — additional Workflow Studio opportunities ([plan](plans/roadmap/rm-72.3-additional-workflow-opportunities.md)). **rm-72** / **rm-72.2** (Quarks guinea pig) ✅ owner-verified **2026-11-19**. |
| **OSS (rm-71)** | ✅ Complete — public GitHub per roadmap |
| **Pre-PR gate** | `npm run test:pipeline` (owner: batch before PR) |

---

## Next action (executor)

| Step | What |
|------|------|
| 1 | Pick the first **rm-72.3** slice (see suggested sequencing in the plan) or wait for owner priority. |
| 2 | New app domain events: `src/apps/<dir>/shared/lab-domain-events.manifest.ts` + index; `npm run verify:domain-event-manifests`. |

---

## References

| Need | Doc |
|------|-----|
| Product backlog | [docs/roadmap.md](docs/roadmap.md) |
| rm-72 programme (closed) | [plans/roadmap/rm-72-workflow-automation-expansion.md](plans/roadmap/rm-72-workflow-automation-expansion.md) |
| rm-72.2 (shipped guinea pig) | [plans/roadmap/rm-72.2-platform-session-virtual-bank-workflows.md](plans/roadmap/rm-72.2-platform-session-virtual-bank-workflows.md) |
| rm-72.3 (active backlog) | [plans/roadmap/rm-72.3-additional-workflow-opportunities.md](plans/roadmap/rm-72.3-additional-workflow-opportunities.md) |
| Domain events (authoring) | [docs/platform/lab-domain-events.md](docs/platform/lab-domain-events.md) |

---

## Session end

Update programme tracker and this file when switching programmes.