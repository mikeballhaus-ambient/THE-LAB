import type { LabWorkflowNodeExecutionPolicy } from '@/shared/types/lab-workflow-graph';
import {
  LAB_WORKFLOW_NODE_BACKOFF_MAX_MS,
  LAB_WORKFLOW_NODE_RETRY_MAX_ATTEMPTS,
  LAB_WORKFLOW_NODE_TIMEOUT_MAX_MS,
} from '@/shared/types/lab-workflow-graph';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';
import { getPayloadValueAtPath } from '@/shared/utils/lab-payload-path';

/**
 * Runs a node under its execution policy: retry, backoff, timeout, idempotency.
 *
 * ## Why this is separate from the step runner
 *
 * `runWorkflowStep` answers *what does this node do*. This answers *how many times, for how long, and
 * whether at all* — which is the same for every node kind and must stay consistent across them. W6+
 * adds many node kinds; none of them should re-implement backoff.
 *
 * ## Why retries default to zero
 *
 * A retry is only correct for a *transient* failure. Applying it to a validation error delays the
 * report and triple-writes nothing, so the default is one attempt and a user opts in per node.
 */

export type NodeAttemptFailure = {
  /** Message to surface in the run panel. */
  message: string;
  /**
   * Whether another attempt could plausibly succeed.
   *
   * A timeout is ambiguous — the effect may or may not have landed — so it is retryable *only* when
   * an idempotency key makes a repeat safe. The caller decides; this module only records intent.
   */
  retryable: boolean;
};

export interface ExecuteNodeOptions<T> {
  run: () => Promise<T>;
  policy: LabWorkflowNodeExecutionPolicy | undefined;
  /** For resolving `{{payload.x}}` in the idempotency key and for logging. */
  envelope: LabDomainEventEnvelopeV1;
  items?: readonly LabWorkflowItem[];
  nodeId: string;
  /** Called after each failed attempt, before a retry decision. Used to record attempts. */
  onAttemptFailed?: (failure: NodeAttemptFailure, attempt: number) => void;
}

export interface ExecuteNodeResult<T> {
  ok: true;
  value: T;
  attempts: number;
  totalDurationMs: number;
}

export interface ExecuteNodeFailure {
  ok: false;
  failure: NodeAttemptFailure;
  attempts: number;
  totalDurationMs: number;
}

/** Clamp user-authored numbers so a typo cannot hang a workflow or hammer a server. */
export function resolveRetryPolicy(policy: LabWorkflowNodeExecutionPolicy | undefined): {
  attempts: number;
  backoffMs: number;
} {
  const rawAttempts = policy?.retry?.attempts ?? 0;
  const attempts = Number.isFinite(rawAttempts)
    ? Math.min(Math.max(Math.trunc(rawAttempts), 0), LAB_WORKFLOW_NODE_RETRY_MAX_ATTEMPTS)
    : 0;
  const rawBackoff = policy?.retry?.backoffMs ?? 250;
  const backoffMs = Number.isFinite(rawBackoff)
    ? Math.min(Math.max(Math.trunc(rawBackoff), 0), LAB_WORKFLOW_NODE_BACKOFF_MAX_MS)
    : 250;
  return { attempts, backoffMs };
}

