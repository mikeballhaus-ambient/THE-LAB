/**
 * Armed trigger listening for Workflow Studio (W5c).
 *
 * ## What this answers
 *
 * W5a asks "does the graph work?" and W5b asks "does it work with this shape?". Neither can answer
 * **"is my trigger wired correctly?"** — for that the author needs the real event to arrive while
 * they are watching. Listen mode arms a workflow for exactly one real trigger without enabling it.
 *
 * ## Why the state is in memory and not a table
 *
 * Arming is a five-minute debugging gesture, not configuration. A persisted arm would survive a
 * restart and leave a workflow reacting to production after the author has closed the tab — the
 * exact accident the expiry exists to prevent. In-memory means a restart silently disarms, which is
 * the safe direction.
 *
 * ## Why it expires
 *
 * An author who arms and walks away must not leave a live subscription behind. Every read of the
 * registry prunes expired entries, so expiry happens whether or not anything is armed, and there is
 * no timer to leak.
 */

/** One armed workflow, waiting for the next matching event. */
export interface ArmedWorkflowListen {
  workflowId: string;
  userId: number;
  /**
   * The role the user held when they armed this.
   *
   * Captured at arm time rather than re-read at capture time, for two reasons: the arm is authorised
   * by that user's request, and the registry is a plain data structure with no database dependency —
   * which is what lets the publish pipeline consult it on a path that must never fail.
   */
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  /** The event type the trigger expects, captured at arm time. */
  triggerEventType: string;
  /**
   * When true, the capture is a dry run: the graph evaluates and results are shown, but no
   * notification is sent and no provider record is written. Defaults to true — see `armListen`.
   */
  dryRun: boolean;
  armedAt: number;
  expiresAt: number;
}

/** How long an arm survives. Short on purpose: this is a debugging aid, not a deployment. */
export const LAB_WORKFLOW_LISTEN_TTL_MS = 5 * 60 * 1000;

/** One capture, reported back to the designer. */
export interface CapturedWorkflowListen {
  workflowId: string;
  userId: number;
  triggerEventType: string;
  eventType: string;
  eventId: string;
  dryRun: boolean;
  runId: string | null;
  status: string;
  steps: number;
  mockSampleId: string | null;
}

export interface ArmListenParams {
  workflowId: string;
  userId: number;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  triggerEventType: string;
  /** Defaults to **true**: a capture must not notify anyone unless the author says so. */
  dryRun?: boolean;
  ttlMs?: number;
}

/**
 * Insertion-ordered so "the oldest arm" is well defined when several target the same workflow.
 * The key is `userId:workflowId` — two authors watching the same workflow are independent.
 */
const armed = new Map<string, ArmedWorkflowListen>();

function keyFor(userId: number, workflowId: string): string {
  return `${userId}:${workflowId}`;
}

function prune(now = Date.now()): void {
  for (const [key, entry] of armed) {
    if (entry.expiresAt <= now) {
      // Dropping the entry is the whole disarm. There is no subscription to cancel because the
      // pipeline consults this map on every event rather than registering a handler per arm.
      armed.delete(key);
    }
  }
}

export function armListen(params: ArmListenParams): ArmedWorkflowListen {
  prune();
  const now = Date.now();
  const entry: ArmedWorkflowListen = {
    workflowId: params.workflowId,
    userId: params.userId,
    userRole: params.userRole,
    triggerEventType: params.triggerEventType,
    dryRun: params.dryRun !== false,
    armedAt: now,
    expiresAt: now + (params.ttlMs ?? LAB_WORKFLOW_LISTEN_TTL_MS),
  };
  armed.set(keyFor(params.userId, params.workflowId), entry);
  return entry;
}

export function disarmListen(userId: number, workflowId: string): boolean {
  prune();
  return armed.delete(keyFor(userId, workflowId));
}

export function getListen(userId: number, workflowId: string): ArmedWorkflowListen | null {
  prune();
  return armed.get(keyFor(userId, workflowId)) ?? null;
}

/** Every live arm for a user. Used by the designer to restore the banner after a refresh. */
export function listListensForUser(userId: number): ArmedWorkflowListen[] {
  prune();
  return [...armed.values()].filter((entry) => entry.userId === userId);
}

/**
 * Take the arms that match an event, removing them as they are taken.
 *
 * Removal is deliberate: an arm watches for **the next** trigger. Leaving it armed would keep
 * capturing every subsequent event, which is both surprising and a way to accumulate samples the
 * author never asked for.
 */
export function takeMatchingListens(
  eventType: string,
  now = Date.now(),
): ArmedWorkflowListen[] {
  prune(now);
  const taken: ArmedWorkflowListen[] = [];
  for (const [key, entry] of armed) {
    if (entry.triggerEventType !== eventType) {
      continue;
    }
    taken.push(entry);
    armed.delete(key);
  }
  return taken;
}

/** Test seam — a module-level map would otherwise leak between cases. */
export function clearAllListensForTests(): void {
  armed.clear();
}
