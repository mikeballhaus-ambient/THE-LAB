import type { LabWorkflowDefinitionV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import { labWorkflowRuleNodeIsConfigured } from '@/shared/utils/lab-workflow-graph-rule-record';

export function labWorkflowRuleNodeHasIncoming(
  definition: LabWorkflowDefinitionV2,
  nodeId: string,
): boolean {
  return definition.edges.some((edge) => edge.target === nodeId);
}

export function labWorkflowRuleNodeHasOutgoing(
  definition: LabWorkflowDefinitionV2,
  nodeId: string,
): boolean {
  return definition.edges.some((edge) => edge.source === nodeId);
}

export function labWorkflowRuleNodeIsWired(
  definition: LabWorkflowDefinitionV2,
  nodeId: string,
): boolean {
  return (
    labWorkflowRuleNodeHasIncoming(definition, nodeId) &&
    labWorkflowRuleNodeHasOutgoing(definition, nodeId)
  );
}

/** Wired rule nodes need a name + conditions (or legacy library link) before save. */
export function labWorkflowRuleNodeNeedsConfiguration(
  definition: LabWorkflowDefinitionV2,
  node: LabWorkflowGraphNodeV2,
): boolean {
  if (node.kind !== 'rule' || labWorkflowRuleNodeIsConfigured(node)) {
    return false;
  }
  return labWorkflowRuleNodeIsWired(definition, node.id);
}

export function labWorkflowGraphHasUnconfiguredWiredRules(definition: LabWorkflowDefinitionV2): boolean {
  return definition.nodes.some((node) => labWorkflowRuleNodeNeedsConfiguration(definition, node));
}
