## THE-LAB ROADMAP

Platform docs live under subfolders (this file is the only markdown at `docs/` root):

| Folder | Contents |
|--------|----------|
| [platform/](platform/) | Theming, identity, messaging, Lab Sidecar, audit log, type-check error log |
| [operations/](operations/) | Lab stack, deploy checklist, operator runbook, backups, structured logging |
| [auth/](auth/) | OIDC / Auth Providers (JIT phase 1) |
| [ci/](ci/) | CI v1 contract (Azure + npm scripts) |
| [metrics/](metrics/) | Baselines and observability notes |
| [providers/](providers/) | LLM provider profiles, env aliases, persona delegation |
| [mcp/](mcp/) | Production MCP policy |
| [forms/](forms/) | Public form submit rate limits |
| [adr/](adr/) | Architecture decision records |
| [setup/](setup/) | Install and integration guides |
| [agent-handoff/](agent-handoff/) | Pointer to `plans/agent-handoff/` |
| [archive/programmes/](archive/programmes/) | Closed `rm-*` programme closeouts and inventories |

**Platform status (2026-11-13):** THE-LAB is **shipped and owner-verified** for rm-64 (integrations), the catalog/games portfolio, **rm-66 Billiards**, **rm-67** (Tailwind layout/chrome), **rm-67.1** (seed copy), **rm-67.2** (colour tokens), **rm-67.5** (form controls / Prime overlays — [closeout](archive/programmes/rm-67.5/EXECUTOR-CLOSEOUT.md)), **rm-67.8** (grouped Laboratory tool results — [closeout](archive/programmes/rm-67.8/EXECUTOR-CLOSEOUT.md)), **rm-68** family (**68.1–68.5** + catalog card automation — [68 closeout](archive/programmes/rm-68/EXECUTOR-CLOSEOUT.md), [68.5 closeout](archive/programmes/rm-68.5/EXECUTOR-CLOSEOUT.md)). **Active programme:** see **[AGENT-HANDOFF.md](../AGENT-HANDOFF.md)**; in-flight trackers under [plans/](../plans/README.md).

