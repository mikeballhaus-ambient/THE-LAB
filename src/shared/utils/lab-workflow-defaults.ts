import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';

export function createDefaultLabWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const triggerId = crypto.randomUUID();
  const actionId = crypto.randomUUID();
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      {
        id: triggerId,
        kind: 'trigger',
        position: { x: 220, y: 48 },
        eventType: 'app-lab-tasklist.task.created',
      },
      {
        id: actionId,
        kind: 'action',
        position: { x: 220, y: 200 },
        step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
      },
    ],
    edges: [
      {
        id: crypto.randomUUID(),
        source: triggerId,
        target: actionId,
        when: 'always',
      },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
