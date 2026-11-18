import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';
import {
  DEMO_APPROVAL_POLICY_ID,
  DEMO_LEDGER_CASH_ACCOUNT_ID,
  DEMO_LEDGER_REVENUE_ACCOUNT_ID,
  DEMO_WORKFLOW_OWNER_USER_ID,
} from '@/shared/utils/demo-workflow-seed-catalog';
const EXPENSE_APP_ID = 'app-expense-reports';
const EXPENSE_SERVICE_ID = 'expense-reports.expenses';

const TRIGGER_ID = 'a1000002-0002-4002-8002-000000000011';
const DEMO_POLICY_RULE_ID = 'a1000002-0002-4002-8002-000000000014';
const QUERY_EXPENSE_ID = 'a1000002-0002-4002-8002-000000000019';
const LOOKUP_ID = 'a1000002-0002-4002-8002-000000000015';
const TRAVEL_RULE_ID = 'a1000002-0002-4002-8002-000000000016';
const LEDGER_POST_ID = 'a1000002-0002-4002-8002-000000000017';
const NOTIFY_OWNER_ID = 'a1000002-0002-4002-8002-000000000018';

/**
 * Demo policy fully approved → load expense by `subjectEntityId` → travel category rule → ledger post.
 * Chains with {@link buildDemoExpenseApprovalWorkflowDefinition} (expense approved → raise approval).
 */
export function buildDemoExpenseApprovedLedgerWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const nodes: LabWorkflowGraphNodeV2[] = [
    {
      id: TRIGGER_ID,
      kind: 'trigger',
      position: { x: 0, y: 0 },
      eventType: 'platform-approvals.request.approved',
    },
    {
      id: DEMO_POLICY_RULE_ID,
      kind: 'rule',
      position: { x: 0, y: 0 },
      name: 'Demo expense policy',
      conditions: [
        { kind: 'payload_equals', path: 'policyId', value: DEMO_APPROVAL_POLICY_ID },
        { kind: 'payload_equals', path: 'subjectAppId', value: EXPENSE_APP_ID },
        { kind: 'payload_equals', path: 'subjectEntityType', value: 'expense' },
      ],
    },
    {
      id: QUERY_EXPENSE_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: {
        kind: 'lab_query_app',
        providerAppId: EXPENSE_APP_ID,
        serviceId: EXPENSE_SERVICE_ID,
        recordIdPath: 'subjectEntityId',
      },
    },
    {
      id: LOOKUP_ID,
      kind: 'condition',
      position: { x: 0, y: 0 },
      conditions: [{ kind: 'payload_equals', path: 'status', value: 'approved' }],
    },
    {
      id: TRAVEL_RULE_ID,
      kind: 'rule',
      position: { x: 0, y: 0 },
      name: 'Travel spend',
      conditions: [{ kind: 'payload_equals', path: 'category', value: 'Travel' }],
    },
    {
      id: LEDGER_POST_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: {
        kind: 'ledger_post_entry',
        memo: 'Northwind Labs — onsite travel (after demo policy)',
        confirmedByUserId: DEMO_WORKFLOW_OWNER_USER_ID,
        lines: [
          {
            accountId: DEMO_LEDGER_CASH_ACCOUNT_ID,
            side: 'debit',
            amountCentsPath: 'amountCents',
          },
          {
            accountId: DEMO_LEDGER_REVENUE_ACCOUNT_ID,
            side: 'credit',
            amountCentsPath: 'amountCents',
          },
        ],
      },
    },
    {
      id: NOTIFY_OWNER_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: { kind: 'notify_users', userIds: [DEMO_WORKFLOW_OWNER_USER_ID] },
    },
  ];

  const edges: LabWorkflowGraphEdgeV2[] = [
    { id: 'a1000002-0002-4002-8002-000000000021', source: TRIGGER_ID, target: DEMO_POLICY_RULE_ID, when: 'always' },
    {
      id: 'a1000002-0002-4002-8002-000000000026',
      source: DEMO_POLICY_RULE_ID,
      target: QUERY_EXPENSE_ID,
      when: 'on_match',
    },
    {
      id: 'a1000002-0002-4002-8002-000000000027',
      source: DEMO_POLICY_RULE_ID,
      target: NOTIFY_OWNER_ID,
      when: 'on_no_match',
    },
    { id: 'a1000002-0002-4002-8002-000000000028', source: QUERY_EXPENSE_ID, target: LOOKUP_ID, when: 'always' },
    { id: 'a1000002-0002-4002-8002-000000000022', source: LOOKUP_ID, target: TRAVEL_RULE_ID, when: 'on_true' },
    { id: 'a1000002-0002-4002-8002-000000000023', source: LOOKUP_ID, target: NOTIFY_OWNER_ID, when: 'on_false' },
    { id: 'a1000002-0002-4002-8002-000000000024', source: TRAVEL_RULE_ID, target: LEDGER_POST_ID, when: 'on_match' },
    { id: 'a1000002-0002-4002-8002-000000000025', source: TRAVEL_RULE_ID, target: NOTIFY_OWNER_ID, when: 'on_no_match' },
  ];

  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
