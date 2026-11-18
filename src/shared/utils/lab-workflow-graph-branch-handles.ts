import type { LabWorkflowEdgeWhen, LabWorkflowGraphEdgeV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';

export const LAB_WORKFLOW_HANDLE_TRUE = 'true';
export const LAB_WORKFLOW_HANDLE_FALSE = 'false';
export const LAB_WORKFLOW_HANDLE_MATCH = 'match';
export const LAB_WORKFLOW_HANDLE_NO_MATCH = 'no-match';
/** Loop ports. `body` re-enters the loop; `done` leaves it. */
export const LAB_WORKFLOW_HANDLE_BODY = 'body';
export const LAB_WORKFLOW_HANDLE_DONE = 'done';

export interface LabWorkflowBranchHandleSpec {
  id: string;
  label: string;
  /** Percent from left edge of the node card (Vue Flow handle `left` style). */
  leftPercent: number;
}

export function labWorkflowNodeHasBranchOutputs(node: LabWorkflowGraphNodeV2): boolean {
  if (node.kind === 'condition' || node.kind === 'rule') {
    return true;
  }
  return (
    node.kind === 'action'
    && (node.step.kind === 'if_condition' || node.step.kind === 'loop')
  );
}

export function labWorkflowBranchHandlesForNode(node: LabWorkflowGraphNodeV2): LabWorkflowBranchHandleSpec[] {
  if (node.kind === 'action' && node.step.kind === 'loop') {
    // Body first (left) because it is the path the run takes while looping; `done` on the right is
    // where it ends up. Reading left-to-right matches the arrow of time.
    return [
      { id: LAB_WORKFLOW_HANDLE_BODY, label: 'While', leftPercent: 28 },
      { id: LAB_WORKFLOW_HANDLE_DONE, label: 'Done', leftPercent: 72 },
    ];
  }
  if (node.kind === 'rule') {
    return [
      { id: LAB_WORKFLOW_HANDLE_MATCH, label: 'Match', leftPercent: 28 },
      { id: LAB_WORKFLOW_HANDLE_NO_MATCH, label: 'No match', leftPercent: 72 },
    ];
  }
  return [
    { id: LAB_WORKFLOW_HANDLE_TRUE, label: 'True', leftPercent: 28 },
    { id: LAB_WORKFLOW_HANDLE_FALSE, label: 'False', leftPercent: 72 },
  ];
}

export function sourceHandleForWorkflowEdge(
  source: LabWorkflowGraphNodeV2 | undefined,
  edge: Pick<LabWorkflowGraphEdgeV2, 'when' | 'outputIndex'>,
): string | undefined {
  if (!source) {
    return undefined;
  }
  if (source.kind === 'condition') {
    if (edge.when === 'on_true') {
      return LAB_WORKFLOW_HANDLE_TRUE;
    }
    if (edge.when === 'on_false') {
      return LAB_WORKFLOW_HANDLE_FALSE;
    }
    return undefined;
  }
  if (source.kind === 'rule') {
    if (edge.when === 'on_match') {
      return LAB_WORKFLOW_HANDLE_MATCH;
    }
    if (edge.when === 'on_no_match') {
      return LAB_WORKFLOW_HANDLE_NO_MATCH;
    }
    return undefined;
  }
  if (source.kind === 'action' && source.step.kind === 'if_condition') {
    if (edge.outputIndex === 1 || edge.when === 'on_false') {
      return LAB_WORKFLOW_HANDLE_FALSE;
    }
    if (edge.outputIndex === 0 || edge.when === 'on_true') {
      return LAB_WORKFLOW_HANDLE_TRUE;
    }
  }
  if (source.kind === 'action' && source.step.kind === 'loop') {
    // Port 0 is the body, port 1 is done. `when` is always 'always' on a loop — the port decides.
    if (edge.outputIndex === 1) {
      return LAB_WORKFLOW_HANDLE_DONE;
    }
    if (edge.outputIndex === 0) {
      return LAB_WORKFLOW_HANDLE_BODY;
    }
  }
  return undefined;
}

export function edgeBranchFromSourceHandle(
  source: LabWorkflowGraphNodeV2 | undefined,
  handleId: string | null | undefined,
): Partial<Pick<LabWorkflowGraphEdgeV2, 'when' | 'outputIndex'>> {
  if (!source || !handleId) {
    return {};
  }
  if (source.kind === 'condition') {
    if (handleId === LAB_WORKFLOW_HANDLE_TRUE) {
      return { when: 'on_true' };
    }
    if (handleId === LAB_WORKFLOW_HANDLE_FALSE) {
      return { when: 'on_false' };
    }
    return {};
  }
  if (source.kind === 'rule') {
    if (handleId === LAB_WORKFLOW_HANDLE_MATCH) {
      return { when: 'on_match' };
    }
    if (handleId === LAB_WORKFLOW_HANDLE_NO_MATCH) {
      return { when: 'on_no_match' };
    }
    return {};
  }
  if (source.kind === 'action' && source.step.kind === 'if_condition') {
    if (handleId === LAB_WORKFLOW_HANDLE_TRUE) {
      return { when: 'on_true', outputIndex: 0 };
    }
    if (handleId === LAB_WORKFLOW_HANDLE_FALSE) {
      return { when: 'on_false', outputIndex: 1 };
    }
  }
  if (source.kind === 'action' && source.step.kind === 'loop') {
    // A loop routes by port only, so `when` stays `always` and the index carries the meaning.
    if (handleId === LAB_WORKFLOW_HANDLE_BODY) {
      return { when: 'always', outputIndex: 0 };
    }
    if (handleId === LAB_WORKFLOW_HANDLE_DONE) {
      return { when: 'always', outputIndex: 1 };
    }
  }
  return {};
}

export function defaultWhenForBranchingSource(source: LabWorkflowGraphNodeV2): LabWorkflowEdgeWhen {
  if (source.kind === 'condition') {
    return 'on_true';
  }
  if (source.kind === 'rule') {
    return 'on_match';
  }
  return 'always';
}
