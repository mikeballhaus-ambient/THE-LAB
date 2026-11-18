import type {
  LabWorkflowManualRunStep,
  LabWorkflowRunNodeVisualStatus,
} from '@/shared/types/lab-workflow-run';

/**
 * Node → canvas colour for a finished run.
 *
 * A node can appear more than once in `steps` — a merge node is executed once per arriving branch,
 * and a retried node records each attempt. The worst outcome wins: if any attempt failed the node is
 * an error, because hiding a failure behind a later success is the one thing a run view must not do.
 */
export function labWorkflowRunNodeStatusMap(
  steps: readonly LabWorkflowManualRunStep[],
): Map<string, LabWorkflowRunNodeVisualStatus> {
  const byNode = new Map<string, LabWorkflowRunNodeVisualStatus>();
  for (const step of steps) {
    const current = byNode.get(step.nodeId);
    if (current === 'failed') {
      continue;
    }
    if (step.status === 'failed') {
      byNode.set(step.nodeId, 'failed');
    } else if (!current) {
      byNode.set(step.nodeId, step.status);
    }
  }
  return byNode;
}
