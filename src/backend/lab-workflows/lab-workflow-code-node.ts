import vm from 'node:vm';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';

/**
 * The `code` step: evaluate a function expression over the item array.
 *
 * ## What this is and is not
 *
 * `set_fields` covers shaping — read a path, write it elsewhere. This node exists for the residue
 * that declarative mapping cannot express: arithmetic on a value, string surgery, reshaping that
 * depends on several fields at once. It is the escape hatch, not the default, which is why it is one
 * narrow contract rather than a scripting environment.
 *
 * ## Sandbox limits, stated honestly
 *
 * `node:vm` is **not a security boundary** — Node documents it as isolation from accidental global
 * access, not protection from hostile code, and a determined author can escape it. That is an
 * acceptable trade here because the person writing a `code` node is an authenticated lab user who
 * can already call every platform MCP tool; the threat model is "don't break the process", not
 * "contain an attacker".
 *
 * What it *does* buy, and why it is worth the trouble:
 *
 * - **No `process`, no `require`, no `fetch`, no `import`.** A fresh V8 context has none of them, so
 *   a script cannot read the environment, open a socket, or touch the filesystem by accident — the
 *   far more likely failure than malice.
 * - **A hard time limit.** The invocation itself runs inside `runInNewContext`, so an infinite loop
 *   is interrupted rather than hanging the backend. A timeout that only wrapped compilation would
 *   look like protection and provide none.
 * - **A bounded result.** Returning a non-array, or a million rows, is rejected at the boundary, so a
 *   bug in a script surfaces as a failed node with a named reason instead of corrupting every
 *   downstream node.
 */

/** Cap on items a code node may return, mirroring the caps the declarative nodes carry. */
export const LAB_WORKFLOW_CODE_MAX_ITEMS = 1_000;

/** Default evaluation budget. Typing work is per item, so this is generous but not unbounded. */
export const LAB_WORKFLOW_CODE_DEFAULT_TIMEOUT_MS = 1_000;

/** Hard ceiling, matching the schema's `timeoutMs` cap. */
export const LAB_WORKFLOW_CODE_MAX_TIMEOUT_MS = 5_000;

export interface CodeStepResult {
  items: LabWorkflowItem[];
  detail: Record<string, unknown>;
}

export class LabWorkflowCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LabWorkflowCodeError';
  }
}

/**
 * Build the context the script sees.
 *
 * The script receives each item's **JSON**, not the internal `{ json, pairedItem }` envelope. The
 * envelope is a runtime detail; making an author write `i.json.foo` in every line would be exposing
 * plumbing, and the friendly form (`items.map(i => ({ ...i, total: i.a + i.b }))`) is the one that
 * needs no explanation. Items are re-stamped with this node id on the way out, so nothing is lost.
 *
 * Only deterministic, side-effect-free helpers are exposed. `console` is a no-op rather than absent:
 * a script that logs is common while an author is iterating, and swallowing the call is friendlier
 * than a `ReferenceError` that reads like a bug in the platform.
 */
function sandboxContext(items: readonly LabWorkflowItem[]): Record<string, unknown> {
  return {
    __items: items.map((item) => structuredCloneSafe(item.json)),
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Date,
    console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {} },
  };
}

/** `structuredClone` is available on Node 18+, but a JSON round trip keeps this dependency-free. */
function structuredCloneSafe(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function describeThrown(err: unknown): string {
  if (err instanceof Error) {
    // `node:vm` reports timeouts as a plain Error with this exact message; naming it as a timeout
    // rather than "Script execution timed out" lets the run detail say what the author must change.
    if (err.message.includes('Script execution timed out')) {
      return 'The code took too long and was stopped. Reduce the work per item or raise the timeout.';
    }
    return err.message;
  }
  return String(err);
}

/**
 * Run one `code` step.
 *
 * Returns rewritten items, stamped with this node id so the run panel can attribute them — the same
 * contract every other transform honours.
 */
export function applyCodeStep(
  items: readonly LabWorkflowItem[],
  source: string,
  nodeId: string,
  timeoutMs?: number,
): CodeStepResult {
  const budget = Math.min(
    timeoutMs ?? LAB_WORKFLOW_CODE_DEFAULT_TIMEOUT_MS,
    LAB_WORKFLOW_CODE_MAX_TIMEOUT_MS,
  );
  const context = sandboxContext(items);

  let produced: unknown;
  try {
    // The invocation is *inside* the script on purpose: `runInNewContext` can only interrupt work it
    // is itself executing, so compiling the function and then calling it from here would leave the
    // call unbounded.
    const script = new vm.Script(`(${source})(__items)`, { filename: 'workflow-code.js' });
    produced = script.runInNewContext(context, { timeout: budget });
  } catch (err) {
    throw new LabWorkflowCodeError(describeThrown(err));
  }

  if (!Array.isArray(produced)) {
    throw new LabWorkflowCodeError(
      `The code must return an array of items, but returned ${describeType(produced)}.`,
    );
  }
  if (produced.length > LAB_WORKFLOW_CODE_MAX_ITEMS) {
    throw new LabWorkflowCodeError(
      `The code returned ${produced.length} items, over the ${LAB_WORKFLOW_CODE_MAX_ITEMS} limit.`,
    );
  }

  const out: LabWorkflowItem[] = produced.map((entry, itemIndex) => {
    // Both a bare object and a `{ json }` envelope are accepted: returning `{ ...item, x }` is the
    // natural way to write this node now that the input is flattened, but an author who reconstructs
    // the envelope by hand should not be punished for it.
    const candidate = entry as { json?: unknown } | null;
    const json =
      candidate && typeof candidate === 'object' && 'json' in candidate && candidate.json != null
        ? candidate.json
        : entry;
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      throw new LabWorkflowCodeError(
        `Item ${itemIndex + 1} is ${describeType(json)}; every returned item must be an object.`,
      );
    }
    return { json: json as Record<string, unknown>, pairedItem: { nodeId, itemIndex } };
  });

  return {
    items: out,
    detail: {
      stepKind: 'code',
      itemCountIn: items.length,
      itemCountOut: out.length,
      timeoutMs: budget,
    },
  };
}

function describeType(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'an array';
  }
  return typeof value;
}
