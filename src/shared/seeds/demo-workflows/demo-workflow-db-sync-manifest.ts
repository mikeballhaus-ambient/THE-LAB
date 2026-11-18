import {
  DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_ID,
  DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_RESPONSE_ID,
  DEMO_WORKFLOW_CRM_QUOTES_LEDGER_POST_ID,
  DEMO_WORKFLOW_CRM_SALES_APPROVAL_RESPONSE_ID,
  DEMO_WORKFLOW_CRM_SALES_LEDGER_POST_ID,
  DEMO_WORKFLOW_ID,
  DEMO_WORKFLOW_APPROVAL_REQUEST_CREATED_NOTIFY_ID,
  DEMO_WORKFLOW_APPROVAL_STEP_PENDING_NOTIFY_ID,
  DEMO_WORKFLOW_TIMESHEET_APPROVAL_ID,
  DEMO_WORKFLOW_TIMESHEET_APPROVAL_RESPONSE_ID,
  DEMO_WORKFLOW_EXPENSE_APPROVAL_ID,
  DEMO_WORKFLOW_EXPENSE_APPROVAL_RESPONSE_ID,
  DEMO_WORKFLOW_WEBHOOK_LOOP_ID,
} from '@/shared/utils/demo-workflow-seed-catalog';
import { DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_ID } from '@/shared/utils/demo-workflow-definition-poll-published-notify';

/**
 * Maps stable demo workflow ids (main DB `lab_workflows.id`) to snapshot slugs and source modules.
 * Used by `export:demo-workflows` / `apply:demo-workflow-seeds` (read live DB → update committed seeds).
 */
export type DemoWorkflowDbSyncEntry = {
  id: string;
  /** Symbol used in `demo-workflow-seed-catalog.ts` (`id: DEMO_WORKFLOW_*_ID`). */
  catalogIdSymbol: string;
  slug: string;
  definitionModuleBasename: string;
  buildFunctionName: string;
  snapshotFile: string;
};

