# AGENTS.md

Agent rules for THE-LAB (agentic platform; product work lives in **`src/apps/`**). Roo Code loads this file by default under **Agent Rules Standard (AGENTS.md)**. Cursor uses **`.cursorrules`** as the day-to-day contract; use this file for shared, tool-agnostic rules.

**Long-form architecture:** [CLAUDE.md](CLAUDE.md) · **Operational detail (apps, MCP, theming):** [.cursorrules](.cursorrules)

---

## Non-negotiable

1. **App registry metadata** (id, name, `order`, `faIcon`, type, port, `isEnabled`, dependencies): **App Management** MCP/tool only — not ad-hoc SQL or hand-edited seeds unless maintaining platform seeds.
2. **App behavior / UI / APIs:** `src/apps/{app-id}/**` only.
3. **Platform** (`src/backend`, `src/dashboard`, `src/shared`, `src/services`): only when the task needs host/MCP/chat; minimal diffs, match existing patterns.
4. **3rd-party libs in apps:** **Context7** (or current docs) before implement/upgrade.
5. **`src/apps` interactive UI:** **`useUniqueElementId()`** on every native control and PrimeVue (`:pt` root `id` or `:id`). Build/lint gate enforces this.
6. **Non-Forms-Builder forms must match the integration-form styling.** Any dialog or inline form built by hand in an app (city pickers, wizards, settings modals — anything *not* rendered through Forms Builder) **must** reuse the same chrome and control treatment as the integration dialogs. Reference implementation: [`src/apps/weather-dashboard/front-end/components/CityPickerDialog.vue`](src/apps/weather-dashboard/front-end/components/CityPickerDialog.vue).
   - Dialog root: `class="lab-app-dialog lab-form-runtime"` plus a component-specific class.
   - Define the chrome tokens on the dialog root: `--lab-integration-chrome-bg`, `--lab-integration-body-bg`, `--lab-integration-field-bg`, `--lab-integration-field-border`, `--lab-form-control-bg`, `--lab-form-control-border` (copy from [`.lab-integration-dialog`](src/assets/styles/lab-form-runtime.css:286)).
   - Header: `padding: 0.85rem 1.25rem`, chrome bg + bottom border. Body: recessed `--lab-integration-body-bg`. Footer: chrome bg + top border.
   - **PrimeVue teleports dialogs to `<body>`**, so scoped `:deep()` cannot match. Use `:global(.your-dialog-class …)`.
   - Plain PrimeVue controls have **no** styling by themselves — [`lab-primevue-pt.ts`](src/shared/theme/lab-primevue-pt.ts) supplies density only; borders/backgrounds come from the tokens above.
   - Do **not** invent per-app theme colours — use `--lab-*` tokens so every theme preset keeps working.
7. **DnD in apps:** **`@vue-dnd-kit/core` only** — see `src/apps/dnd-examples/`.
8. **Singletons:** never `new` — `Class.getInstance()` (`databaseManager`, `ProviderService`, `MCPToolRegistry`, `ConversationMemory`, `AppDatabaseService`, `VSCodeLogger`, etc.).
9. **Hybrid/server app HTTP/WS:** **`props.serverUrl`** (app port **4000–4999**), not main backend **3000**.
10. **Commits:** only when the user asks; no force-push to `main`/`master`; no `--no-verify` unless requested.
11. **App ↔ core decoupling:** core (`src/backend`, `src/dashboard`, `src/shared`) must **not** import or hard-wire catalog app code (`src/apps/{app-id}/**`); apps integrate via generic, registry-driven contracts. Platform apps (`app-lab-*`) only where the platform *is* the product. See [docs/platform/lab-app-integrations.md](docs/platform/lab-app-integrations.md) and [docs/platform/lab-integration-host-authoring.md](docs/platform/lab-integration-host-authoring.md).
12. **No plan phase/wave/ticket names in code** — not in filenames, directories, exported symbols, or persisted values. Name by **domain**.
    - ❌ `platform-phase2-manifests.ts`, `catalog-wave-c-form-keys.ts`, `syncLegacyIntegrationManifests()`, `'phase2-platform-demo'`
    - ✅ `platform-catalog-manifests.ts`, `catalog-form-keys.ts`, `syncIntegrationManifests()`, `'platform-catalog-demo'`
    - If a grouping is genuinely temporary, express it as a **feature flag or registry tier**, not a name.
    - `plans/` docs may use phase numbers; source code may not.
    - Audit rationale: [docs/roadmap.md](docs/roadmap.md) (product backlog) — no phase/wave names in source.
