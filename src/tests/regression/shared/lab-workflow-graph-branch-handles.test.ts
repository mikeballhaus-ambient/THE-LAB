import {
  edgeBranchFromSourceHandle,
  LAB_WORKFLOW_HANDLE_FALSE,
  LAB_WORKFLOW_HANDLE_MATCH,
  LAB_WORKFLOW_HANDLE_NO_MATCH,
  LAB_WORKFLOW_HANDLE_TRUE,
  sourceHandleForWorkflowEdge,
} from '@/shared/utils/lab-workflow-graph-branch-handles';
import type { LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';

describe('lab-workflow-graph-branch-handles', () => {
  const conditionNode: LabWorkflowGraphNodeV2 = {
    id: 'c1',
    kind: 'condition',
    position: { x: 0, y: 0 },
    conditions: [],
  };

  test('maps condition edges to true/false handles', () => {
    expect(sourceHandleForWorkflowEdge(conditionNode, { when: 'on_true' })).toBe(LAB_WORKFLOW_HANDLE_TRUE);
    expect(sourceHandleForWorkflowEdge(conditionNode, { when: 'on_false' })).toBe(LAB_WORKFLOW_HANDLE_FALSE);
    expect(edgeBranchFromSourceHandle(conditionNode, LAB_WORKFLOW_HANDLE_FALSE)).toEqual({ when: 'on_false' });
  });

  test('maps rule edges to match handles', () => {
    const ruleNode: LabWorkflowGraphNodeV2 = {
      id: 'r1',
      kind: 'rule',
      position: { x: 0, y: 0 },
      ruleId: 'rule-1',
    };
    expect(sourceHandleForWorkflowEdge(ruleNode, { when: 'on_match' })).toBe(LAB_WORKFLOW_HANDLE_MATCH);
    expect(edgeBranchFromSourceHandle(ruleNode, LAB_WORKFLOW_HANDLE_NO_MATCH)).toEqual({ when: 'on_no_match' });
  });
});
