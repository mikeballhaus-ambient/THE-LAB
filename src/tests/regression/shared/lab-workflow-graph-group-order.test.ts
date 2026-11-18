import { orderWorkflowGroupMembers } from '@/shared/utils/lab-workflow-graph-group-order';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

describe('orderWorkflowGroupMembers', () => {
  test('follows edge chain from group entry', () => {
    const def: LabWorkflowDefinitionV2 = {
      schemaVersion: 2,
      nodes: [
        { id: 'g1', kind: 'group', position: { x: 0, y: 0 }, label: 'G', groupType: 'actions' },
        { id: 'a1', kind: 'action', groupId: 'g1', position: { x: 0, y: 0 }, step: { kind: 'notify_users', userIds: [1] } },
        { id: 'a2', kind: 'action', groupId: 'g1', position: { x: 0, y: 80 }, step: { kind: 'notify_users', userIds: [2] } },
      ],
      edges: [
        { id: 'e1', source: 'g1', target: 'a2', when: 'always' },
        { id: 'e2', source: 'a2', target: 'a1', when: 'always' },
      ],
    };
    const members = def.nodes.filter((n) => n.kind === 'action');
    const ordered = orderWorkflowGroupMembers(def, 'g1', members);
    expect(ordered.map((n) => n.id)).toEqual(['a2', 'a1']);
  });
});
