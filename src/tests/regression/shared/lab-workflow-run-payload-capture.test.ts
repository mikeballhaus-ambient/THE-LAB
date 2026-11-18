import { describe, expect, test } from '@jest/globals';
import { LAB_WORKFLOW_RUN_JSON_MAX_BYTES } from '@/shared/types/lab-workflow-run';

/**
 * Input/output payload capture on run steps.
 *
 * ## Why this is asserted
 *
 * When a graph misbehaves, the first two questions are "what did this node receive?" and "what did it
 * produce?". Before this existed the only way to answer either was to add temporary logging to a code
 * node — and then repeat for every node downstream.
 *
 * The budget matters as much as the content: a step row is written for every executed node of every
 * run, retained 200 runs deep per workflow, so an uncapped JSON column would let the run tables
 * outgrow the data they describe.
 *
 * The helper under test is duplicated here in its essential form because the real one is module-local
 * to the evaluator (which pulls in the whole backend graph). The cap arithmetic and the marker shape
 * are what the modal depends on, and those are exactly what is pinned.
 */

const PREVIEW_CHARS = 600;

function capRunPayload(value: unknown): unknown {
  let json: string;
  try {
    json = JSON.stringify(value);
  } catch {
    return { truncated: true, reason: 'not_serialisable' };
  }
  if (json == null) {
    return null;
  }
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes <= LAB_WORKFLOW_RUN_JSON_MAX_BYTES) {
    return value;
  }
  return {
    truncated: true,
    bytes,
    limitBytes: LAB_WORKFLOW_RUN_JSON_MAX_BYTES,
    preview: json.slice(0, PREVIEW_CHARS),
  };
}

describe('run step payload capture', () => {
  test('a small payload is stored verbatim', () => {
    // The webhook-loop case: the whole point is seeing `stepValue` move between passes.
    const items = [{ stepValue: 2, webhookId: 'e45adfaf' }];
    expect(capRunPayload(items)).toEqual(items);
  });

  test('a payload over the cap is replaced by a preview and the real size', () => {
    const big = [{ blob: 'x'.repeat(LAB_WORKFLOW_RUN_JSON_MAX_BYTES + 500) }];
    const capped = capRunPayload(big) as Record<string, unknown>;
    expect(capped.truncated).toBe(true);
    expect(typeof capped.preview).toBe('string');
    expect((capped.preview as string).length).toBe(PREVIEW_CHARS);
    // The reported size must be the payload's, not the cap's, or the reader cannot tell how far over.
    expect(capped.bytes as number).toBeGreaterThan(LAB_WORKFLOW_RUN_JSON_MAX_BYTES);
    expect(capped.limitBytes).toBe(LAB_WORKFLOW_RUN_JSON_MAX_BYTES);
  });

  test('the preview still starts with the real data', () => {
    // A preview that does not begin at the start of the JSON is useless for recognising the shape.
    const big = [{ stepValue: 9, blob: 'y'.repeat(LAB_WORKFLOW_RUN_JSON_MAX_BYTES + 100) }];
    const capped = capRunPayload(big) as Record<string, unknown>;
    expect((capped.preview as string).startsWith('[{"stepValue":9')).toBe(true);
  });

  test('an unserialisable payload does not lose the step', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const capped = capRunPayload(cyclic) as Record<string, unknown>;
    expect(capped.truncated).toBe(true);
    expect(capped.reason).toBe('not_serialisable');
  });

  test('a payload exactly at the cap is kept', () => {
    // Off-by-one here would silently truncate the most common large-but-legitimate case.
    const filler = 'z'.repeat(LAB_WORKFLOW_RUN_JSON_MAX_BYTES - 2); // + `""` quoting
    expect(capRunPayload(filler)).toBe(filler);
  });
});

/**
 * Straggler events.
 *
 * The run's HTTP response and its socket stream are independent channels: the response can resolve
 * before the last `succeeded` has been delivered. Events arriving after completion must be applied
 * immediately, not paced behind a 1 s timer — that is how a node ended up painted blue after a run.
 */
describe('run event handling after completion', () => {
  function makeHandler() {
    const statuses = new Map<string, string>();
    let runInFlight = false;
    let pending = 0;

    return {
      statuses,
      get pending() {
        return pending;
      },
      start(): void {
        runInFlight = true;
      },
      complete(): void {
        runInFlight = false;
        pending = 0; // flush
      },
      onStep(nodeId: string, status: string): void {
        if (!runInFlight) {
          statuses.set(nodeId, status); // applied immediately
          return;
        }
        pending += 1;
        statuses.set(nodeId, status);
        pending -= 1;
      },
    };
  }

  test('a straggler applied after completion settles the node', () => {
    const h = makeHandler();
    h.start();
    h.onStep('n-code', 'running');
    h.complete();
    expect(h.statuses.get('n-code')).toBe('running');

    // Delivered late — must land at once, not behind a timer.
    h.onStep('n-code', 'succeeded');
    expect(h.statuses.get('n-code')).toBe('succeeded');
    expect(h.pending).toBe(0);
  });

  test('the last event for a node still wins across completion', () => {
    const h = makeHandler();
    h.start();
    h.onStep('n-code', 'running');
    h.onStep('n-code', 'succeeded');
    h.complete();
    h.onStep('n-code', 'succeeded');
    expect(h.statuses.get('n-code')).toBe('succeeded');
  });
});
