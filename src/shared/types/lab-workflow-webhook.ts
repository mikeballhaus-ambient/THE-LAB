/**
 * Inbound webhooks (W10a).
 *
 * A webhook is a **credential**, not a URL. The token in the path identifies which workflow to run,
 * and it is stored hashed: a token that leaks through a log or a screenshot must not be replayable,
 * and a database read must not hand an attacker a working URL.
 *
 * The secret is separate from the token on purpose. The token says *which workflow*; the secret
 * proves *who is calling*. Sharing one value would mean rotating the URL to rotate the signing key,
 * which breaks every caller at once.
 */

/** Which endpoint a call arrived on. Decided by which secret matched, never by the URL. */
export type LabWorkflowWebhookMode = 'test' | 'live';

export interface LabWorkflowWebhook {
  id: string;
  workflowId: string;
  /** The trigger node this hook fires. */
  triggerNodeId: string;
  /** Human label so a user can tell two hooks on one workflow apart in the editor. */
  name: string;
  /**
   * Readable URL segment (`task-intake`). **Not a credential** — it exists so the URL says what it
   * is. Authorisation is the secret, and a valid slug with a bad secret must be indistinguishable
   * from an unknown slug.
   */
  slug: string;
  /**
   * SHA-256 of the **test** secret. Calls matching this hash run `dryRun: true`: the graph is walked
   * and described, nothing is sent and nothing is written.
   *
   * A separate secret from live on purpose. If both modes shared one token, a leaked test URL could
   * be edited into a live one — the separation would be cosmetic. The token *is* the credential, so
   * two modes need two credentials.
   */
  testTokenHash: string;
  /**
   * The plaintext test secret, so the designer can show the author the test URL after creation.
   *
   * `''` means "not recoverable" — a row minted before the column existed, or a seeded hook. The
   * panel offers regenerate rather than displaying a URL that would be rejected.
   */
  testSecret: string;
  /**
   * SHA-256 of the **live** secret. Calls matching this hash run for real.
   *
   * Before phase 37 this was the only hash (`token_hash`); the migration copies it here so an
   * existing integration keeps working and is treated as live — the mode it already ran in.
   */
  liveTokenHash: string;
  /** The plaintext live secret. Same `''`-means-unknown rule as {@link testSecret}. */
  liveSecret: string;
  /** Shared secret for HMAC verification, or null when the hook is unsigned (local testing only). */
  hmacSecret: string | null;
  /** Event type stamped on the synthesised envelope. */
  eventType: string;
  enabled: boolean;
  lastReceivedAt: string | null;
  /**
   * The payload shape the current output mapping was authored from (phase 37).
   *
   * Persisted rather than re-derived from captures, because captures are pruned and a mapping must
   * keep its provenance after the observation is gone. This is also what the panel renders when no
   * new capture has arrived.
   */
  mappingSourceJson: string | null;
  /** Fingerprint of `mappingSourceJson`, so divergence comparison is cheap and stable. */
  mappingSourceFingerprint: string | null;
  /** When the shape above was observed. */
  mappingSourceCapturedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * One observed webhook body (phase 37).
 *
 * Distinct from a mock sample: a mock sample is a **shape you replay**, a capture is a **shape that
 * happened**. Conflating them would let a live production call quietly become a test fixture.
 */
export interface LabWorkflowWebhookCapture {
  id: string;
  webhookId: string;
  mode: LabWorkflowWebhookMode;
  payloadJson: string;
  /** `path:type` shape fingerprint — values excluded, so a counter changing is not a change. */
  shapeFingerprint: string;
  receivedAt: string;
}

/** How many captures are kept per webhook. A discovery aid, not an audit log. */
export const LAB_WORKFLOW_WEBHOOK_CAPTURE_LIMIT = 10;

/** Cap on hooks per workflow: a URL is not a resource to hoard. */
export const LAB_WORKFLOW_WEBHOOK_MAX_PER_WORKFLOW = 10;

/**
 * How long a signature stays valid.
 *
 * A replay window is inevitable — the receiver cannot know whether a request was already delivered
 * unless it remembers, so the choice is between "remember forever" (unbounded state) and "remember
 * for N minutes" (bounded). Five minutes matches the tolerance every HMAC scheme in common use
 * picks, and it is longer than any plausible delivery retry.
 */
export const LAB_WORKFLOW_WEBHOOK_REPLAY_WINDOW_MS = 5 * 60_000;

/** Minimum gap between two accepted calls on the same hook. */
export const LAB_WORKFLOW_WEBHOOK_MIN_INTERVAL_MS = 1_000;

/** Header carrying the Unix-seconds timestamp the signature covers. */
export const LAB_WORKFLOW_WEBHOOK_TIMESTAMP_HEADER = 'x-lab-timestamp';

/** Header carrying the hex HMAC-SHA256 of `${timestamp}.${rawBody}`. */
export const LAB_WORKFLOW_WEBHOOK_SIGNATURE_HEADER = 'x-lab-signature';
