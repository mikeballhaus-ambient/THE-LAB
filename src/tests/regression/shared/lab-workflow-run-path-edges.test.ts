import type { LabWorkflowGraphEdgeV2 } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowManualRunStep } from '@/shared/types/lab-workflow-run';
import { labWorkflowRunPathEdgeIds } from '@/shared/utils/lab-workflow-run-path-edges';

function step(nodeId: string): LabWorkflowManualRunStep {
  return {
    nodeId,
    nodeKind: 'action',
    status: 'succeeded',
    itemsInCount: 1,
    itemsOutCount: 1,
    durationMs: 1,
    detail: null,
    error: null,
  };
}

describe('labWorkflowRunPathEdgeIds', () => {
  const edges: LabWorkflowGraphEdgeV2[] = [
    { id: 'e-ab', source: 'a', target: 'b', when: 'always' },
    { id: 'e-bc', source: 'b', target: 'c', when: 'on_true' },
  ];

  test('returns empty for fewer than two steps', () => {
    expect(labWorkflowRunPathEdgeIds(edges, [])).toEqual([]);
    expect(labWorkflowRunPathEdgeIds(edges, [step('a')])).toEqual([]);
  });

  test('maps consecutive steps to connecting edges', () => {
    expect(labWorkflowRunPathEdgeIds(edges, [step('a'), step('b'), step('c')])).toEqual([
      'e-ab',
      'e-bc',
    ]);
  });

  test('omits pairs with no matching edge', () => {
    expect(labWorkflowRunPathEdgeIds(edges, [step('a'), step('c')])).toEqual([]);
  });
});
