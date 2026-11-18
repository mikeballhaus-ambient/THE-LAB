import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';
import { DEMO_WORKFLOW_OWNER_USER_ID } from '@/shared/utils/demo-workflow-seed-catalog';

const TRIGGER_ID = 'a1000002-0002-4002-8002-000000000040';
const NOTIFY_ID = 'a1000002-0002-4002-8002-000000000041';

export function buildDemoLedgerPostedNotifyWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const nodes: LabWorkflowGraphNodeV2[] = [
    {
      id: TRIGGER_ID,
      kind: 'trigger',
      position: { x: 0, y: 0 },
      eventType: 'platform-ledger.entry.posted',
    },
    {
      id: NOTIFY_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: { kind: 'notify_users', userIds: [DEMO_WORKFLOW_OWNER_USER_ID] },
    },
  ];

  const edges: LabWorkflowGraphEdgeV2[] = [
    { id: 'a1000002-0002-4002-8002-000000000042', source: TRIGGER_ID, target: NOTIFY_ID, when: 'always' },
  ];

  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    // Arrange only when the seed states no layout; a positioned graph is left as written.
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
