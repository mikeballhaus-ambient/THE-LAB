# Wave C — manual smoke (15 apps)

Quick pass to mark rm-64 phases **21–24** Verified. Full detail: [wave-c-release-testing.md](./wave-c-release-testing.md).
Games (phase 20) are already verified — skip.

## Before you start

1. Restart the backend on **:3000** (`npm run dev` or `npm run back-end`) — seeds manifests, bindings, and app instructions.
2. Log in as **member** or higher (viewer cannot launch apps).
3. Forms Builder must be enabled.

## What "pass" means

- App launches — root selector visible, no red error banner.
- **The app already has rows.** Demo data seeds on boot (rm-64 phase 30); no Apply click is
  needed. An empty table is a **failure**, not an expected state.
- People shown are **`DEMO_CAST` names verbatim** (`Mia Chen`, `Jordan Lee`, …). Company
  names are `DEMO_ACCOUNTS` verbatim (`Northwind Labs`, `Summit Health`, …).
- **New** opens a **Forms Builder dialog** (not a legacy inline form). Submit → toast or list refresh.
- Row **pencil / trash** open Forms Builder edit/delete dialogs.
- Browser console shows no `Authentication required`.
- Theme looks right (dark `lab-*` surfaces, readable text on lobby + dialogs).

> **Do not create rows to test.** If a table is empty, the seed did not run — check
> Settings → App demo data shows the pack as `present`, then re-run the backend. Creating a
> throwaway row and deleting it proves nothing about the seeded dataset.

## The 15 apps

Launch each from the dashboard via the card whose `data-appname` matches the **Catalog name**.

| # | Catalog name | Port | Root selector | Primary → "New" button | Seeded rows to expect |
|---|---|---|---|---|---|
| 1 | Okr goals | 4110 | `.okr-goals-app` | `New objective` | 3 objectives / 8 key results |
| 2 | Travel itinerary | 4111 | `.travel-itinerary-app` | `New trip` | 2 trips / 8 items |
| 3 | Project charter | 4112 | `.project-charter-app` | `New charter` | 2 charters |
| 4 | Time tracking | 4113 | `.time-tracking-app` | `Log time` | 12 entries |
| 5 | Job applicant tracker | 4114 | `.job-applicant-tracker-app` | `New applicant` | 6 applicants (1 per stage) |
| 6 | Suggestion box | 4115 | `.suggestion-box-app` | `New suggestion` | 5 suggestions (1 per status) |
| 7 | Expense reports | 4116 | `.expense-reports-app` | `New expense` | 8 expenses (1 per status) |
| 8 | Knowledge base | **3016** | `.knowledge-base-app` | `New article` | 6 demo articles + the full documentation set |
| 9 | Training quizzes | 4118 | `.training-quizzes-app` | `New quiz` | 3 quizzes / 9 questions / 5 attempts |
| 10 | Onboarding checklist | 4119 | `.onboarding-checklist-app` | `New checklist` | 3 checklists / 12 tasks |
| 11 | Weather dashboard | 4120 | `.weather-dashboard-app` | `New location` | 3 locations / 9 observations |
| 12 | Home maintenance | 4121 | `.home-maintenance-app` | `New asset` (also `New task`) | 4 assets / 10 tasks |
| 13 | Rental property | 4122 | `.rental-property-app` | `New property` | 4 properties / 4 leases / 10 payments |
| 14 | Event rsvp | 4123 | `.event-rsvp-app` | `New event` | 3 events / 12 responses |
| 15 | Polls surveys | 4124 | `.polls-surveys-app` | `New poll` | 3 polls / 9 options / 15 votes |

> **Knowledge Base is a platform app** (rm-64 §30.8) and now listens on **3016**, in the
> platform port range, so it warms on boot. It is no longer a catalog app on 4117.

## Secondary entities (only after creating a parent)

| App | After creating the primary, click… |
|---|---|
| Okr goals | `Key result` on the objective card |
| Travel itinerary | `Add item` on the trip card |
| Time tracking | `Submit week` (inline, no dialog expected) |
| Job applicant tracker | Move an applicant across kanban stages (inline) |
| Suggestion box | Vote arrows (inline) |
| Expense reports | Status dropdown (inline) |
| Training quizzes | Select the quiz → `Add question` |
| Onboarding checklist | `Task` on the checklist card |
| Weather dashboard | `+` icon on the location card |
| Home maintenance | `New asset` in the header |
| Rental property | `Lease` on the property card → then charge payment |
| Event rsvp | `+` icon on the event card |
| Polls surveys | `+` icon on the poll card |

Apps with **no** secondary entity: Project charter, Knowledge base.

## If it fails

| Symptom | Check |
|---|---|
| **Table is empty** | Demo seed did not run. Settings → App demo data should show the pack `present`; re-run the backend so the app server boots and seeds. Do not create a row to "fix" it. |
| **Person rows show no id** | The app server has not run the phase-31 person migration. Restart it; check `PRAGMA table_info` for the `*_id` column. |
| Dialog is empty / errors | Binding missing — re-run backend init, inspect `lab_integrations_list_bindings` for the host app id |
| CRUD hits port 3000 | App is using the wrong base URL — must be `props.serverUrl` (app port), not the main backend |
| Stale behavior after a seed change | Backend was not restarted (or the demo pack boot flag is set from a prior Remove) |
| KB app will not reach 3016 | Port still occupied by the retired 4117 instance — `npm run kill:app-servers`, then restart |
| Agent cannot see `lab_kb_search` | Persona allowlist stale — restart the backend (it re-syncs from `persona-tools-config.json`) |

## Sign-off

Sign-off: run `npm run verify:integration-seeds` and spot-check hosts in this doc; integrations programme is closed (see [docs/roadmap.md](../roadmap.md)).
