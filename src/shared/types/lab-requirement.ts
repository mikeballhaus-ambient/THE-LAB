/**
 * Declarative time-derived requirements (phase 33).
 *
 * A **requirement** is data, not code: it names a catalog app's connector service, the date field
 * on that service's records, and how far from that date an event should fire. The platform
 * requirement sweep reads the catalog, lists records through the ordinary connector contract, and
 * publishes the normal domain event per qualifying record.
 *
 * This exists because seven catalog events describe **the passage of time** rather than a state
 * change (`maintenance.due`, `rent.late`, `lease.expiring`, …). Nothing happens when a date passes,
 * so no app route can publish them: an app would have to run its own clock, which is a timer per app
 * process — the anti-pattern the single platform tick exists to avoid.
 *
 * @see src/shared/config/lab-requirement-catalog.ts — the entries and why they are requirements
 * @see docs/platform/lab-workflow-studio.md — the author-facing description
 */

/** How the record's date is compared with today. */
export type LabRequirementRelation = 'before' | 'after';

/**
 * A condition the record must also satisfy (e.g. a lease must still be `active`).
 *
 * `equals` alone was not enough: the rent requirement needs "status is `due` or `late`" and the
 * maintenance requirements need "status is not `done`". Expressing those as separate requirements
 * would publish `maintenance.due` twice for a `due` task, so the operator belongs on the predicate.
 */
export type LabRequirementPredicateOperator = 'equals' | 'not_equals' | 'in' | 'not_in';

export interface LabRequirementPredicate {
  path: string;
  operator?: LabRequirementPredicateOperator;
  /** Used by `equals` / `not_equals`. */
  equals?: string | number | boolean;
  /** Used by `in` / `not_in`. */
  values?: Array<string | number | boolean>;
}

export interface LabRequirementV1 {
  /**
   * Stable identity for the requirement.
   *
   * The sweep state table is keyed by this, not by `eventType`, so two requirements that publish the
   * same event type over different services do not suppress each other.
   */
  key: string;
  /** The catalog event published when a record qualifies. */
  eventType: string;
  /** Provider app whose connector is read. Also recorded as the envelope's `sourceAppId`. */
  providerAppId: string;
  /** Connector service id, e.g. `home-maintenance.maintenance-tasks`. */
  serviceId: string;
  /** Which date on the connector record the comparison uses. */
  datePath: string;
  /**
   * How to read `datePath`.
   *
   * `date` (default) accepts a date-only string or a timestamp. `year-month` reads a `YYYY-MM`
   * period and resolves it to **the first day of the following month** — the instant the period has
   * definitively elapsed. Rent payments are stored as a period, not a due date, so without this the
   * comparison would have nothing to compare.
   */
  datePathFormat?: 'date' | 'year-month';
  /** `before` = fire ahead of the date; `after` = fire past it. */
  relation: LabRequirementRelation;
  /**
   * `before`: how many days ahead the window opens.
   * `after`: how many days past the date the window opens (0 = on the day itself).
   */
  offsetDays: number;
  /**
   * `after` only: how long the window stays open so a missed tick (stack down, app server
   * restarted) still delivers. Ignored for `before`, whose window closes on the date itself.
   */
  horizonDays?: number;
  /** Optional extra payload fields copied from the record onto the published envelope. */
  payloadPaths?: string[];
  /** The record must also satisfy all of these to qualify. */
  predicates?: LabRequirementPredicate[];
  /** Connector property holding the record id. Defaults to `id`. */
  recordIdPath?: string;
}

/**
 * A requirement that cannot be delivered yet, and why.
 *
 * Kept in the catalog rather than deleted so the gap is visible to the next person instead of
 * rediscovered: the sweep is correct, the *record* simply has no date to compare.
 */
export interface LabRequirementBlockedV1 {
  key: string;
  eventType: string;
  providerAppId: string;
  reason: string;
}

/** One row of sweep state: this requirement has already fired for this record. */
export interface LabRequirementSweepState {
  requirementKey: string;
  recordId: string;
  lastFiredAt: string;
  /**
   * The record date observed when it fired.
   *
   * When a lease is extended the date moves, and comparing this with the current date lets the
   * sweep legitimately re-qualify the record instead of suppressing it forever.
   */
  lastObservedDate: string;
  fireCount: number;
}

/** Health/backoff row for one requirement (33.10). */
export interface LabRequirementSweepHealth {
  requirementKey: string;
  consecutiveFailures: number;
  /** Epoch ms before which the requirement should not be attempted again. */
  nextAttemptAt: number | null;
  lastError: string | null;
  updatedAt: string;
}