13. **Grouped UI must use the canonical sectioned-card style (`lab-form-section`).** Whenever a panel, dialog, drawer or sidebar presents **more than one distinct job** — wizard steps, "Endpoint → URLs → Capture → Map", "Input → Define → Next steps", settings groups, any element grouping with a visible start and end — wrap each group in the shared section card. Do **not** invent a per-panel card, and do **not** leave the groups as flat markup with headings.
    - Markup: `<section class="lab-form-section">` + `<h4 class="lab-form-section__title">` + a badge + `<p class="lab-form-section__lead">`.
    - **Title badge (pick one per section — never mix numeral and icon on the same title):**
      - **Ordered wizard / pipeline** (user must follow 1 → 2 → 3) → numeral: `<span class="lab-form-section__step">1</span>` (the only accent-filled badge).
      - **Any other section** (top-level or nested) → **muted icon** only: `<span class="lab-form-section__icon"><i class="pi pi-…" aria-hidden="true" /></span>`. Pick a PrimeIcon that matches the job. Do **not** use `lab-form-section__icon--accent` or bright/primary icon colours — section icons stay muted at every nesting level.
      - **Neither** is valid when the card alone is enough — keep the section, omit the badge.
    - **Lists of section cards:** stack cards with a plain `<div class="flex flex-col gap-…">` (preferred) or `<ul class="list-none m-0 p-0 ps-0">` with `<li class="list-none m-0 p-0 ps-0">`. After refactors from tables or bullet lists, **remove leftover list markers and indent** (`list-style: none`, zero `padding-inline-start` / `margin-inline-start` on the list and items). Visible bullets or extra left gutter beside cards is a rule-13 defect.
    - **Nested sections inside a parent card:** child blocks use `lab-form-section lab-form-section--nested`. Place them inside `<div class="lab-form-section__children">` **after** the parent’s title and lead — never flush against the lead with no breathing room. The `__children` wrapper supplies the canonical top padding/gap before the first nested card (do not one-off `mt-*` on the first child instead).
    - Definition + rationale: `.lab-form-section` in [`src/assets/styles/platform-catalog-app.css`](src/assets/styles/platform-catalog-app.css) (search "Canonical sectioned-card style"). Reference implementation: [`LabWorkflowTriggerMappingPanel.vue`](src/dashboard/components/settings/lab-workflows/LabWorkflowTriggerMappingPanel.vue).
    - **Colour comes from theme tokens, never literals.** The rail and numeral fill derive from `--lab-section-accent` (itself `--lab-button-border-hover`), the card surface from `--lab-general-bg` mixed with `--lab-general-border`, title from `--lab-general-text`, lead from `--lab-general-text-muted`. This is what keeps every theme preset working; a hard-coded hex will break presets and is a review failure.
    - Per-context **density** overrides are allowed and expected (e.g. the ~22rem node sidebar trims padding via `.lab-workflow-graph-detail-io__block.lab-form-section`). Override padding/margin only — never the rail, surface or token colours.
    - **Turn-based game “Player turns” aside (shared kit):** Do **not** hand-roll a per-app move feed or custom aside chrome. Wire [`GameBoardRow`](src/shared/game-platform/ui/GameBoardRow.vue) + [`PlayerTurnsPanel`](src/shared/game-platform/ui/PlayerTurnsPanel.vue) to `useTurnBasedMatch` (`playerTurns`, live agent turn, `waitingForOpponent`, `agentResolvingMove`). The panel **already implements rule 13**: outer `lab-form-section` (`pi-history` title + lead for status), scrollable `lab-form-section__children`, each committed move as `lab-form-section--nested` with muted `pi-user` / `pi-users` title; height matches the board column and autoscrolls to the latest entry. In play `App.vue`: `<GameBoardRow show-aside class="flex-1 min-h-0">` … `<PlayerTurnsPanel class="min-h-0 flex-1" … />`. Reference: [`chess/front-end/App.vue`](src/apps/chess/front-end/App.vue), [`checkers/front-end/App.vue`](src/apps/checkers/front-end/App.vue). Extend the shared panel if every game needs a change — do not fork styling into one app.

