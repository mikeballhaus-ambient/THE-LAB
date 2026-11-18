import type { LabWorkflowGraphEdgeV2 } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowManualRunStep } from '@/shared/types/lab-workflow-run';

/**
 * Edge ids along the path implied by consecutive executed steps (designer test/run panel).
 * Skipped nodes still appear in `steps` when the engine recorded them; we only connect pairs that
 * share a direct edge in the graph.
 */
export function labWorkflowRunPathEdgeIds(
  edges: LabWorkflowGraphEdgeV2[],
  steps: LabWorkflowManualRunStep[],
): string[] {
  if (steps.length < 2) {
    return [];
  }
  const ids: string[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i].nodeId;
    const to = steps[i + 1].nodeId;
    const match = edges.find((edge) => edge.source === from && edge.target === to);
    if (match) {
      ids.push(match.id);
    }
  }
  return ids;
}