export function resolveTimeoutMs(policy: LabWorkflowNodeExecutionPolicy | undefined): number | null {
  const raw = policy?.timeoutMs;
  if (raw == null || !Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return Math.min(Math.trunc(raw), LAB_WORKFLOW_NODE_TIMEOUT_MAX_MS);
}

/**
 * Resolve `{{payload.a.b}}` references inside a key template.
 *
 * Deliberately minimal — this is not the expression language that W4 introduces for notification
 * templates. An idempotency key needs payload identity, nothing more, and a small resolver cannot
 * accidentally become a scripting surface.
 */
export interface ResolvedKeyTemplate {
  text: string;
  /** True when at least one `{{payload.x}}` reference had no value. */
  unresolved: boolean;
}

export function resolveKeyTemplate(
  template: string,
  envelope: LabDomainEventEnvelopeV1,
  item?: LabWorkflowItem,
): ResolvedKeyTemplate {
  let unresolved = false;
  const text = template.replace(/\{\{\s*payload\.([\w.]+)\s*\}\}/g, (_match, path: string) => {
    // Prefer the item (so a loop iteration keys per row), falling back to the event payload.
    const fromItem = item ? getPayloadValueAtPath(item.json, path) : undefined;
    const value = fromItem !== undefined
      ? fromItem
      : getPayloadValueAtPath(envelope.payload, path);
    if (value == null || value === '') {
      unresolved = true;
      return '';
    }
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
  return { text, unresolved };
}

/** The fully-resolved idempotency key, or null when the node does not declare a usable one. */
export function resolveIdempotencyKey(
  policy: LabWorkflowNodeExecutionPolicy | undefined,
  envelope: LabDomainEventEnvelopeV1,
  item?: LabWorkflowItem,
): string | null {
  const template = policy?.idempotencyKey?.trim();
  if (!template) {
    return null;
  }
  const { text, unresolved } = resolveKeyTemplate(template, envelope, item);
  // A key with a missing reference must not become a key. `task.{{payload.missing}}` would other-
  // wise resolve to the literal `task.` — identical for every item — and the ledger would suppress
  // every effect after the first. Returning null means "no key", which is safe: the node runs.
  if (unresolved) {
    return null;
  }
  const resolved = text.trim();
  return resolved.length > 0 ? `${envelope.type}:${resolved}` : null;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Wrap a promise so it rejects at the deadline rather than running forever. */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number | null): Promise<T> {
  if (timeoutMs == null) {
    return promise;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error(`timed out after ${timeoutMs}ms`), { __labTimeout: true }));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function isTimeout(err: unknown): boolean {
  return typeof err === 'object' && err != null && '__labTimeout' in err;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return typeof err === 'string' ? err : 'node threw';
}

/**
 * Run a node, retrying per policy.
 *
 * Backoff is exponential (`baseMs * 2^(attempt-1)`), capped, and honours the node's own setting. A
 * throw is treated as retryable; a timeout is retryable only when an idempotency key is present,
 * because otherwise a retry could duplicate an effect that already happened.
 */
export async function executeNodeWithPolicy<T>(
  options: ExecuteNodeOptions<T>,
): Promise<ExecuteNodeResult<T> | ExecuteNodeFailure> {
  const { attempts, backoffMs } = resolveRetryPolicy(options.policy);
  const timeoutMs = resolveTimeoutMs(options.policy);
  const keyConfigured = Boolean(options.policy?.idempotencyKey?.trim());
  const startedAt = Date.now();
  let attempt = 0;

  for (;;) {
    attempt += 1;
    try {
      const value = await withTimeout(options.run(), timeoutMs);
      return { ok: true, value, attempts: attempt, totalDurationMs: Date.now() - startedAt };
    } catch (err) {
      const timedOut = isTimeout(err);
      const failure: NodeAttemptFailure = {
        message: messageOf(err),
        // A timeout may have already applied the effect; repeating it is only safe with a key.
        retryable: timedOut ? keyConfigured : true,
      };
      options.onAttemptFailed?.(failure, attempt);

      const canRetry = failure.retryable && attempt <= attempts;
      if (!canRetry) {
        return { ok: false, failure, attempts: attempt, totalDurationMs: Date.now() - startedAt };
      }
      const delay = Math.min(backoffMs * 2 ** (attempt - 1), LAB_WORKFLOW_NODE_BACKOFF_MAX_MS);
      await sleep(delay);
    }
  }
}

/**
 * In-memory idempotency ledger.
 *
 * Deliberately not a table. The key exists to stop a *retry* from double-writing, and a retry always
 * happens inside one `evaluateWorkflowsForDomainEvent` call — so the ledger only has to outlive the
 * node. Persisting keys would create a second source of truth for "has this run", which W1's run rows
 * already answer. `expiresAt` bounds process memory from long-lived keys.
 */
export class LabWorkflowIdempotencyLedger {
  private static instance: LabWorkflowIdempotencyLedger | null = null;

  private readonly seen = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(ttlMs = 15 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  static getInstance(): LabWorkflowIdempotencyLedger {
    if (!LabWorkflowIdempotencyLedger.instance) {
      LabWorkflowIdempotencyLedger.instance = new LabWorkflowIdempotencyLedger();
    }
    return LabWorkflowIdempotencyLedger.instance;
  }

  /** True when the key was already used and is still live. */
  has(key: string): boolean {
    const expiresAt = this.seen.get(key);
    if (expiresAt == null) {
      return false;
    }
    if (Date.now() > expiresAt) {
      this.seen.delete(key);
      return false;
    }
    return true;
  }

  remember(key: string): void {
    this.seen.set(key, Date.now() + this.ttlMs);
  }

  /** Test seam only — a singleton ledger would otherwise leak between tests. */
  clear(): void {
    this.seen.clear();
  }
}

export const labWorkflowIdempotencyLedger = LabWorkflowIdempotencyLedger.getInstance();