| Id | Status | Item |
|--------|----------|--------|
| rm-1 | ✅ Completed | Implement "stop" functionality |
| rm-2 | ✅ Completed | Update MCP Tool Descriptions for Clarity |
| rm-3 | ✅ Completed | Code review of persona management tool |
| rm-4 | ✅ Completed | Detailed agent testing for persona management tool to assign tasks |
| rm-5 | ✅ Completed | Fix file overview not displaying proper changesets in UI |
| rm-6 | ✅ Completed | Add new Documentor tool operations to useMcpFormatter.ts |
| rm-7 | ✅ Completed | Refactor large files |
| rm-8 | ✅ Completed | Test all refactor changes |
| rm-9 | ✅ Completed | Create SDLC templates based on existing `large file refactor` process and documentation |
| rm-10 | ✅ Completed | `See my thinking` (which displays the agent reasoning) in the UI is collapsing when tool calls are sent to UI |
| rm-11 | ✅ Completed | Agents are consistently sending `diffs` property as strings for UpdateFileTool and DocumentorTool |
| rm-12 | ✅ Completed | Fix bug of agents attempting tool calls in chat by displaying JSON rather than forming proper open ai function tool call |
| rm-13 | ✅ Completed | Create new MCP tool that will provide browser interactivity for agents (UI Automation Tool MCP feature implemented and archived) |
| rm-14 | ✅ Completed | Create new MCP tool that will allow agents to prompt users with decisions or followup questions |
| rm-15 | ✅ Completed | Refactor existing `ChatPersona` from hardcoded type to using the existing data from the Lab's sqlite DB table `personas`  |
| rm-16 | ✅ Completed | Lab Assistant Preview (add user input field to chat) |
| rm-17 | ✅ Completed | Test UI Automation MCP tool |
| rm-18 | ✅ Completed | Add new persona via UI Settings |
| rm-19 | ✅ Completed | How to help agents build, manage, and assist users more effectivitly with THE-LAB apps |
| rm-20 | ✅ Completed | Add settings icon to Apps view |
| rm-21 | ✅ Completed | Add help |
| rm-22 | ✅ Completed | Update App System Instructions to better match actual UI |
| rm-23 | ✅ Completed | Fix summarization (received error - request (130968 tokens) exceeds the available context size (120320 tokens), try increasing i) |
| rm-24 | ✅ Completed | Implement developer mode in THE-LAB (adjust system instructions for agents in `non-developer` mode to not use technical language or mention files, etc.) |
| rm-25 | ✅ Completed | Update Settings (context, api provider, commands, personas) to be user based, not global |
| rm-26 | ✅ Completed | Re-work global system message to be user specific (with default) |
| rm-27 | ✅ Completed | Implement user management (settings) |
| rm-28 | ✅ Completed | Workflow automation exploration |
| rm-29 | ✅ Completed | PersonaManagement MCP — activate-persona and response-persona |
| rm-30 | ✅ Completed | Awaiter MCP tool (incl. testing) |
| rm-31 | ✅ Completed | Research allowing user to manage mcp server config |
| rm-32 | ✅ Completed | Default per-user MCP server configs (similar to personas) |
| rm-33 | ✅ Completed | convert existing LAB mcp tool to stdio MCP server protocol |
| rm-34 | ✅ Completed | Create test strategy for converted mcp servers |
| rm-35 | ✅ Completed | allow for multiple apps to be running in lab using tab view |
| rm-36 | ✅ Completed | Form Builder app (test form creation - add container controls) |
| rm-37 | ✅ Completed | CRM app |
| rm-38 | ✅ Completed | Add split view for multiple apps loaded |
| rm-39 | ✅ Completed | Integrate Task List into CRM (scoped lists/tasks, metadata linkage, entity record tasks UI) |
| rm-40 | ✅ Completed | Platform identity API: read THE-LAB `users` (+ global role) from main DB; document that app reserved `users` tables are not for product identity. App *domain* access = memberships/permissions rows keyed by `lab_user_id` (extend or complement existing `user_app_permissions`, which is launch/teardown only) |
| rm-41 | ✅ Completed | Task List: assignee lookups and `assigneeId` = THE-LAB user id; optional app-scoped roles via permissions table, not a duplicate users table |
| rm-42 | ✅ Completed | CRM (and shared patterns for help desk): owner/assignee fields reference THE-LAB user id; Forms Builder user pickers fed from platform API; enforce in-app rules via app permissions/memberships |
| rm-43 | ✅ Completed | Create help desk app |
| rm-44 | ✅ Completed | Integrate help desk into CRM |
| rm-46 | ✅ Completed | THE-LAB optimization & production readiness — Azure CI/Smoke on `master` ([ci contract](ci/ci-v1-contract.md), [lab stack](operations/lab-stack.md)) |
| rm-47 | ✅ Completed | GitHub + Microsoft Entra OIDC via Auth Providers; end-to-end SSO verified with Google (2026-10-06) |
| rm-47.5 | ✅ Completed | Documentation pass for rm-46 — README, AGENTS.md, CLAUDE.md, About.vue, `sysMsg.md` + `key-command-scripts.md`; tracker/plan closeout for **DEV-003** |
| rm-48 | ✅ Completed | Chart Builder app (definitions in app DB; **data in render request**; CRM/Task List/Help Desk dashboard integration) |
| rm-48.5 | ✅ Completed | **Settings (admin):** App Demo Data — remove/re-apply seeded packs (infrastructure vs demo tiers), bulk restore, boot flags, direct SQLite apply (2026-10-06) |
| rm-48.6 | ✅ Completed | App catalog layout + **Settings** / **About** shells (`lab-app-shell` sidebar nav, slate surfaces); Personas nested in settings nav; defer per-panel `mist-*` sweep and running-app chrome → **rm-49** (2026-10-07) |
| rm-49 | ✅ Completed | **Platform themes v1** — engine, API, Settings + draft, shell/chat/app inheritance (2026-10-07) — [platform-theming.md](platform/platform-theming.md) |
| rm-49.9 | ✅ Completed | **Theme settings updates** — custom presets, Tailwind color UI → resolved CSS values; **20 built-in presets** (10 dark / 10 light) (2026-10-07) |
| rm-49.10 | ✅ Completed | **Theme QA & rework** — contrast tests (20 presets), app/chat/shell passes, MCP tool-result + chart theming (2026-10-07) |
| rm-50 | ✅ Completed | **Theming documentation** — [platform-theming.md](platform/platform-theming.md), README/AGENTS/CLAUDE, About **Themes & Look** (2026-10-07) |
| rm-50.4 | ✅ Completed | **Lab messaging** — `/lab-comms` DMs, presence, unread badges, Messages dialog (tabs, roster, composer) — [user guide](platform/lab-messaging.md) (2026-10-07) |
| rm-50.5 | ✅ Completed | **Time Wasters** — MVP: **Klondike** (solo) + **Tile word grid** (vs AI + vs friend, 5 min/turn); additional games split to catalog game apps (2026-10-08) |
| rm-51 | ✅ Completed | add new admin setting option to change order of apps, use same mechanism as crm app (sorting entity list order) |
| rm-51.5 | ✅ Completed | **Lab home / apps view redesign** — tag taxonomy, hero + tag sections, search/filters, pins, per-app catalog tags, virtualization path (2026-10-10) |
| rm-lab-lint-fixes | ✅ Completed | **Full-repo ESLint cleanup** — `npm run lint` 0 errors; CI lint → full `npm run lint` (2026-10-11) |
| rm-52 | ✅ Completed | **Initial lab setup docs** — [docs/setup/readme.md](setup/readme.md) (+ persona tools); linked from root README (2026-10-11) |
| rm-53 | ✅ Completed | **App portfolio** — Phases 1–3 (24 non-platform apps) (2026-10-10) |
| rm-57 | ✅ Completed | **Phase 1: Lab Sidecar** — slide-in scoped assistant; lab view context; deprecate chat preview — [user guide](platform/lab-sidecar.md) (2026-10-11) |
| rm-58 | ✅ Completed | **Platform lab events** (bus + shell notifications; no catalog app) — [user doc](platform/lab-domain-events.md) (2026-10-12) |
| rm-59 | ✅ Completed | **Rules Engine** (global + user rules on lab events) — [user doc](platform/lab-rules-engine.md) (2026-10-12) |
| rm-60 | ✅ Completed | **Workflow Studio** — [user doc](platform/lab-workflow-studio.md) (2026-10-12) |
| rm-61 | ✅ Completed | **Approvals & policies** — [user doc](platform/lab-approvals.md) (2026-10-12) |
| rm-62 | ✅ Completed | **Financial Ledger** — [user doc](platform/lab-financial-ledger.md) (2026-10-12) |
| rm-63 | ✅ Completed | **App Builder** (Sidecar + App Management profile) — [user doc](platform/lab-app-builder.md) (2026-10-12) |
| rm-64 | ✅ Completed | **Lab app integrations** — Waves **A–D** shipped; owner per-app verification **§1–33** signed off **2026-10-31** — [user guide](platform/lab-app-integrations.md) · [host authoring](platform/lab-integration-host-authoring.md) |
| rm-66 | ✅ Completed | **Billiards** — presentation/sync **P0–P8**, PvP + optional Quarks wagers, lobby UX; owner-verified **2026-11-11** — [user doc](apps/billiards.md) · [authoritative sync](../src/apps/billiards/docs/authoritative-sync.md) |
| rm-67 | ✅ Completed | **Tailwind-first CSS audit** — layout/chrome migrated or documented **done\*** (exempt boards, teaching demos, domain scoped CSS); owner-approved **2026-11-11** — [checkpoint](archive/programmes/rm-67/OWNER-REVIEW-CHECKPOINT.md) · [closeout](archive/programmes/rm-67/EXECUTOR-CLOSEOUT.md) · [exempt register](platform/lab-vue-style-exemptions.md). **Colour literals → rm-67.2.** |
| rm-67.1 | ✅ Completed | **Bootstrap / demo seed copy audit** — no `rm-*` in user-facing seeds; `verify:seed-copy`, DB backfill — [closeout](archive/programmes/rm-67.1/EXECUTOR-CLOSEOUT.md) **2026-11-11** |
| rm-67.2 | ✅ Completed | **Hardcoded color → theme token audit** — owner-signed **2026-11-11**; `verify:theme-colors` — [closeout](archive/programmes/rm-67.2/EXECUTOR-CLOSEOUT.md) · [owner checkpoint](archive/programmes/rm-67.2/OWNER-REVIEW-CHECKPOINT.md) |
| rm-67.5 | ✅ Completed | **Form controls & buttons theme-token audit** — overlays/PT, dialog+card text contrast, structural utilities — owner **2026-11-12** ([closeout](archive/programmes/rm-67.5/EXECUTOR-CLOSEOUT.md) · [checkpoint](archive/programmes/rm-67.5/OWNER-REVIEW-CHECKPOINT.md) · [inventory snapshot](platform/lab-form-controls-inventory.md)) |
| rm-67.8 | ✅ Completed | **Laboratory chat — grouped tool-result disclosure** — contiguous tool runs → one “Agent is using tools (N)” toggle — owner **2026-11-12** ([closeout](archive/programmes/rm-67.8/EXECUTOR-CLOSEOUT.md)) |
| rm-68.1 | ✅ Completed | **Sidecar shell feature awareness** — Settings, About, Messages, quick-nav overlays (context + prompts + UI automation) — [closeout](archive/programmes/rm-68.1/EXECUTOR-CLOSEOUT.md) (2026-11-12) |
| rm-68.2 | ✅ Completed | **UI automation tagging audit** — catalog + platform list CRUD; `data-lab-record-*`, per-row ids, app instructions; catalog launch attrs — [closeout](archive/programmes/rm-68.2/EXECUTOR-CLOSEOUT.md) (2026-11-12) |
| rm-68.3 | ✅ Completed | **UI automation discovery audit & refactor** — literal `searchPattern`, context profiles, `elementRef` discover→act — [closeout](archive/programmes/rm-68.3/EXECUTOR-CLOSEOUT.md) · [user guide](platform/lab-ui-automation.md) (2026-11-12) |
| rm-68.4 | ✅ Completed | **Lab shell UI automation** — workspace tabs/layout, catalog **launch + close** (no MCP teardown); split-eligible panes; Sidecar Tasks/Files — owner **2026-11-12** — [closeout](archive/programmes/rm-68.4/EXECUTOR-CLOSEOUT.md) |
| rm-68 | ✅ Completed | **Agent app awareness (parent)** — catalog pin / edit-tags / category-filter UI automation + Sidecar guidance; full sysMsg inventory deferred to hygiene — [closeout](archive/programmes/rm-68/EXECUTOR-CLOSEOUT.md) · [plan](../plans/roadmap/rm-68-agent-app-awareness.md) (2026-11-12) |
| rm-68.5 | ✅ Completed | **Quarks game hints** — purchasable **human UI overlay** assists (catalog + Solitaire `one-move`; owner-signed 2026-11-13) — [plan](../plans/roadmap/rm-68.5-quarks-game-hints.md) · [closeout](archive/programmes/rm-68.5/EXECUTOR-CLOSEOUT.md) |
| rm-69 | 📋 Pending | new workflow opportunities (example, create "userLoggedIn" event trigger to handle quark daily allotment) |
| rm-69.5 | 📋 Pending | **KB publish pipeline via Workflow Studio (agent view + RAG)** — [plan](../plans/roadmap/rm-69.5-kb-workflow-rag-and-agent-view.md). **(A) Auto `agent_view`:** on `app-knowledge-base.article.published` / `.content_updated`, workflow step invokes a **one-shot platform LLM** (games-style: structural tool / JSON contract via `platform-llm-*`, **no Chroma**, no slot A, no chat-memory) that reads human `body` (+ title, category, `app_id`) and returns `KbAgentView`; platform persists `agent_view` on the article row (skip or preserve when already set — product flag). **(B) RAG re-index:** today ingest runs inline in the lab-events pipeline (`kb-chunks-ingest-on-domain-event.ts`); optional workflow **action** calling `KbChunksIndex.upsertArticle` for surrounding automation (notify, eval queue) with gating to avoid double-embed vs pipeline. Spike: `llm-playground/spikes/phase-02-rag/README.md` #10–#13. |
| rm-69.6 | ✅ **Completed 2026-11-18** | **Domain event catalog architecture** — per-app manifests, registry + SQLite, `verify:domain-event-manifests`, `generate-app` scaffold. Plan: [rm-69.6-decentralize-domain-event-catalog.md](../plans/roadmap/rm-69.6-decentralize-domain-event-catalog.md). |
| rm-69.7 | 📋 Pending | Audit code base prior to github push to remove any context7, api keys, etc |
| rm-70 | 📋 Pending | UI/UX enhancements |
| rm-71 | 📋 **Ready** (post pipeline sign-off) | **OSS / GitHub launch** — AGPL, fresh public `main`, Actions CI v1; tracker [`the-lab-github-oss-launch.md`](../../../plans/the-lab-github-oss-launch.md) |