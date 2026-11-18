import type { LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import type {
  LabWorkflowActionGroupExecutionMode,
  LabWorkflowActionGroupFailurePolicy,
  LabWorkflowGraphGroupType,
  LabWorkflowRuleGroupCombineMode,
} from '@/shared/types/lab-workflow-graph-group';

export type NormalizedWorkflowGroupNode = Extract<LabWorkflowGraphNodeV2, { kind: 'group' }> & {
  groupType: LabWorkflowGraphGroupType;
  executionMode: LabWorkflowActionGroupExecutionMode;
  failurePolicy: LabWorkflowActionGroupFailurePolicy;
  ruleCombine: LabWorkflowRuleGroupCombineMode;
  continueOnNoMatch: boolean;
};

export function normalizeWorkflowGroupNode(
  node: Extract<LabWorkflowGraphNodeV2, { kind: 'group' }>,
): NormalizedWorkflowGroupNode {
  const groupType = node.groupType ?? 'actions';
  return {
    ...node,
    groupType,
    executionMode: node.executionMode ?? 'sequential',
    failurePolicy: node.failurePolicy ?? 'stop',
    ruleCombine: node.ruleCombine ?? 'sequential_first_match',
    continueOnNoMatch: node.continueOnNoMatch ?? false,
  };
}
