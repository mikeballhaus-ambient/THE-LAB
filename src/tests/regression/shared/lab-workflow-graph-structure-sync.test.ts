import { labWorkflowGraphStructureSyncKey } from '@/shared/utils/lab-workflow-graph-structure-sync';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

const baseDef: LabWorkflowDefinitionV2 = {
  schemaVersion: 2,
  nodes: [
    {
      id: 'a1',
      kind: 'action',
      position: { x: 10, y: 20 },
      step: { kind: 'notify_users', userIds: [1] },
    },
  ],
  edges: [],
};

describe('labWorkflowGraphStructureSyncKey', () => {
  test('ignores position-only node changes', () => {
    const moved: LabWorkflowDefinitionV2 = {
      ...baseDef,
      nodes: [{ ...baseDef.nodes[0], position: { x: 400, y: 500 } }],
    };
    expect(labWorkflowGraphStructureSyncKey(baseDef)).toBe(labWorkflowGraphStructureSyncKey(moved));
  });

  test('ignores viewport-only changes', () => {
    const panned: LabWorkflowDefinitionV2 = {
      ...baseDef,
      viewport: { x: 120, y: 80, zoom: 0.85 },
    };
    expect(labWorkflowGraphStructureSyncKey(baseDef)).toBe(labWorkflowGraphStructureSyncKey(panned));
  });

  test('changes when step content changes', () => {
    const edited: LabWorkflowDefinitionV2 = {
      ...baseDef,
      nodes: [
        {
          id: 'a1',
          kind: 'action',
          position: { x: 10, y: 20 },
          step: { kind: 'notify_users', userIds: [1, 2] },
        },
      ],
    };
    expect(labWorkflowGraphStructureSyncKey(baseDef)).not.toBe(labWorkflowGraphStructureSyncKey(edited));
  });
});
