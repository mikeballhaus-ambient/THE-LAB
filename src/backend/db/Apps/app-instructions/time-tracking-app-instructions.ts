/**
 * Agent instructions for the Time Tracking catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const timeTrackingAppInstructions = `# App System Instructions: Time Tracking

## Overview

\`app-time-tracking\` is a **hybrid** productivity catalog app for logging billable hours with weekly submit. UI: \`src/apps/time-tracking/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4113**).

## Data model

- **Time entries** — project, task, date, minutes, billable flag, status (\`draft\` | \`submitted\`), and a derived ISO week key (\`time_entries\`).
- **Weekly summaries** — computed per ISO week (total + billable minutes, entry count, submitted flag, optional \`approvalStatus\`).
- **Timesheet weeks** (\`time_week_sheets\`) — one row per submitted ISO week (\`weekKey\` primary key) with \`approvalStatus\` (\`pending\` | \`approved\` | \`rejected\`) for Lab Approvals write-back.

## API (app server, REST)

- \`GET /api/time/entries[?weekKey=]\`.
- \`POST/PUT/DELETE /api/time/entries[/:id]\` — the server derives \`weekKey\` from the date.
- \`GET /api/time/summaries\` — includes \`approvalStatus\` when the week was submitted for approval.
- \`POST /api/time/weeks/:weekKey/submit\` — submits all draft entries in a week and sets timesheet \`approvalStatus\` to \`pending\`.

## Integration (rm-64)

Host \`app-time-tracking\`, surface \`time-tracking.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

Time entry (primary): \`entityKey\` \`time-entry\`, segment \`time-entries\` — \`teamMember\` (lab-user), \`openPrimaryCreate/Edit/Delete\`.

Timesheet week (approval subject): \`entityKey\` \`timesheet\`, segment \`timesheets\` — connector id is \`weekKey\`; workflows update \`approvalStatus\` via \`time-tracking.timesheets\`.

### Chart Builder

\`reports.hours-by-project\` (sum of \`minutes\` by \`project\`). \`reports.hours-by-user\` (sum of \`minutes\` by \`userName\`).

### Inline (non-FB)

\`POST /api/time/weeks/:weekKey/submit\` — submit all draft entries for a week.

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-time-tracking.timesheet.submitted\` | at least one draft entry in the week was submitted | \`POST /api/time/weeks/:weekKey/submit\` |

Submitting a week with no drafts affects zero rows and publishes nothing. Payload includes \`weekKey\`, \`entryCount\` and \`totalMinutes\`. The app sets \`approvalStatus: pending\` on \`time_week_sheets\` when at least one entry is submitted.

## Demo workflows

- **Request:** \`app-time-tracking.timesheet.submitted\` → raise approval (policy \`…000012\`, subject \`timesheet\` / \`weekKey\`).
- **Response:** \`platform-approvals.request.*\` → \`integration_update\` on \`time-tracking.timesheets\` (\`approvalStatus\` ← \`requestStatus\`) → notify \`requesterUserId\`.

## Live updates

Server: \`createAppServer({ catalogHostAppId: 'app-time-tracking', attachSocketIO: true })\` emits \`catalog-host:data-changed\` after successful \`/api/\` mutations (including connector updates from workflows). Client: \`useCatalogHostLiveRefresh\` reloads summaries when approval status changes.

## UI layout

Reports (two charts) → workspace **Tabs** (**Time log**: date/team filters, one master row per team member with accordion of entries; **Weekly summaries** grid). See \`docs/apps/catalog-workspace-ui-pattern.md\`.

## Automation scope

- Root class \`time-tracking-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-time-tracking',
  displayName: 'Time Tracking',
  contextAreaClass: 'time-tracking-app',
  primaryRecordLabel: 'time entry project name',
})}

User doc: \`docs/apps/time-tracking.md\` (create/update when UX changes).
`;
