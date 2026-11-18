import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';
import { DEMO_WORKFLOW_OWNER_USER_ID } from '@/shared/utils/demo-workflow-seed-catalog';

const TRIGGER_ID = 'a1000002-0002-4002-8002-000000000141';
const HTTP_ECHO_ID = 'a1000002-0002-4002-8002-000000000142';
const NOTIFY_ID = 'a1000002-0002-4002-8002-000000000143';

/** Exercises `http_request` with `bodyFromPayload` (dry-run friendly against postman-echo.com). */
export function buildDemoHttpEchoWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const nodes: LabWorkflowGraphNodeV2[] = [
    {
      id: TRIGGER_ID,
      kind: 'trigger',
      position: { x: 0, y: 0 },
      eventType: 'app-expense-reports.expense.approved',
    },
    {
      id: HTTP_ECHO_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: {
        kind: 'http_request',
        method: 'POST',
        url: 'https://postman-echo.com/post',
        allowList: ['postman-echo.com'],
        bodyFromPayload: {
          expenseId: 'payload.expenseId',
          amountCents: 'payload.amountCents',
          category: 'payload.category',
        },
      },
    },
    {
      id: NOTIFY_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: { kind: 'notify_users', userIds: [DEMO_WORKFLOW_OWNER_USER_ID] },
    },
  ];

  const edges: LabWorkflowGraphEdgeV2[] = [
    { id: 'a1000002-0002-4002-8002-000000000144', source: TRIGGER_ID, target: HTTP_ECHO_ID, when: 'always' },
    { id: 'a1000002-0002-4002-8002-000000000145', source: HTTP_ECHO_ID, target: NOTIFY_ID, when: 'always' },
  ];

  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    // Arrange only when the seed states no layout; a positioned graph is left as written.
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
