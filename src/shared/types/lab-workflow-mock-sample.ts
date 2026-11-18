/**
 * Saved trigger payloads for Workflow Studio (W5b).
 *
 * ## Why a mock is stored, not typed each time
 *
 * A workflow author cannot invent the payload an external system sends — they do not know its shape
 * until it has been seen once. Without a saved sample, testing a webhook workflow means hand-writing
 * JSON against a guess, and re-writing it after every edit. A named sample makes "the payload Stripe
 * sends" a thing that exists once and is reused.
 *
 * ## Why it is scoped to a trigger node
 *
 * A workflow may later hold several triggers (W8 adds schedule variants). A sample belongs to the
 * trigger whose shape it describes, not to the workflow — a schedule mock and an event mock are not
 * interchangeable.
 */

export interface LabWorkflowMockSample {
  id: string;
  workflowId: string;
  /** The trigger node this payload shape belongs to. */
  triggerNodeId: string;
  name: string;
  /** The full envelope, not just `payload` — a mock also fixes the event type and actor. */
  envelopeJson: string;
  createdByUserId: number;
  createdAt: string;
  /** Set when the sample came from a real captured event (W5c) rather than being authored. */
  capturedAt?: string | null;
}

/** Upper bound on samples per workflow — this is a scratchpad, not a fixture library. */
export const LAB_WORKFLOW_MOCK_SAMPLES_PER_WORKFLOW = 20;

/** Cap on a single sample body, matching the run envelope cap so a replay cannot be the outlier. */
export const LAB_WORKFLOW_MOCK_SAMPLE_MAX_BYTES = 32_768;
