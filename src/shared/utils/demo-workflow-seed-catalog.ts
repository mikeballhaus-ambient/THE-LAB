import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { buildDemoWebhookLoopWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-webhook-loop';
import {
  buildDemoCrmQuotesApprovalWorkflowDefinition,
  buildDemoCrmSalesApprovalWorkflowDefinition,
} from '@/shared/utils/demo-workflow-definition-crm-approval';
import {
  buildDemoCrmQuotesApprovalResponseWorkflowDefinition,
  buildDemoCrmSalesApprovalResponseWorkflowDefinition,
} from '@/shared/utils/demo-workflow-definition-crm-approval-response';
import {
  buildDemoCrmQuotesLedgerPostWorkflowDefinition,
  buildDemoCrmSalesLedgerPostWorkflowDefinition,
} from '@/shared/utils/demo-workflow-definition-crm-ledger';
import { buildDemoTimesheetApprovalWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-timesheet-approval';
import { buildDemoTimesheetApprovalResponseWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-timesheet-approval-response';
import { buildDemoExpenseReportApprovalWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-expense-report-approval';
import { buildDemoExpenseReportApprovalResponseWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-expense-report-approval-response';
import {
  buildDemoApprovalRequestCreatedAssigneeNotifyDefinition,
  buildDemoApprovalStepPendingAssigneeNotifyDefinition,
} from '@/shared/utils/demo-workflow-definition-approval-assignee-notify';
import { buildDemoPollPublishedNotifyWorkflowDefinition, DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_ID } from '@/shared/utils/demo-workflow-definition-poll-published-notify';
import {
  buildDemoQuarksLoginAllotmentWorkflowDefinition,
  DEMO_WORKFLOW_QUARKS_LOGIN_ALLOTMENT_ID,
} from '@/shared/utils/demo-workflow-definition-quarks-login-allotment';

/** Primary seeded workflow id (Workflow Studio showcase) — CRM sales approval request. */
export const DEMO_WORKFLOW_ID = 'a1000002-0002-4002-8002-000000000100';
export const DEMO_WORKFLOW_CRM_SALES_APPROVAL_ID = DEMO_WORKFLOW_ID;

/** @deprecated Legacy id for removed expense flagship demo; deleted on backend sync. */
export const DEMO_WORKFLOW_LEGACY_EXPENSE_LEDGER_ID = 'a1000002-0002-4002-8002-000000000002';

export const DEMO_WORKFLOW_WEBHOOK_LOOP_ID = 'a1000002-0002-4002-8002-000000000070';
/**
 * Demo workflows removed from the seed pack (host-app scope). Rows are deleted on backend sync.
 */
export const REMOVED_DEMO_WORKFLOW_IDS: readonly string[] = [
  DEMO_WORKFLOW_LEGACY_EXPENSE_LEDGER_ID,
  'a1000002-0002-4002-8002-000000000030',
  'a1000002-0002-4002-8002-000000000031',
  'a1000002-0002-4002-8002-000000000040',
  'a1000002-0002-4002-8002-000000000050',
  'a1000002-0002-4002-8002-000000000060',
  'a1000002-0002-4002-8002-000000000103',
  'a1000002-0002-4002-8002-000000000120',
];
export const DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_ID = 'a1000002-0002-4002-8002-000000000101';
/** Response: approval outcome → CRM update + notify (IF on `requestStatus`). */
export const DEMO_WORKFLOW_CRM_SALES_APPROVAL_RESPONSE_ID =
  'a1000002-0002-4002-8002-000000000102';
export const DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_RESPONSE_ID =
  'a1000002-0002-4002-8002-000000000119';
export const DEMO_WORKFLOW_CRM_SALES_LEDGER_POST_ID = 'a1000002-0002-4002-8002-000000000116';
export const DEMO_WORKFLOW_CRM_QUOTES_LEDGER_POST_ID = 'a1000002-0002-4002-8002-000000000117';
export const DEMO_WORKFLOW_TIMESHEET_APPROVAL_ID = 'a1000002-0002-4002-8002-000000000118';
/** Response: timesheet approval outcome → Time Tracking update + notify. */
export const DEMO_WORKFLOW_TIMESHEET_APPROVAL_RESPONSE_ID =
  'a1000002-0002-4002-8002-000000000125';
/** Expense submit → raise approval demo. */
export const DEMO_WORKFLOW_EXPENSE_APPROVAL_ID = 'a1000002-0002-4002-8002-000000000127';
/** Expense approval outcome → status update + notify. */
export const DEMO_WORKFLOW_EXPENSE_APPROVAL_RESPONSE_ID =
  'a1000002-0002-4002-8002-000000000128';
/** Notify current assignee when a platform approval request is created. */
export const DEMO_WORKFLOW_APPROVAL_REQUEST_CREATED_NOTIFY_ID =
  'a1000002-0002-4002-8002-000000000121';
/** Notify next assignee when a multi-step approval advances. */
export const DEMO_WORKFLOW_APPROVAL_STEP_PENDING_NOTIFY_ID =
  'a1000002-0002-4002-8002-000000000124';

export { DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_ID } from '@/shared/utils/demo-workflow-definition-poll-published-notify';
export { DEMO_WORKFLOW_QUARKS_LOGIN_ALLOTMENT_ID };

/** Seeded Approvals policy for expense → ledger demos (see platform-catalog-demo-seed `DEMO_POLICY_ID`). */
export const DEMO_APPROVAL_POLICY_ID = 'a1000003-0003-4003-8003-000000000003';

/** Dedicated policies for CRM deal approval workflows (not shared with expense demo). */
export const CRM_SALES_APPROVAL_POLICY_ID = 'a1000003-0003-4003-8003-000000000010';
export const CRM_QUOTES_APPROVAL_POLICY_ID = 'a1000003-0003-4003-8003-000000000011';

/** Timesheet submit → raise approval demo (Time Tracking publishes `timesheet.submitted`). */
export const TIMESHEET_APPROVAL_POLICY_ID = 'a1000003-0003-4003-8003-000000000012';

/** Expense submit → raise approval demo (`app-expense-reports.expense.submitted`). */
export const EXPENSE_REPORT_APPROVAL_POLICY_ID = 'a1000003-0003-4003-8003-000000000013';

/** Matches the Approvals & Policies demo pack row (multi-step policy UI). */
export const DEMO_APPROVAL_POLICY_NAME = 'Demo 3 step approval (expense)';

export const DEMO_APPROVAL_POLICY_DESCRIPTION =
  'Three-step policy for Expense Reports → approval → ledger Workflow Studio demos. Not used for CRM deal submit.';

export const CRM_SALES_APPROVAL_POLICY_NAME = 'CRM sales deal approval';
export const CRM_SALES_APPROVAL_POLICY_DESCRIPTION =
  'Two-step approval for CRM sales records when Submit approval publishes app-lab-crm.sales.approval_submitted.';

export const CRM_QUOTES_APPROVAL_POLICY_NAME = 'CRM quote approval';
export const CRM_QUOTES_APPROVAL_POLICY_DESCRIPTION =
  'Two-step approval for CRM quotes when Submit approval publishes app-lab-crm.quotes.approval_submitted.';

export const TIMESHEET_APPROVAL_POLICY_NAME = 'Timesheet weekly approval';
export const TIMESHEET_APPROVAL_POLICY_DESCRIPTION =
  'Manager review when Time Tracking submits a week (`app-time-tracking.timesheet.submitted`).';

export const EXPENSE_REPORT_APPROVAL_POLICY_NAME = 'Expense report approval';
export const EXPENSE_REPORT_APPROVAL_POLICY_DESCRIPTION =
  'Manager review when Expense Reports submits an expense (`app-expense-reports.expense.submitted`).';

export const DEMO_APPROVAL_POLICY_DEFINITION = {
  schemaVersion: 1,
  steps: [
    { label: 'First Approval', assigneeUserId: 1 },
    { label: 'Second Approval', assigneeUserId: 1 },
    { label: 'Third Approval', assigneeUserId: 1 },
  ],
} as const;

export const CRM_DEAL_APPROVAL_POLICY_DEFINITION = {
  schemaVersion: 1,
  steps: [
    { label: 'Deal review', assigneeUserId: 1 },
    { label: 'Final sign-off', assigneeUserId: 1 },
  ],
} as const;

export type DemoApprovalPolicySeedSpec = {
  id: string;
  name: string;
  description: string;
  definitionJson: string;
};

export const DEMO_APPROVAL_POLICY_SEEDS: readonly DemoApprovalPolicySeedSpec[] = [
  {
    id: DEMO_APPROVAL_POLICY_ID,
    name: DEMO_APPROVAL_POLICY_NAME,
    description: DEMO_APPROVAL_POLICY_DESCRIPTION,
    definitionJson: JSON.stringify(DEMO_APPROVAL_POLICY_DEFINITION),
  },
  {
    id: CRM_SALES_APPROVAL_POLICY_ID,
    name: CRM_SALES_APPROVAL_POLICY_NAME,
    description: CRM_SALES_APPROVAL_POLICY_DESCRIPTION,
    definitionJson: JSON.stringify(CRM_DEAL_APPROVAL_POLICY_DEFINITION),
  },
  {
    id: CRM_QUOTES_APPROVAL_POLICY_ID,
    name: CRM_QUOTES_APPROVAL_POLICY_NAME,
    description: CRM_QUOTES_APPROVAL_POLICY_DESCRIPTION,
    definitionJson: JSON.stringify(CRM_DEAL_APPROVAL_POLICY_DEFINITION),
  },
  {
    id: TIMESHEET_APPROVAL_POLICY_ID,
    name: TIMESHEET_APPROVAL_POLICY_NAME,
    description: TIMESHEET_APPROVAL_POLICY_DESCRIPTION,
    definitionJson: JSON.stringify(CRM_DEAL_APPROVAL_POLICY_DEFINITION),
  },
  {
    id: EXPENSE_REPORT_APPROVAL_POLICY_ID,
    name: EXPENSE_REPORT_APPROVAL_POLICY_NAME,
    description: EXPENSE_REPORT_APPROVAL_POLICY_DESCRIPTION,
    definitionJson: JSON.stringify(CRM_DEAL_APPROVAL_POLICY_DEFINITION),
  },
];

/** Platform catalog demo ledger accounts (see platform-catalog-demo-seed). */
export const DEMO_LEDGER_CASH_ACCOUNT_ID = 'a1000004-0004-4004-8004-000000000004';
export const DEMO_LEDGER_REVENUE_ACCOUNT_ID = 'a1000005-0005-4005-8005-000000000005';

export const DEMO_WORKFLOW_OWNER_USER_ID = 1;

export type DemoWorkflowSeedSpec = {
  id: string;
  name: string;
  description: string;
  priority: number;
  /** Workflow Studio browse filters (not app catalog tags). */
  tags: readonly string[];
  buildDefinition: () => LabWorkflowDefinitionV2;
};

/**
 * Seeded workflows for integration **host** intent/response (CRM, Time Tracking) plus the webhook
 * loop tutorial. Catalog-only demos (expense, task routing, ledger notify, HTTP echo) are not seeded.
 */
export const DEMO_WORKFLOW_SEEDS: readonly DemoWorkflowSeedSpec[] = [
  {
    id: DEMO_WORKFLOW_CRM_SALES_APPROVAL_ID,
    name: 'CRM: sales approval — request',
    description:
      'When a user submits approval on a CRM sales record, raise a request on the CRM sales deal policy.',
    priority: 320,
    tags: ['CRM', 'Approvals'],
    buildDefinition: buildDemoCrmSalesApprovalWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_ID,
    name: 'CRM: quote approval — request',
    description:
      'When a user submits approval on a CRM quote record, raise a request on the CRM quote policy.',
    priority: 315,
    tags: ['CRM', 'Approvals'],
    buildDefinition: buildDemoCrmQuotesApprovalWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_CRM_SALES_APPROVAL_RESPONSE_ID,
    name: 'CRM: sales approval — response',
    description:
      'When the CRM sales deal policy completes, copy `requestStatus` to `approvalStatus`, then notify the requester (wording branches on outcome).',
    priority: 312,
    tags: ['CRM', 'Approvals'],
    buildDefinition: buildDemoCrmSalesApprovalResponseWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_RESPONSE_ID,
    name: 'CRM: quote approval — response',
    description:
      'When the CRM quote policy completes, copy `requestStatus` to `approvalStatus`, then notify the requester (wording branches on outcome).',
    priority: 308,
    tags: ['CRM', 'Approvals'],
    buildDefinition: buildDemoCrmQuotesApprovalResponseWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_CRM_SALES_LEDGER_POST_ID,
    name: 'CRM: post ledger on sales deal',
    description:
      'When Post entry is requested on a CRM sales record, post a balanced demo journal entry from event `amountCents` and `ledgerMemo`.',
    priority: 302,
    tags: ['CRM', 'Ledger'],
    buildDefinition: buildDemoCrmSalesLedgerPostWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_CRM_QUOTES_LEDGER_POST_ID,
    name: 'CRM: post ledger on quote',
    description:
      'When Post entry is requested on a CRM quote, post a balanced demo journal entry from event `amountCents` and `ledgerMemo`.',
    priority: 301,
    tags: ['CRM', 'Ledger'],
    buildDefinition: buildDemoCrmQuotesLedgerPostWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_TIMESHEET_APPROVAL_ID,
    name: 'Time Tracking: timesheet approval — request',
    description:
      'When Time Tracking submits a week, open the seeded timesheet approval policy for that `weekKey`.',
    priority: 75,
    tags: ['Time Tracking', 'Approvals'],
    buildDefinition: buildDemoTimesheetApprovalWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_TIMESHEET_APPROVAL_RESPONSE_ID,
    name: 'Time Tracking: timesheet approval — response',
    description:
      'When the timesheet policy completes, copy `requestStatus` to `approvalStatus`, then notify the requester (wording branches on outcome).',
    priority: 74,
    tags: ['Time Tracking', 'Approvals'],
    buildDefinition: buildDemoTimesheetApprovalResponseWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_EXPENSE_APPROVAL_ID,
    name: 'Expense Reports: expense approval — request',
    description:
      'When an expense is submitted for review, open the seeded expense approval policy for that expense id.',
    priority: 73,
    tags: ['Expense Reports', 'Approvals'],
    buildDefinition: buildDemoExpenseReportApprovalWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_EXPENSE_APPROVAL_RESPONSE_ID,
    name: 'Expense Reports: expense approval — response',
    description:
      'When the expense policy completes, copy `requestStatus` to expense `status`, then notify the requester (wording branches on outcome).',
    priority: 72,
    tags: ['Expense Reports', 'Approvals'],
    buildDefinition: buildDemoExpenseReportApprovalResponseWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_QUARKS_LOGIN_ALLOTMENT_ID,
    name: 'Platform: Quarks daily allotment on login',
    description:
      'On `platform.auth.session.established`, read wallet eligibility, credit daily Quarks when due, and toast the signed-in user.',
    priority: 331,
    tags: ['Platform', 'Quarks'],
    buildDefinition: buildDemoQuarksLoginAllotmentWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_APPROVAL_REQUEST_CREATED_NOTIFY_ID,
    name: 'Platform: notify assignee on approval created',
    description:
      'When `platform-approvals.request.created` fires, notify the first-step assignee (`assigneeUserId`).',
    priority: 330,
    tags: ['Platform', 'Approvals'],
    buildDefinition: buildDemoApprovalRequestCreatedAssigneeNotifyDefinition,
  },
  {
    id: DEMO_WORKFLOW_APPROVAL_STEP_PENDING_NOTIFY_ID,
    name: 'Platform: notify assignee on approval step pending',
    description:
      'When `platform-approvals.step.pending` fires, notify the new step assignee (`assigneeUserId`).',
    priority: 329,
    tags: ['Platform', 'Approvals'],
    buildDefinition: buildDemoApprovalStepPendingAssigneeNotifyDefinition,
  },
  {
    id: DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_ID,
    name: 'Polls: notify lab on publish',
    description:
      'When `app-polls-surveys.poll.published` fires, notify every seeded lab user (demo cast + admin).',
    priority: 280,
    tags: ['Polls', 'Notifications'],
    buildDefinition: buildDemoPollPublishedNotifyWorkflowDefinition,
  },
  {
    id: DEMO_WORKFLOW_WEBHOOK_LOOP_ID,
    name: 'Demo: webhook loop with counter',
    description:
      'Accepts any webhook JSON, loops while `stepValue` is below 3, waits 3s and increments `stepValue` each pass, ' +
      'then messages whether it reached 3 or hit the iteration cap (POST { "stepValue": 1 }).',
    priority: 60,
    tags: ['Tutorial', 'Webhook'],
    buildDefinition: buildDemoWebhookLoopWorkflowDefinition,
  },
];

export function demoWorkflowSeedById(id: string): DemoWorkflowSeedSpec | undefined {
  return DEMO_WORKFLOW_SEEDS.find((row) => row.id === id);
}
