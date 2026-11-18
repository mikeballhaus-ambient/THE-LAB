/**
 * App system instructions for Approvals & Policies (seeded into apps.app_system_instructions).
 */

import { formatPlatformRecordListAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const labApprovalsPoliciesAppInstructions = `# App System Instructions: Approvals & Policies

## Overview

Approvals & Policies (\`app-lab-approvals-policies\`) is a **browser** catalog app (no app server port). It mirrors **Settings** approvals UI on the **main platform backend (port 3000)**. Multi-step approve/reject flows use **policies**, an **inbox**, and domain events on the lab bus.

**rm-64 host:** \`PlatformCatalogIntegrationHost\` + \`LabIntegrationSurface\` for manifest \`app-lab-approvals-policies\` / surface \`lab-approvals-policies.workspace\`. Form-driven slots use **Forms Builder** bindings — inspect with \`lab_integrations_get_manifest\` + \`lab_integrations_list_bindings\` for this host (not connector route surveys alone).

Docs: \`docs/platform/lab-approvals.md\`.

## Shell layout

\`\`\`html
<div class="lab-approvals-policies-app lab-platform-catalog-app">
  <!-- PlatformCatalogIntegrationHost (dialogs / integration chrome) -->
  <tab>Approvals inbox</tab>
  <tab>Policies (admin)</tab>
</div>
\`\`\`

| Tab | Component | Who |
|-----|-----------|-----|
| **Approvals inbox** | \`LabApprovalsInbox\` | Submit + decide via Forms Builder slots; inbox tables on :3000 |
| **Policies (admin)** | \`LabApprovalPoliciesManagement\` | Admins: policy CRUD via Forms Builder (step assignee fields) |

## Integration slots (Forms Builder on :3000)

| Slot | Service | Connector segment |
|------|---------|-------------------|
| \`approval.policy.create|edit|delete.dialog\` | \`lab-approvals-policies.approval-policies\` | \`lab-approval-policies\` |
| \`approval.request.submit.dialog\` | \`lab-approvals-policies.approval-requests\` | \`lab-approval-requests\` |
| \`approval.request.decide.dialog\` | same | same (context \`requestId\`) |

Policy create/edit forms use the **Approval steps** control: **1–10 ordered steps**, each with a **step name** (label) and **assignee** lab user. The control syncs the hidden \`definitionJson\` field for Forms Builder submit — not hand-edited JSON.

## Domain events (\`platform-approvals\`)

Published through the full lab-events pipeline (notifications, workflows):

- \`platform-approvals.request.created\`
- \`platform-approvals.step.pending\`
- \`platform-approvals.step.approved\`
- \`platform-approvals.request.approved\`
- \`platform-approvals.request.rejected\`

\`sourceAppId\`: \`platform-approvals\`

## Platform APIs (port 3000)

- \`GET/POST/PUT/DELETE /api/platform/lab-approvals/policies\`
- \`GET /api/platform/lab-approvals/inbox\`
- \`GET /api/platform/lab-approvals/requests/mine\`
- \`POST /api/platform/lab-approvals/requests\`
- \`POST /api/platform/lab-approvals/requests/:id/decide\`

Client: \`src/shared/services/platform-lab-approvals.client.ts\`

## Notification focus (bell **Review approval**)

\`approvalReviewNotificationAction()\` launches this app with \`labApprovalOpenRequestId\` from \`payload.requestId\`. \`LabApprovalsInbox\` enters **notification focus**: one request row, decide dialog opens, **Submit request** and inbox/mine tabs hidden; **All approvals** restores the full inbox. The app shell hides **Policies (admin)** while focus is active.



${formatPlatformRecordListAutomationSection({
  contextArea: 'lab-approvals-policies-app',
  recordLabel: 'approval policy',
  launchHint: "Launch **Approvals & Policies** or open **Policies (admin)** tab.",
})}

## Agent checklist

1. Product behavior → platform approvals APIs; do **not** \`write_query\` on approval tables.
2. UI automation / forms → check integration bindings for \`app-lab-approvals-policies\` slots after Wave B host rework.
3. Restart main backend after instruction updates so \`syncSeededAppSystemInstructions()\` refreshes SQLite.
`;
