import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/polls-published-notify.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';

export const DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_ID = 'a1000002-0002-4002-8002-000000000129';

/** Notify every seeded lab user when a poll is published (`status` → `open`). */
export function buildDemoPollPublishedNotifyWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}