export const DEMO_WORKFLOW_DB_SYNC_ENTRIES: readonly DemoWorkflowDbSyncEntry[] = [
  {
    id: DEMO_WORKFLOW_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_CRM_SALES_APPROVAL_ID',
    slug: 'crm-sales-approval',
    definitionModuleBasename: 'demo-workflow-definition-crm-approval',
    buildFunctionName: 'buildDemoCrmSalesApprovalWorkflowDefinition',
    snapshotFile: 'crm-sales-approval.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_ID',
    slug: 'crm-quotes-approval',
    definitionModuleBasename: 'demo-workflow-definition-crm-approval',
    buildFunctionName: 'buildDemoCrmQuotesApprovalWorkflowDefinition',
    snapshotFile: 'crm-quotes-approval.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_CRM_SALES_APPROVAL_RESPONSE_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_CRM_SALES_APPROVAL_RESPONSE_ID',
    slug: 'crm-sales-approval-response',
    definitionModuleBasename: 'demo-workflow-definition-crm-approval-response',
    buildFunctionName: 'buildDemoCrmSalesApprovalResponseWorkflowDefinition',
    snapshotFile: 'crm-sales-approval-response.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_RESPONSE_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_RESPONSE_ID',
    slug: 'crm-quotes-approval-response',
    definitionModuleBasename: 'demo-workflow-definition-crm-approval-response',
    buildFunctionName: 'buildDemoCrmQuotesApprovalResponseWorkflowDefinition',
    snapshotFile: 'crm-quotes-approval-response.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_CRM_SALES_LEDGER_POST_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_CRM_SALES_LEDGER_POST_ID',
    slug: 'crm-sales-ledger-post',
    definitionModuleBasename: 'demo-workflow-definition-crm-ledger',
    buildFunctionName: 'buildDemoCrmSalesLedgerPostWorkflowDefinition',
    snapshotFile: 'crm-sales-ledger-post.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_CRM_QUOTES_LEDGER_POST_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_CRM_QUOTES_LEDGER_POST_ID',
    slug: 'crm-quotes-ledger-post',
    definitionModuleBasename: 'demo-workflow-definition-crm-ledger',
    buildFunctionName: 'buildDemoCrmQuotesLedgerPostWorkflowDefinition',
    snapshotFile: 'crm-quotes-ledger-post.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_TIMESHEET_APPROVAL_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_TIMESHEET_APPROVAL_ID',
    slug: 'timesheet-approval',
    definitionModuleBasename: 'demo-workflow-definition-timesheet-approval',
    buildFunctionName: 'buildDemoTimesheetApprovalWorkflowDefinition',
    snapshotFile: 'timesheet-approval.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_TIMESHEET_APPROVAL_RESPONSE_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_TIMESHEET_APPROVAL_RESPONSE_ID',
    slug: 'timesheet-approval-response',
    definitionModuleBasename: 'demo-workflow-definition-timesheet-approval-response',
    buildFunctionName: 'buildDemoTimesheetApprovalResponseWorkflowDefinition',
    snapshotFile: 'timesheet-approval-response.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_EXPENSE_APPROVAL_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_EXPENSE_APPROVAL_ID',
    slug: 'expense-approval',
    definitionModuleBasename: 'demo-workflow-definition-expense-report-approval',
    buildFunctionName: 'buildDemoExpenseReportApprovalWorkflowDefinition',
    snapshotFile: 'expense-approval.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_EXPENSE_APPROVAL_RESPONSE_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_EXPENSE_APPROVAL_RESPONSE_ID',
    slug: 'expense-approval-response',
    definitionModuleBasename: 'demo-workflow-definition-expense-report-approval-response',
    buildFunctionName: 'buildDemoExpenseReportApprovalResponseWorkflowDefinition',
    snapshotFile: 'expense-approval-response.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_APPROVAL_REQUEST_CREATED_NOTIFY_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_APPROVAL_REQUEST_CREATED_NOTIFY_ID',
    slug: 'approval-request-created-notify',
    definitionModuleBasename: 'demo-workflow-definition-approval-assignee-notify',
    buildFunctionName: 'buildDemoApprovalRequestCreatedAssigneeNotifyDefinition',
    snapshotFile: 'approval-request-created-notify.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_APPROVAL_STEP_PENDING_NOTIFY_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_APPROVAL_STEP_PENDING_NOTIFY_ID',
    slug: 'approval-step-pending-notify',
    definitionModuleBasename: 'demo-workflow-definition-approval-assignee-notify',
    buildFunctionName: 'buildDemoApprovalStepPendingAssigneeNotifyDefinition',
    snapshotFile: 'approval-step-pending-notify.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_WEBHOOK_LOOP_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_WEBHOOK_LOOP_ID',
    slug: 'webhook-loop',
    definitionModuleBasename: 'demo-workflow-definition-webhook-loop',
    buildFunctionName: 'buildDemoWebhookLoopWorkflowDefinition',
    snapshotFile: 'webhook-loop.snapshot.ts',
  },
  {
    id: DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_ID,
    catalogIdSymbol: 'DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_ID',
    slug: 'polls-published-notify',
    definitionModuleBasename: 'demo-workflow-definition-poll-published-notify',
    buildFunctionName: 'buildDemoPollPublishedNotifyWorkflowDefinition',
    snapshotFile: 'polls-published-notify.snapshot.ts',
  },
];

export function demoWorkflowDbSyncEntryById(id: string): DemoWorkflowDbSyncEntry | undefined {
  return DEMO_WORKFLOW_DB_SYNC_ENTRIES.find((row) => row.id === id);
}

export function demoWorkflowDbSyncEntryBySlug(slug: string): DemoWorkflowDbSyncEntry | undefined {
  return DEMO_WORKFLOW_DB_SYNC_ENTRIES.find((row) => row.slug === slug);
}
