# App system instructions (agent context)

**App system instructions** are per-app markdown loaded into the Lab Assistant system message when the user works in that app (Laboratory with app context, Sidecar with `focusedAppId`, `app_management_get_app`, etc.). They are **not** the same as persona rules or `sysMsg.md`.

Stale instructions are a common cause of wrong agent behavior (e.g. describing legacy FormMounter flows after an rm-64 `LabIntegrationSurface` rework).

---

## Source of truth (code)

| Piece | Location |
|-------|----------|
| Instruction bodies | `src/backend/db/Apps/app-instructions/{topic}-app-instructions.ts` — export a markdown string constant |
| DB column | `apps.app_system_instructions` (main SQLite `db/the_lab.db`) |
| Sync into DB | `AppsRepository.syncSeededAppSystemInstructions()` on repository `initialize()` — **overwrites** instructions for registered seeded apps |
| New app row (first install) | `apps-schema.ts` `INSERT OR IGNORE` may embed initial text; ongoing edits use the `app-instructions/` file + sync |

When you add a **new** seeded app with instructions:

1. Add `app-instructions/{app-id}-app-instructions.ts`.
2. Import it in `apps-repository.ts` and append to the `pairs` array in `syncSeededAppSystemInstructions()`.
3. Wire the initial seed in `apps-schema.ts` if the app is created there.

---

## Required step on every app rework

Any phase that changes **how agents should use or automate an app** must update that app’s instruction file in the **same phase** (or an explicit follow-up row on the tracker), including:

- UI structure, selectors, and `contextArea` hints for UI automation
- Create/edit flows (forms, dialogs, integrations, bindings vs hard-coded keys)
- Dependencies, ports, and which MCP/HTTP APIs to call for **product** behavior
- rm-64 hosts: `LabIntegrationSurface` slots, and **`lab_integrations_get_manifest` + `lab_integrations_list_bindings`** for “what’s wired” — not host connector route surveys alone

**Definition of done for an app rework phase:** code + tests + **updated `*-app-instructions.ts`** + **main backend restart** so `syncSeededAppSystemInstructions()` runs.

### Verify after update

1. Restart the **main** THE-LAB backend (`npm run back-end` or `npm run dev`).
2. In Laboratory (Code persona), call **`app_management_get_app`** for the app id and confirm `appSystemInstructions` matches the new markdown (integration slots, not obsolete components).
3. Optional: Sidecar with that app focused — behavior should match the same instructions appendix.

---

## Prompt stack (rm-68 / integrations)

App instructions sit **above** repo file lists and **below** platform `sysMsg.md`. They must **agree** with:

- `src/shared/templates/sysMsg.md` (platform rules)
- `src/shared/templates/lab-integrations/*` when the app is an integration host or provider

See pending roadmap [rm-68](../../plans/roadmap/rm-68-agent-app-awareness.md) (agent prompt coherence).

---

## Seeded user copy (demo & integration stubs)

Roadmap and programme ids (`rm-64`, `rm-67`, …) belong in `plans/`, `docs/roadmap.md`, agent handoffs, and code **comments** — **not** in strings persisted for product UI (form/chart descriptions, demo record titles, default tool blurbs in the main DB seed, workflow demo labels).

Use domain language instead: **integration stub**, **demo workflow**, **catalog demo pack**. Integration form stubs use `buildIntegrationStubFormDescription()` (`src/shared/lab-integrations/integration-stub-markers.ts`).

**Guard:** `npm run verify:seed-copy` (rm-67.1).

**Legacy DB copy:** Main backend startup runs an idempotent backfill for Forms/Chart Builder rows whose descriptions still contain `(rm-64)`. Manual run: `npm run backfill:integration-stub-copy` (add `--dry-run` to preview).

---

## Related

- Sidecar context: [lab-sidecar.md](./lab-sidecar.md)
- Integration wizard: [lab-app-integrations.md](./lab-app-integrations.md) · templates `src/shared/templates/lab-integrations/wizard-phase-*.md`
- Programme handoffs: [AGENT-HANDOFF.md](../../AGENT-HANDOFF.md) → `plans/{feature-id}/`
