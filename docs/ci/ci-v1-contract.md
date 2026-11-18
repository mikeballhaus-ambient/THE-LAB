# CI v1 contract (vendor-neutral)

**Decision:** [rm-46 D-06](../../plans/roadmap/rm-46-team-review-summary.md#d-06--recorded-outcome-2026-10-04)  
**Implementation:** [azure-pipelines.yml](../../azure-pipelines.yml) (Azure DevOps today)

THE-LAB’s regression gate is defined by **npm scripts**, not by a specific CI vendor. Migrating to GitHub Actions (e.g. if the canonical repo moves to public GitHub) should reuse the same steps.

## When it runs

- Pull requests targeting `master`
- Pushes to `master` (optional post-merge signal; configured in pipeline)

## Required steps (order)

| Step | Command | Notes |
|------|---------|--------|
| Install | `npm ci` | Uses `package-lock.json` |
| Lint | `npm run lint` | Full repo (`eslint.config.js`; includes `src/apps/**`) |
| Types | `npm run type-check` | Full repo (`tsc` + `vue-tsc`); apps, tests, and `src/shared/forms/**` included |
| Test tiers | `npm run verify:test-tiers` | Asserts the two test groupings are well-formed (see below) |
| Unit tests | `npm run test:ci` | Jest ESM; **the fast gate only** — 158 of 356 suites |
| Build | `npm run build` | Vite production build; includes `lint-the-lab-apps` via Vite plugin |

**Pre-PR locally (recommended):** `npm run test:pipeline` runs the Azure steps above **plus**
`npm run verify:domain-event-manifests` before `test:ci` (manifest index ↔ disk; see
[lab-domain-events.md](../platform/lab-domain-events.md)). Azure PR YAML may omit that script until
the pipeline is updated — contributor workflow still expects the full `test:pipeline` chain.

## Test groupings

Jest suites live in one of two directories, and the path **is** the tier:

| Grouping | Command | Contents | Runs where |
|---|---|---|---|
| **CI gate** | `npm run test:ci` | `src/tests/ci/**` — 158 suites (44%). Pure lab core: no real SQLite, no `@/backend/**` import, no MCP/AppManager boot. Excludes workflow-engine, mcp-tools and ui-automation. | Azure, every PR |
| **Full lab regression** | `npm run test:regression` | **Every suite Jest resolves** — 356. Includes the `ci` tier. | Local, and by hand before a risky merge |

`test:regression` runs a bare `jest`, so it is a superset of the gate, not a sibling of it.
`src/tests/regression/**` is simply where the suites the gate skips are kept.

`npm run test` remains an alias for the full run. `npm run verify:test-tiers` enforces that no suite
sits outside the two directories, that the gate contains nothing DB- or backend-backed, and that
`test:regression` still resolves to the full suite.

Rationale and the analysis behind the split: [test-suite-runtime-options.md](../../plans/the-lab-optimization/test-suite-runtime-options.md).

**Optional shortcuts (not CI):** `npm run lint:ci` / `npm run type-check:ci` — platform-only subsets (legacy; merge readiness = full `lint` + `type-check`).

## Out of scope (CI v1 job)

- ChromaDB, `npm run dev`, or spawned app servers
- Secrets (not required for the steps above)
- The full Jest suite — the gate runs `test:ci` only. DB-backed and MCP-booting suites run in the
  full regression locally (and are the intended next target for a nightly job).

## Playwright smoke (D-07 / 5.3 — **not** a PR merge gate)

- **Azure PRs to `master`:** **CI v1 only** ([`azure-pipelines.yml`](../../azure-pipelines.yml)) — smoke is **out of scope** for the default pipeline (flake/cost on hosted agents).
- **When to run smoke:** Before changes to lab shell launch, catalog, auth gate, or `AppLifecycle` / component loading; optional before release.
- **Local:** `npm run test:smoke` (starts stack, runs Playwright, stops stack) or `npx playwright test --project=smoke` with `SMOKE_SKIP_LAB_STACK=1` if the stack is already up.
- **Azure (manual):** Optional pipeline [`azure-pipelines-smoke-manual.yml`](../../azure-pipelines-smoke-manual.yml) — register in DevOps and run on demand (not on every PR).
- **Design:** [playwright-smoke-v1.md](../../plans/the-lab-optimization/playwright-smoke-v1.md) (if present).

## Agent OS

- **Primary:** Linux (`ubuntu-24.04` on Azure Pipelines — pinned because `ubuntu-latest` may advance before Playwright supports new images)
- Add a **Windows** job only if a step fails due to OS-specific tests or tooling

## Known follow-up (Phase 0)

- **Jest vs Playwright:** E2E specs under `src/apps/forms-builder/front-end/tests/e2e/` are excluded from Jest (`jest.config.cjs`); wire Playwright in **D-07**.
- **Failing unit tests (blocks green CI):** Tracked in [plans/the-lab-optimization/ci-test-debt.md](../../plans/the-lab-optimization/ci-test-debt.md) — IMPLEMENTATION-PLAN tasks **0.6** + Phase 0 gate.
- **Full-repo gates (2026-10-11):** Azure uses **`npm run lint`** and **`npm run type-check`** (replaces scoped `:ci` steps). Verify locally: `npm run lint && npm run type-check && npm run test && npm run build`.
- Before marking Phase **0.3** complete, enable the Azure pipeline and record **first green run on `master`**. **Scheduling:** closeout is **post-implementation testing/rework** (**DEV-003**), after feature work on the integration branch; local v1 chain remains the day-to-day gate until then.

## Azure DevOps setup (one-time)

1. Create or use a pipeline that loads **`azure-pipelines.yml`** from this repo.
2. Enable **PR validation** on branch policy for `master`.
3. Confirm first run is green before treating Phase 0 gate as met.

## GitHub Actions

- Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — same steps as Azure above.
- Maintainer setup (fresh public history, PRs, branch protection): [github-setup.md](../operations/github-setup.md).
- Do not maintain dual CI long term — use GitHub Actions for the public repo.

## Lab stack for E2E

Playwright smoke starts/stops THE-LAB via **`npm run lab:start`** / **`npm run lab:stop`** ([lab-stack-lifecycle.md](../../plans/the-lab-optimization/lab-stack-lifecycle.md)), not `.vscode/launch.json`.
