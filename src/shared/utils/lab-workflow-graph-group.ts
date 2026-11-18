import type { LabWorkflowDefinitionV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowGraphGroupType } from '@/shared/types/lab-workflow-graph-group';
import { normalizeWorkflowGroupNode } from '@/shared/utils/lab-workflow-graph-group-normalize';

export function labWorkflowGraphGroupNodes(
  definition: LabWorkflowDefinitionV2,
  groupType?: LabWorkflowGraphGroupType,
): LabWorkflowGraphNodeV2[] {
  return definition.nodes.filter((node) => {
    if (node.kind !== 'group') {
      return false;
    }
    if (!groupType) {
      return true;
    }
    return normalizeWorkflowGroupNode(node).groupType === groupType;
  });
}

export function labWorkflowGraphGroupMemberNodes(
  definition: LabWorkflowDefinitionV2,
  groupId: string,
  memberKind: 'action' | 'rule',
): LabWorkflowGraphNodeV2[] {
  return definition.nodes.filter(
    (node) => node.kind === memberKind && node.groupId === groupId,
  );
}
