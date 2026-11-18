# Agent handoff — read this first

Agents: read this file at session start, then do the **Next action** below. Rules: [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md).

| Field | Value |
|---|---|
| **Last updated** | 2026-11-18 |
| **Active programme** | **rm-69.6** complete — next: owner **rm-71** OSS launch or product backlog |
| **OSS (rm-71)** | **Unblocked** — [`plans/the-lab-github-oss-launch.md`](../plans/the-lab-github-oss-launch.md) |
| **Pre-PR gate** | `npm run test:pipeline` (owner: batch before PR) |

---

## Next action (executor)

| Step | What |
|------|------|
| 1 | Owner: run **`npm run test:pipeline`** and sign off rm-69.6; then resume **rm-71** if desired. |
| 2 | New app domain events: edit `src/apps/<dir>/shared/lab-domain-events.manifest.ts` + `domain-event-manifest-index.ts`; run `npm run verify:domain-event-manifests`. |

---

## References

| Need | Doc |
|------|-----|
| Product backlog | [docs/roadmap.md](docs/roadmap.md) |
| Domain events (authoring) | [docs/platform/lab-domain-events.md](docs/platform/lab-domain-events.md) |
| Manifest aggregator (CI/backend) | [src/shared/lab-domain-events/aggregate-domain-event-catalog.ts](src/shared/lab-domain-events/aggregate-domain-event-catalog.ts) |
| rm-69.6 plan | [plans/roadmap/rm-69.6-decentralize-domain-event-catalog.md](plans/roadmap/rm-69.6-decentralize-domain-event-catalog.md) |

---

## Session end

Update programme tracker and this file when switching programmes.