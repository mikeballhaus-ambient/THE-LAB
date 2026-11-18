import type {
  LabWorkflowManualRunStep,
  LabWorkflowRunStepStatus,
} from '@/shared/types/lab-workflow-run';
import { labWorkflowRunNodeStatusMap } from '@/shared/utils/lab-workflow-run-node-status';

function step(nodeId: string, status: LabWorkflowRunStepStatus = 'succeeded'): LabWorkflowManualRunStep {
  return {
    nodeId,
    nodeKind: 'action',
    status,
    itemsInCount: 1,
    itemsOutCount: 1,
    durationMs: 1,
    detail: null,
    error: null,
  };
}

describe('labWorkflowRunNodeStatusMap', () => {
  test('maps a single pass to succeeded', () => {
    expect(labWorkflowRunNodeStatusMap([step('trigger'), step('a')])).toEqual(
      new Map([
        ['trigger', 'succeeded'],
        ['a', 'succeeded'],
      ]),
    );
  });

  test('carries skipped distinctly from succeeded', () => {
    const map = labWorkflowRunNodeStatusMap([step('rule', 'skipped'), step('a')]);
    expect(map.get('rule')).toBe('skipped');
    expect(map.get('a')).toBe('succeeded');
  });

  test('a failed attempt wins over a later success for the same node', () => {
    // A merge node runs once per arriving branch; one branch failing must not be hidden by another
    // branch succeeding, or the canvas would claim the node was fine.
    const map = labWorkflowRunNodeStatusMap([
      step('merge', 'failed'),
      step('merge', 'succeeded'),
    ]);
    expect(map.get('merge')).toBe('failed');
  });

  test('a later failure overrides an earlier success', () => {
    const map = labWorkflowRunNodeStatusMap([
      step('retry', 'succeeded'),
      step('retry', 'failed'),
    ]);
    expect(map.get('retry')).toBe('failed');
  });

  test('returns an empty map for no steps', () => {
    expect(labWorkflowRunNodeStatusMap([]).size).toBe(0);
  });
});
