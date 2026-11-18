import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';
import { DEMO_WORKFLOW_OWNER_USER_ID } from '@/shared/utils/demo-workflow-seed-catalog';

const TRIGGER_ID = 'a1000002-0002-4002-8002-000000000032';
const IF_ASSIGNEE_ID = 'a1000002-0002-4002-8002-000000000033';
const NOTIFY_ASSIGNEE_ID = 'a1000002-0002-4002-8002-000000000034';
const NOTIFY_OWNER_ID = 'a1000002-0002-4002-8002-000000000035';

export function buildDemoTaskAssigneeWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const nodes: LabWorkflowGraphNodeV2[] = [
    {
      id: TRIGGER_ID,
      kind: 'trigger',
      position: { x: 0, y: 0 },
      eventType: 'app-lab-tasklist.task.created',
    },
    {
      id: IF_ASSIGNEE_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: {
        kind: 'if_condition',
        conditions: [{ kind: 'payload_exists', path: 'assigneeId' }],
      },
    },
    {
      id: NOTIFY_ASSIGNEE_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
    },
    {
      id: NOTIFY_OWNER_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: { kind: 'notify_users', userIds: [DEMO_WORKFLOW_OWNER_USER_ID] },
    },
  ];

  const edges: LabWorkflowGraphEdgeV2[] = [
    { id: 'a1000002-0002-4002-8002-000000000036', source: TRIGGER_ID, target: IF_ASSIGNEE_ID, when: 'always' },
    {
      id: 'a1000002-0002-4002-8002-000000000037',
      source: IF_ASSIGNEE_ID,
      target: NOTIFY_ASSIGNEE_ID,
      when: 'on_true',
      outputIndex: 0,
    },
    {
      id: 'a1000002-0002-4002-8002-000000000038',
      source: IF_ASSIGNEE_ID,
      target: NOTIFY_OWNER_ID,
      when: 'on_false',
      outputIndex: 1,
    },
  ];

  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    // Arrange only when the seed states no layout; a positioned graph is left as written.
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
