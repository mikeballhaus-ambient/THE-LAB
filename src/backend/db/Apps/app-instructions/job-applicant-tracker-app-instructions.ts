/**
 * Agent instructions for the Job Applicant Tracker catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const jobApplicantTrackerAppInstructions = `# App System Instructions: Job Applicant Tracker

## Overview

\`app-job-applicant-tracker\` is a **hybrid** productivity catalog app for tracking candidates through hiring stages. UI: \`src/apps/job-applicant-tracker/front-end/App.vue\`; server on **\`props.serverUrl\`** (port **4114**).

## Data model

- **Applicants** — name, role, email, stage (\`applied\` | \`screening\` | \`interview\` | \`offer\` | \`hired\` | \`rejected\`), notes (\`applicants\`). A kanban board groups candidates by stage.

## API (app server, REST)

- \`GET /api/applicants\`.
- \`POST/PUT/DELETE /api/applicants[/:id]\`.
- \`PATCH /api/applicants/:id/stage\` — advance/change stage.

## Integration (rm-64)

Host \`app-job-applicant-tracker\`, surface \`job-applicant-tracker.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

Applicant (primary): \`entityKey\` \`applicant\`, segment \`applicants\` — \`openPrimary*\`.

### Chart Builder

\`reports.applicants-by-stage\` (bar) and \`reports.applicants-stage-breakdown\` (pie by stage, legend right).

### Inline (non-FB)

Kanban: \`PATCH /api/applicants/:id/stage\`.

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Events published (lab domain events)

Publish after the write, inside \`try/catch\`, via \`publishLabDomainEvent\` in \`src/shared/services/platform-lab-events.client.node.ts\`. Payloads carry **facts only** — workflows resolve recipients.

| Event | Published when | Route |
|-------|----------------|-------|
| \`app-job-applicant-tracker.applicant.stage_changed\` | the stage actually changed | \`PATCH /api/applicants/:id/stage\` |
| \`app-job-applicant-tracker.applicant.hired\` | the new stage is \`hired\` (published in addition to \`stage_changed\`) | \`PATCH /api/applicants/:id/stage\` |

Setting the stage it already has publishes nothing. \`applicant.hired\` is the intended trigger for onboarding.

## UI layout

Reports (bar + pie by stage) → horizontal kanban (\`lab-app-kanban-column\` / \`lab-app-kanban-card\`). Drag a card body between columns (\`@vue-dnd-kit/core\`) to call \`PATCH /api/applicants/:id/stage\`. Edit/delete icons stay on the card footer (non-draggable).

## Automation scope

- Root class \`job-applicant-tracker-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.



${formatCatalogHostRecordAutomationSection({
  appId: 'app-job-applicant-tracker',
  displayName: 'Job Applicant Tracker',
  contextAreaClass: 'job-applicant-tracker-app',
  primaryRecordLabel: 'applicant name',
  extraBullets: [
    "Kanban cards expose edit/delete with applicant name.",
  ],
})}

User doc: \`docs/apps/job-applicant-tracker.md\` (create/update when UX changes).
`;
