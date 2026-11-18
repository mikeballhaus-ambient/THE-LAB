import type { LabWorkflowDefinition } from '@/shared/types/lab-workflow';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';

export type { LabWorkflowDefinition };

export function isLabWorkflowDefinitionV2(
  def: LabWorkflowDefinition,
): def is LabWorkflowDefinitionV2 {
  return def.schemaVersion === LAB_WORKFLOW_GRAPH_SCHEMA_VERSION;
}

export function getWorkflowTriggerEventType(def: LabWorkflowDefinition): string {
  if (isLabWorkflowDefinitionV2(def)) {
    const trigger = def.nodes.find((n) => n.kind === 'trigger');
    return trigger?.kind === 'trigger' ? trigger.eventType : '';
  }
  return def.trigger.eventType;
}

export function getWorkflowTopLevelConditions(def: LabWorkflowDefinition) {
  if (isLabWorkflowDefinitionV2(def)) {
    return undefined;
  }
  return def.conditions;
}