14. **Integrations: know which side you are on — consumer (host) or provider — and seed accordingly.** These are two different jobs with two different failure modes. Authoring checklist: [docs/platform/lab-integration-host-authoring.md](docs/platform/lab-integration-host-authoring.md).

    **As a host (consumer of Forms Builder / Chart Builder).** Every `form.surface` / `chart.surface` slot in the manifest's `accepts` is a promise the UI renders something there. `LabIntegrationSurface` renders **nothing** when no enabled binding exists, and a hand-written guard like `hasEnabledBinding(slot) … return` does so **silently** — the button simply does nothing.
    - **A declared slot with no binding is a defect, not a configuration choice.** Declaring it in `accepts` and seeding it are one change.
    - Bindings come from a seeder, and the host must be in **one of them**: `catalog-binding-seeds.ts` (`CATALOG_HOST_APP_IDS`), `platform-catalog-binding-seeds.ts` (`PLATFORM_CATALOG_HOSTS`), or `pilot-host-binding-seeds.ts` (`GOLDEN_INTEGRATION_PILOT_HOST_IDS`). **Being in neither is silent** — the slots look implemented and are inert.
    - **A provider can also be a host** (Chart Builder renders its own connector dialogs). Such an app is on neither catalog list and must be registered explicitly as a pilot host.
    - **Generate the seeding loop from the manifest, never from a hand-written list.** Slots generated per entity/record (`crm.<entity>.create.dialog`) cannot be enumerated as constants; a seeder that lists named slots will silently miss every generated one.
    - **Some slots are deliberately native** (e.g. `chart.designer.metadata` — the app's own form). Exceptions belong in `UNBOUND_FORM_SLOT_EXCEPTIONS` in [`verify-integration-seed-pack.ts`](src/backend/lab-integrations/verify-integration-seed-pack.ts), with a reason. Do not widen them to silence a failure: **if the guard fails, the answer is a seeder.**
    - Gate: `npm run verify:integration-seeds` asserts every accepted slot has an **enabled binding** (T35-A14). It fails before the UI does.

    **As a provider (exposing a service to others).** Declare `integrationServices` + `offers` (not `accepts`) with a connector segment and a read-only discovery path, then add the connector route and its discovery contract. A consumer cannot bind what you do not advertise — and an unadvertised lookup silently resolves to zero rows rather than erroring.

15. **Catalog integration hosts must broadcast live data changes on the app Socket.IO server.** Workflow write-backs (`integration_update`), connector CRUD, and native REST mutations must not require a manual page refresh. This is separate from platform chat sockets (`SOCKET_EVENTS` on **:3000**) and from `/lab-comms`.
    - **Contract:** [`CATALOG_HOST_SOCKET_EVENTS`](src/shared/types/catalog-host-socket-events.ts) — event `catalog-host:data-changed` on **`props.serverUrl`** (app port **4000–4999**). Payload includes `hostAppId`, `source` (`rest` | `connector`), and `path`.
    - **Server:** hybrid catalog hosts pass **`catalogHostAppId`** to [`createAppServer`](src/shared/services/create-app-server.ts) (registers the `/api/` mutation hook in [`catalog-host-socket-broadcast.ts`](src/shared/server/catalog-host-socket-broadcast.ts)). **`attachSocketIO: true`** is required. CRM uses its own [`ENTITY_RECORDS_CHANGED`](src/apps/lab-crm/front-end/composables/useCrmRecordSocket.ts) pattern — do not mix event names on CRM.
    - **Client:** every catalog workspace [`App.vue`](docs/apps/catalog-workspace-ui-pattern.md) calls [`useCatalogHostLiveRefresh`](src/shared/composables/catalog/useCatalogHostLiveRefresh.ts) with the same `hostAppId` as the manifest and reloads lists **and** chart context (`dataRevision` on `CatalogAppReportsSection` when charts exist).
    - **New host app checklist:** manifest in [`catalog-manifests.ts`](src/shared/lab-integrations/catalog-manifests.ts) → `catalogHostAppId` on server → `useCatalogHostLiveRefresh` on UI → update app system instructions.

16. **Lab shell owns toast UI — no `<Toast>` in apps.** Mounted apps use their own Vue instance, but PrimeVue's toast event bus is **global**. [`LabDashboard.vue`](src/dashboard/LabDashboard.vue) mounts the only `<Toast>` (**top-center**, `lab-shell-toast`). Do **not** add `<Toast>` in `src/apps/**` (including `front-end/App.vue`) — duplicate containers show **every** `toast.add()` twice (e.g. top-center + top-right). Use [`useLabAppToast()`](src/shared/composables/useLabAppToast.ts) or `useToast()` for notifications. Catalog workspace detail: [docs/apps/catalog-workspace-ui-pattern.md](docs/apps/catalog-workspace-ui-pattern.md).

17. **Nested accordion item lists use `catalog-accordion-item-list`.** When **`AccordionContent`** holds a **list of child rows** (tasks, RSVPs, itinerary items, poll options, payments, quiz questions, etc.), wrap them in **`<ul class="catalog-accordion-item-list">`** (or `ol`) with one **`<li>`** per item. Platform CSS in [`platform-catalog-app.css`](src/assets/styles/platform-catalog-app.css) applies **alternating row backgrounds**, **muted row dividers**, and **full-width bleed** into accordion content padding (`--lab-general-border` mixes only). Do **not** hand-roll zebra stripes or per-app row backgrounds — use the shared class. Optional modifiers: **`catalog-accordion-item-list--cards`** when each `li` is a nested card (`lab-form-section--nested`); **`catalog-accordion-item-list__row--emphasis`** marks the “next” row for app-local typography only — **no platform accent fill**. Remove conflicting `gap-*` between rows when using the default list (spacing comes from row padding). Tables inside accordion content (e.g. time-tracking entry grids) are exempt.

18. **Lab domain event catalog — per-app manifests.** Event **metadata** for Workflow Studio / Rules lives in **`src/apps/<dir>/shared/lab-domain-events.manifest.ts`** (platform-only rows in `src/shared/lab-domain-events/platform-lab-domain-events.manifest.ts`). Do **not** add a shared monolith catalog file. After adding or changing entries: register the manifest in [`domain-event-manifest-index.ts`](src/shared/lab-domain-events/domain-event-manifest-index.ts) and run **`npm run verify:domain-event-manifests`** (also in `test:pipeline`). `generate-app` scaffolds an empty manifest. Authoring: [docs/platform/lab-domain-events.md](docs/platform/lab-domain-events.md) · [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Apps (mental model)

| Type | UI | Server |
|------|----|--------|
| `browser` | `front-end/App.vue` | — |
| `server` | — | `back-end/server.ts` (`npx tsx`) |
| `hybrid` | `front-end/App.vue` | `back-end/server.ts` |

- Scaffold: `npm run generate:app`; sync: `sync-app-dirs.ts`. Registry row + folder `src/apps/{app-id}/`.
- Root `App.vue`: `<script setup>`, `serverUrl?: string` for hybrid/server; stable outer class (e.g. `task-list-app`).
- **Per-app DB:** `src/apps/{app-id}/db/` via `AppDatabaseServiceProxy.getInstance()` + `initialize()` in `server.ts`. Reserved table names: `users`, `items`, `configs`, `logs`.
- **Turn-based games (Chess, Checkers, …):** play layout uses [`GameBoardRow`](src/shared/game-platform/ui/GameBoardRow.vue) + [`PlayerTurnsPanel`](src/shared/game-platform/ui/PlayerTurnsPanel.vue) — see non-negotiable rule **13** (Player turns aside). Do not duplicate the feed in app Vue.
- **Do not** import `src/backend/**` from app `front-end/`.
- Launch/teardown order: `DependencyGraph`; server apps via `AppManager` (`GET /health`, log `Server running`).
- **Catalog hosts (Wave C):** live updates via **`catalog-host:data-changed`** — see non-negotiable **§15**.
- **Toasts:** **`useLabAppToast()`** / `useToast()` only — no `<Toast>` in app roots; see non-negotiable **§16**.

---

## Production & platform

- **Auth:** `LabSessionService` (cookie + JWT). OIDC IdPs via **Settings → Auth Providers** only — [docs/auth/oidc-jit-phase1.md](docs/auth/oidc-jit-phase1.md).
- **Roles:** `owner` / `admin` / `member` / `viewer` — **viewer cannot launch apps** (`RoleManager`).
- **`LAB_PRODUCTION_PROFILE=1`:** production MCP enforcers — see `src/tests/backend/mcp-production-enforcer.test.ts`.
- **Identity:** app data uses platform `users.id`; per-app `users` table is not product identity.
- **CI:** branch **`master`** — Azure on **PRs to `master`**: `verify:test-tiers`, `lint`, `type-check`, `test:ci`, `build` (CI v1 only; Playwright smoke is local/manual — see [docs/ci/ci-v1-contract.md](docs/ci/ci-v1-contract.md)). Stack: [docs/operations/lab-stack.md](docs/operations/lab-stack.md) (`lab:start` / `lab:stop`).
- **Pre-PR (agents & contributors):** Run **`npm run test:pipeline`** and verify it passes before opening any pull request. The script chains `lint` → `type-check` → `verify:test-tiers` → `test:ci` → `build` (stops on first failure). Same steps as CI v1; **smoke** (`npm run test:smoke` after `lab:start`) remains separate.

### Theming

Tokens on `:root` as `--lab-*`; admin **Settings → Themes**. Use `bg-lab-*` / `text-lab-*` / `border-lab-*` on shell and **every app screen** (lobby + in-game). Presets: `src/shared/theme/presets/` + `LAB_THEME_PRESET_IDS`. User doc: [docs/platform/platform-theming.md](docs/platform/platform-theming.md).

### Vue layout & scoped CSS

- **Prefer** Tailwind + `lab-*` on markup you own — do not add new scoped `<style>` for layout/chrome when utilities suffice.
- **PrimeVue:** use `:pt`, `form-control-pt`, and `lab-primevue-pt.ts` before **adding** new `:deep()` / `:global()` (teleported dialogs: `lab-app-dialog` + `:global(.your-dialog-class …)` — rule 6).
- **Existing `:deep()` / `:global()`:** reduce only when low-risk (known PT, your wrapper, smoke-tested). **Err on caution** — keeping piercing CSS is OK when removal could break teleport menus, dialogs, DataTables, or third-party DOM (hard regressions).

### Lab messaging

Human DMs: Socket.IO namespace **`/lab-comms`** + **`LAB_COMMS_EVENTS`** only — not `SOCKET_EVENTS`. v1 socket-only. [docs/platform/lab-messaging.md](docs/platform/lab-messaging.md).

### Lab Sidecar

Apps-view **Assistant** panel; Sidecar sends use `labSidecarContext` on platform chat. In app `front-end/`, enrich context with **`useLabSidecar().setContext({ key: value })`** (workspace API re-provided from `AppLifecycle`). During **vs–Lab Assistant** matches, expanded Sidecar can emit LLM **game banter** on important moments (separate from in-game move turns). User guide: [docs/platform/lab-sidecar.md](docs/platform/lab-sidecar.md).

### App system instructions

Per-app agent context lives in `src/backend/db/Apps/app-instructions/` and syncs to `apps.app_system_instructions` on backend init. **Any app rework** that changes UX, integrations, or automation must update that app’s instruction file in the same change set — [docs/platform/app-system-instructions.md](docs/platform/app-system-instructions.md).

### LLM providers

New/changed chat backends: [src/backend/ai/providers/README.md](src/backend/ai/providers/README.md) — `resolveChatRequestOptions` / `mapChatRequestPayload()`, `provider-adapter-factory.ts`, `chat-request-payload.test.ts`.

### Lab virtual bank & game platform

- **Quarks** — platform play-money on main DB; user guide [docs/platform/lab-virtual-bank.md](docs/platform/lab-virtual-bank.md); display copy from `LAB_QUARKS_CURRENCY` in `src/shared/constants/lab-quarks-currency.ts`.
- **Games** — shared kit under `src/shared/game-platform/` (matches, invites, `MatchOutcome`: `'win' | 'loss' | 'draw'` — not `'lose'`). Turn-based play: `GameBoardRow` + `PlayerTurnsPanel` + `useTurnBasedMatch`. Settlements via adapter `virtualBankSettlements` or win-reward config; workflow node `virtual-bank-match-settlement`.
- **Play vs Lab Assistant (product contract)** — Vs-AI catalog games use **`agentMode: 'llm'`** and platform **`agentMoveAsync`** (structural tool + `back-end/agent.ts`). Difficulty is prompt/temperature guidance only ([`difficulty-policy.ts`](src/shared/game-platform/difficulty-policy.ts)); **no hidden engine auto-play** and **no heuristic move fallback**. Local search/basic-strategy hints belong in the **user prompt only**. User-facing labels: [`lab-game-assistant-opponent.ts`](src/shared/constants/lab-game-assistant-opponent.ts). Shared agent instruction blocks: [`shared-games-app-instructions.ts`](src/backend/db/Apps/app-instructions/shared-games-app-instructions.ts). **Blackjack:** seat 2 is LLM tablemate; **dealer** stays scripted house rules. Sidecar banter: `src/shared/game-platform/lab-assistant-banter/`.
- **Catalog connector CRUD** — numeric record ids in connector route handlers: use **`coerceConnectorNumericId()`** from `src/shared/server/catalog-crud-connector-routes.ts` (with `parseConnectorRouteId` / `ConnectorRouteId` where applicable); do not hand-parse ids per app.

### Lab app integrations

Portfolio hosts use manifest slots + seeded bindings; gate: `npm run verify:integration-seeds`. Authoring: [docs/platform/lab-integration-host-authoring.md](docs/platform/lab-integration-host-authoring.md).

---

## AGENT-HANDOFF.md — entry index

**[AGENT-HANDOFF.md](AGENT-HANDOFF.md)** is the session entry: active programme, **next action**, links to `plans/{id}/phases/` and `IMPLEMENTATION-TRACKER.md`.

**During work:** update the programme tracker; **when switching or closing:** update `AGENT-HANDOFF.md` and [docs/roadmap.md](docs/roadmap.md).

## Multi-phase programmes

Large roadmap items use `plans/{feature-id}/` (see [plans/agent-handoff/README.md](plans/agent-handoff/README.md)). Start from [AGENT-HANDOFF.md](AGENT-HANDOFF.md).

---

## Stack & ports

| Piece | Location / port |
|-------|------------------|
| Main backend | Fastify + Socket.IO **3000** (`src/backend/server.ts`) |
| Vite shell | `npm run dev` / `front-end` |
| Chroma | `chroma-data/` |
| Main SQLite | `db/the_lab.db` (`DATABASE_PATH`) |
| App servers | **4000–4999** |

Startup: `backend-entry.ts` → DB repos bootstrap → Chroma → MCP → Socket.IO. **Dual view:** **Laboratory** (full-screen chat) vs **apps workspace** (`focusedAssistant` in `useLabDashboard.ts`); both stay in DOM (blur/opacity). UI label **Laboratory** (formerly “Lab Assistant view”); glossary `docs/platform/lab-shell-terminology.md`. Platform sockets: `src/shared/types/socket-events.ts`; apps define their own under `src/apps/{id}/shared/types/`.

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Chroma + Vite + backend |
| `npm run back-end` / `front-end` | Split |
| `npm run build` | Production + app unique-ID gate |
| `npm run test:pipeline` | **Pre-PR gate:** `lint` + `type-check` + `verify:test-tiers` + `verify:domain-event-manifests` + `test:ci` + `build` |
| `npm run verify:domain-event-manifests` | Manifest index ↔ disk + duplicate `eventType` — [lab-domain-events.md](docs/platform/lab-domain-events.md) |
| `npm run lint` / `lint-file <path>` | ESLint |
| `npm run type-check` / `type-check-file <path>` | TS |
| `npm run test:ci` | Jest — Azure gate, `src/tests/ci/**` only |
| `npm run test:smoke` | Playwright smoke (local; optional Azure manual pipeline) |
| `npm run test:regression` | Jest — full lab regression, every suite |
| `npm run verify:test-tiers` | Assert the two test groupings are well-formed |
| `npm run test` / `test:path` / `test:name` | Jest (`src/tests/**/*.test.*`) |
| `npm run generate:app` | New app from template |
| `npm run export:demo-workflows` / `apply:demo-workflow-seeds` | Main DB → committed Workflow Studio demo seeds — [demo-workflow-db-seed-sync.md](docs/platform/demo-workflow-db-seed-sync.md) |

---

## Backend & MCP conventions

- **Repositories:** `bootstrap(db)` then `initialize()` per domain under `src/backend/db/`.
- **MCP tools:** `MCPToolInterface` + Zod params; snake_case id; `execute()` → `{ success, content }`; register via `MCPToolRegistry` / `loadDefaultServers()` in `server.ts`.
- **Paths:** `fileHelpers.toForwardPath()`; `deleteFile()` → `true` if gone or missing.
- **Logging:** `VSCodeLogger.getInstance()`.
- **Shutdown:** close Fastify + HTTP server on SIGTERM.

Env: `BACKEND_URL`, `VITE_API_BASE_URL`, `VITE_LOGGING_ENABLED`, `LOG_OUTPUT_PATH`, `DEFAULT_SERVER_PORT_OFFSET`.

---

## Quick reference

| Concern | Where |
|---------|--------|
| App launch / lifecycle | `AppGateway.ts`, `AppLifecycle.ts`, `AppManager.ts` |
| App DB types | `src/shared/types/app/app-database.ts` |
| Chat shell | `LabDashboard.vue`, `useLabDashboard.ts` |
| Templates / sys prompt | `src/shared/templates/`, `template-manager.ts` |
| UI automation | `ui-automation-handler.ts` (visibility ≠ blur) |

---

*Confirm destructive work with the user. Prefer safety and minimal scope.*
