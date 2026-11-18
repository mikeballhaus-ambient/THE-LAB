import { describe, expect, test } from '@jest/globals';
import type { LabWorkflowRunNodeVisualStatus } from '@/shared/types/lab-workflow-run';

/**
 * The pacing queue must be flushed when a run completes.
 *
 * ## The bug this exists for
 *
 * Previews pace their narration at one transition per second. A real run finishes in a fraction of
 * that, so when the run completes there are normally several transitions still queued — and a node
 * whose `running` was already applied but whose settled event is still in the queue stays painted
 * blue forever, because nothing forces the queue to drain once no more events arrive.
 *
 * The visible symptom was "the loop / second IF never turned green" while the step list showed it
 * succeeded.
 *
 * This test models the queue's state machine directly (the component itself needs a mounted canvas),
 * so the invariant is pinned: **after a run completes, no node remains `running`.**
 */

type Queued = { nodeId: string; status: LabWorkflowRunNodeVisualStatus };

/** The queue + apply loop, extracted so the ordering rules can be asserted without a DOM. */
function makePacedQueue() {
  const statuses = new Map<string, LabWorkflowRunNodeVisualStatus>();
  let queue: Queued[] = [];
  const displayed: string[] = [];

  function apply(step: Queued): void {
    statuses.set(step.nodeId, step.status);
    if (step.status !== 'running') {
      displayed.push(step.nodeId);
    }
  }

  return {
    statuses,
    displayed,
    push(step: Queued): void {
      queue.push(step);
    },
    /** One paced tick — what the setTimeout callback does. */
    tick(): void {
      const next = queue.shift();
      if (next) {
        apply(next);
      }
    },
    /** What `onRunComplete` now does. */
    flush(): void {
      while (queue.length > 0) {
        const next = queue.shift();
        if (next) {
          apply(next);
        }
      }
    },
    get pending(): number {
      return queue.length;
    },
    reset(): void {
      queue = [];
    },
  };
}

describe('run pacing queue', () => {
  test('a settled event stuck in the queue would leave the node running', () => {
    // Reproduces the old behaviour: no flush, so the settled event is never applied.
    const q = makePacedQueue();
    q.push({ nodeId: 'n-if', status: 'running' });
    q.push({ nodeId: 'n-if', status: 'succeeded' });

    q.tick(); // applies `running` only — the run has already finished here
    expect(q.statuses.get('n-if')).toBe('running');

    // Without a flush the node stays blue indefinitely.
    expect(q.pending).toBe(1);
  });

  test('flushing at completion settles every queued node', () => {
    const q = makePacedQueue();
    q.push({ nodeId: 'n-if', status: 'running' });
    q.push({ nodeId: 'n-if', status: 'succeeded' });
    q.push({ nodeId: 'n-loop', status: 'running' });
    q.push({ nodeId: 'n-loop', status: 'succeeded' });

    q.tick();
    q.flush();

    expect(q.statuses.get('n-if')).toBe('succeeded');
    expect(q.statuses.get('n-loop')).toBe('succeeded');
    expect(q.pending).toBe(0);
    // No node may be left mid-flight once the run is over.
    expect([...q.statuses.values()]).not.toContain('running');
  });

  test('flush is order-preserving, so the last event for a node wins', () => {
    // The loop runs several passes, so one node legitimately emits many transitions. A flush must not
    // reorder them or a later `running` would overwrite an earlier `succeeded`.
    const q = makePacedQueue();
    for (const status of [
      'running',
      'succeeded',
      'running',
      'succeeded',
      'running',
      'succeeded',
    ] as LabWorkflowRunNodeVisualStatus[]) {
      q.push({ nodeId: 'n-loop', status });
    }
    q.flush();
    expect(q.statuses.get('n-loop')).toBe('succeeded');
  });
});
