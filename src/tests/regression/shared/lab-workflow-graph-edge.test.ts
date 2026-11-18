import { outgoingEdges } from '@/shared/utils/lab-workflow-graph-edge';
import type { LabWorkflowGraphEdgeV2 } from '@/shared/types/lab-workflow-graph';

describe('lab-workflow-graph-edge', () => {
  const edges: LabWorkflowGraphEdgeV2[] = [
    { id: '1', source: 'cond', target: 'a', when: 'on_true' },
    { id: '2', source: 'cond', target: 'b', when: 'on_false' },
    { id: '3', source: 'rule', target: 'c', when: 'on_match' },
    { id: '4', source: 'rule', target: 'd', when: 'on_no_match' },
  ];

  test('condition branches filter by pass flag', () => {
    expect(outgoingEdges(edges, 'cond', { conditionPass: true }).map((e) => e.target)).toEqual(['a']);
    expect(outgoingEdges(edges, 'cond', { conditionPass: false }).map((e) => e.target)).toEqual(['b']);
  });

  test('rule branches filter by match flag', () => {
    expect(outgoingEdges(edges, 'rule', { ruleMatch: true }).map((e) => e.target)).toEqual(['c']);
    expect(outgoingEdges(edges, 'rule', { ruleMatch: false }).map((e) => e.target)).toEqual(['d']);
  });
});
