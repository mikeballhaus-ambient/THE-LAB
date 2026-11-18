import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

export function workflowGraphTriggerEventType(definition: LabWorkflowDefinitionV2): string {
  const trigger = definition.nodes.find((n) => n.kind === 'trigger');
  return trigger?.kind === 'trigger' ? trigger.eventType : '';
}
