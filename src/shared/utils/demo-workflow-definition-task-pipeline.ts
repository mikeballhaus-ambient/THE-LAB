import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';
import { DEMO_WORKFLOW_OWNER_USER_ID } from '@/shared/utils/demo-workflow-seed-catalog';

const TRIGGER_ID = 'a1000002-0002-4002-8002-000000000161';
const SET_FIELDS_ID = 'a1000002-0002-4002-8002-000000000162';
const RENAME_ID = 'a1000002-0002-4002-8002-000000000163';
const SWITCH_ID = 'a1000002-0002-4002-8002-000000000164';
const PUBLISH_ASSIGNED_ID = 'a1000002-0002-4002-8002-000000000165';
const PUBLISH_UNASSIGNED_ID = 'a1000002-0002-4002-8002-000000000166';
const NOTIFY_ASSIGNED_ID = 'a1000002-0002-4002-8002-000000000167';
const NOTIFY_OWNER_ID = 'a1000002-0002-4002-8002-000000000168';

/**
 * Data steps (`set_fields`, `rename_fields`, `switch_condition`, `publish_event`) on live task.created.
 */
export function buildDemoTaskPipelineWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const nodes: LabWorkflowGraphNodeV2[] = [
    {
      id: TRIGGER_ID,
      kind: 'trigger',
      position: { x: 0, y: 0 },
      eventType: 'app-lab-tasklist.task.created',
    },
    {
      id: SET_FIELDS_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: {
        kind: 'set_fields',
        fields: [{ path: 'routedBy', source: 'literal', value: 'workflow-demo' }],
      },
    },
    {
      id: RENAME_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: {
        kind: 'rename_fields',
        renames: [{ from: 'title', to: 'taskTitle' }],
      },
    },
    {
      id: SWITCH_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: {
        kind: 'switch_condition',
        routings: [
          {
            label: 'Assigned',
            conditions: [{ kind: 'payload_exists', path: 'assigneeId' }],
          },
        ],
        fallbackOutputIndex: 1,
      },
    },
    {
      id: PUBLISH_ASSIGNED_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: {
        kind: 'publish_event',
        type: 'lab-workflow-studio.demo.task.assigned',
        sourceAppId: 'app-lab-workflow-studio',
        payloadMerge: { route: 'assigned' },
      },
    },
    {
      id: PUBLISH_UNASSIGNED_ID,
      kind: 'action',
      position: { x: 0, y: 0 },
      step: {
        kind: 'publish_event',
        type: 'lab-workflow-studio.demo.task.unassigned',
        sourceAppId: 'app-lab-workflow-studio',
        payloadMerge: { route: 'unassigned' },
      },
    },
    {
      id: NOTIFY_ASSIGNED_ID,
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
    { id: 'a1000002-0002-4002-8002-000000000169', source: TRIGGER_ID, target: SET_FIELDS_ID, when: 'always' },
    { id: 'a1000002-0002-4002-8002-00000000016a', source: SET_FIELDS_ID, target: RENAME_ID, when: 'always' },
    { id: 'a1000002-0002-4002-8002-00000000016b', source: RENAME_ID, target: SWITCH_ID, when: 'always' },
    {
      id: 'a1000002-0002-4002-8002-00000000016c',
      source: SWITCH_ID,
      target: PUBLISH_ASSIGNED_ID,
      when: 'always',
      outputIndex: 0,
    },
    {
      id: 'a1000002-0002-4002-8002-00000000016d',
      source: SWITCH_ID,
      target: PUBLISH_UNASSIGNED_ID,
      when: 'always',
      outputIndex: 1,
    },
    {
      id: 'a1000002-0002-4002-8002-00000000016e',
      source: PUBLISH_ASSIGNED_ID,
      target: NOTIFY_ASSIGNED_ID,
      when: 'always',
    },
    {
      id: 'a1000002-0002-4002-8002-00000000016f',
      source: PUBLISH_UNASSIGNED_ID,
      target: NOTIFY_OWNER_ID,
      when: 'always',
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
