# Wave C catalog apps — release testing checklist

Use this after pulling integration work for the **15 non-game** Wave C apps (phases 21–24). Games (phase 20) use the shared game platform kit and are out of scope here.

## Prerequisites

1. **Restart main backend** (`npm run dev` or `npm run back-end` on port **3000**) so manifests, bindings, and `app_system_instructions` sync from seeds.
2. Sign in as **member** or above (viewer cannot launch apps).
3. Ensure **Forms Builder** is enabled; Wave C binding stubs seed on backend init (`catalog-wave-c-binding-seeds`).

## Automated gates (CI-local)

```bash
npm run type-check
npm run build
npm run test
```

## Per-app smoke (logged in)

For each app: launch → exercise **primary** create/edit/delete via Forms Builder dialog → confirm list refreshes → teardown.

| App id | Port | Primary entity (FB) | Secondary (inline REST) |
|--------|------|---------------------|-------------------------|
| `app-okr-goals` | 4110 | Objectives | Key results |
| `app-travel-itinerary` | 4111 | Trips | Itinerary items |
| `app-project-charter` | 4112 | Charters | — |
| `app-time-tracking` | 4113 | Time entries | Week submit |
| `app-job-applicant-tracker` | 4114 | Applicants | Kanban stage |
| `app-suggestion-box` | 4115 | Suggestions | Voting |
| `app-expense-reports` | 4116 | Expenses | Status workflow |
| `app-knowledge-base` | 4117 | Articles | — |
| `app-training-quizzes` | 4118 | Quizzes | Questions / attempts |
| `app-onboarding-checklist` | 4119 | Checklists | Tasks |
| `app-weather-dashboard` | 4120 | Locations | Observations |
| `app-home-maintenance` | 4121 | Maintenance tasks | Assets |
| `app-rental-property` | 4122 | Properties | Leases / payments |
| `app-event-rsvp` | 4123 | Events | RSVPs |
| `app-polls-surveys` | 4124 | Polls | Options / votes |

### Pass criteria

- No `Authentication required` errors in the browser console for app API calls.
- **New** / row **Edit** / **Delete** open Forms Builder integration dialogs (not legacy inline entity forms).
- Submit succeeds; toast or list refresh shows the change.
- Theme tokens (`lab-*`) look correct on lobby and dialogs.

### Failures to check

- Missing binding → integration dialog empty or error; re-run backend init or inspect `lab_integrations_list_bindings` for the host app id.
- Calling port **3000** for app CRUD instead of the app port (should use `props.serverUrl`).

## Known gaps (not blocking primary release smoke)

- **Secondary entities** use Forms Builder via `openEntityCreate/Edit/Delete` (manifest entity keys). Some non-CRUD actions stay inline (votes, stage moves, KR current slider, mark paid, quiz attempts).
- **Reports** section uses `CatalogWaveCReportsPanel` (`chart.surface` bindings seeded with Chart Builder stubs).
- Platform hosts (Task List, Help Desk, CRM, Ledger, etc.) already had chart surfaces before Wave C.
- **Expense reports** Ledger/Approvals platform deps: local status MVP only.

## References

- Gate: `npm run verify:integration-seeds` · authoring: [lab-integration-host-authoring.md](../platform/lab-integration-host-authoring.md)
- Agent instructions (15 files): `src/backend/db/Apps/app-instructions/*-app-instructions.ts` — sync on backend init; verify with `app_management_get_app`
- Agent instructions guide: [docs/platform/app-system-instructions.md](../platform/app-system-instructions.md)
- Integration platform: [docs/platform/lab-app-integrations.md](../platform/lab-app-integrations.md)
