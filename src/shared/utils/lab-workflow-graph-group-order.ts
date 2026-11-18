import type { LabWorkflowDefinitionV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';

/** Order member nodes: edge chain from group entry, else top-to-bottom canvas order. */
export function orderWorkflowGroupMembers<T extends LabWorkflowGraphNodeV2>(
  definition: LabWorkflowDefinitionV2,
  groupId: string,
  members: T[],
): T[] {
  if (members.length <= 1) {
    return members;
  }
  const memberIds = new Set(members.map((m) => m.id));
  const entryEdge = definition.edges.find((e) => e.source === groupId && memberIds.has(e.target));
  if (!entryEdge) {
    return [...members].sort(
      (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
    );
  }

  const ordered: LabWorkflowGraphNodeV2[] = [];
  const visited = new Set<string>();
  let currentId: string | null = entryEdge.target;

  while (currentId && memberIds.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    const node = members.find((m) => m.id === currentId);
    if (node) {
      ordered.push(node);
    }
    const nextEdge = definition.edges.find(
      (e) => e.source === currentId && memberIds.has(e.target) && e.when === 'always',
    );
    currentId = nextEdge?.target ?? null;
  }

  for (const member of members) {
    if (!visited.has(member.id)) {
      ordered.push(member);
    }
  }
  return ordered as T[];
}
