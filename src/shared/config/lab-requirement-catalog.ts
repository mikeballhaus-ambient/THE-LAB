import { buildLabEventType } from '@/shared/types/lab-domain-event';
import type {
  LabRequirementBlockedV1,
  LabRequirementV1,
} from '@/shared/types/lab-requirement';

/**
 * Declarative time-derived requirements — the entries the requirement sweep delivers.
 *
 * ## Why these are requirements rather than app publishers
 *
 * Each entry below describes **the passage of time**, not a state change. `maintenance.due` is not
 * something a route does; it is what becomes true when `dueDate` passes. An app cannot publish it
 * without running its own clock, and a timer per app process is exactly the anti-pattern the single
 * platform tick exists to avoid. **Do not "fix" a missing event here by adding a publisher to the
 * app** — the app has no moment at which to publish.
 *
 * The platform is the publisher. Each qualifying record produces an ordinary domain event through
 * the normal publish pipeline, so workflows, rules, notifications and run history behave exactly as
 * they do for an app-published event.
 *
 * ## Where the service ids and date fields come from
 *
 * `providerAppId` and `serviceId` come from
 * [`catalog-manifests.ts`](../lab-integrations/catalog-manifests.ts) — `serviceId` is
 * `{host slug}.{connectorSegment}`, and `datePath` / `payloadPaths` are the **connector property
 * names** that `toConnector()` emits. When an app adds a service or renames a projection field,
 * this file is the thing that must be updated with it.
 *
 * ## Comparison rules the sweep applies (documented once here so a reader does not have to infer)
 *
 * - A date-only value (`2026-11-01`) and a full timestamp (`2026-11-01T16:00:00Z`) are both
 *   reduced to a **calendar date**, and compared with **today in UTC**. Zone-shifting a date-only
 *   value would make the same record qualify on different days in different deployments, so the
 *   platform picks one zone and states it rather than deriving one per record.
 * - `before` opens a window `offsetDays` ahead of the date and closes **on** the date.
 * - `after` opens a window `offsetDays` past the date and stays open for `horizonDays`.
 * - A record fires **once when it enters the window**, not once per tick inside it. That is the
 *   difference between one reminder and thirty.
 */

/** `app-home-maintenance.maintenance.due` */
const MAINTENANCE_DUE_TYPE = buildLabEventType('app-home-maintenance', 'maintenance', 'due');
/** `app-home-maintenance.maintenance.overdue` */
const MAINTENANCE_OVERDUE_TYPE = buildLabEventType(
  'app-home-maintenance',
  'maintenance',
  'overdue',
);
/** `app-rental-property.rent.late` */
const RENT_LATE_TYPE = buildLabEventType('app-rental-property', 'rent', 'late');
/** `app-rental-property.lease.expiring` */
const LEASE_EXPIRING_TYPE = buildLabEventType('app-rental-property', 'lease', 'expiring');
/** `app-knowledge-base.article.review_due` */
const ARTICLE_REVIEW_DUE_TYPE = buildLabEventType('app-knowledge-base', 'article', 'review_due');
/** `app-onboarding-checklist.task.overdue` */
const ONBOARDING_TASK_OVERDUE_TYPE = buildLabEventType(
  'app-onboarding-checklist',
  'task',
  'overdue',
);
/** `app-training-quizzes.cert.expiring` */
const CERT_EXPIRING_TYPE = buildLabEventType('app-training-quizzes', 'cert', 'expiring');

/**
 * Requirements the sweep delivers today.
 *
 * A `predicate` is not decoration: without one, `maintenance.due` fires for a task already marked
 * `done`, and `lease.expiring` fires for a lease that already ended.
 */
export const LAB_REQUIREMENT_CATALOG: readonly LabRequirementV1[] = [
  {
    key: 'home-maintenance.due',
    eventType: MAINTENANCE_DUE_TYPE,
    providerAppId: 'app-home-maintenance',
    serviceId: 'home-maintenance.maintenance-tasks',
    datePath: 'dueDate',
    relation: 'after',
    offsetDays: 0,
    // A day of catch-up: the stack is allowed to be down on the due date without losing the event.
    horizonDays: 1,
    payloadPaths: ['title', 'priority', 'assetId'],
    recordIdPath: 'id',
    predicates: [
      // `done` and `skipped` are finished work; a reminder about them would be noise.
      { path: 'status', operator: 'not_in', values: ['done', 'skipped'] },
    ],
  },
  {
    key: 'home-maintenance.overdue',
    eventType: MAINTENANCE_OVERDUE_TYPE,
    providerAppId: 'app-home-maintenance',
    serviceId: 'home-maintenance.maintenance-tasks',
    datePath: 'dueDate',
    relation: 'after',
    // Starts one day past the date, so `due` and `overdue` are distinguishable events rather than
    // two names for the same instant.
    offsetDays: 1,
    horizonDays: 7,
    payloadPaths: ['title', 'priority', 'assetId'],
    recordIdPath: 'id',
    predicates: [{ path: 'status', operator: 'not_in', values: ['done', 'skipped'] }],
  },
  {
    key: 'rental-property.rent-late',
    eventType: RENT_LATE_TYPE,
    providerAppId: 'app-rental-property',
    serviceId: 'rental-property.rent-payments',
    // There is no due-date column: a payment covers a month and is due by the end of it. The
    // `year-month` format resolves `2026-10` to the **first day of the following month**, which is
    // when the period has definitively elapsed.
    datePath: 'periodMonth',
    datePathFormat: 'year-month',
    relation: 'after',
    offsetDays: 0,
    horizonDays: 7,
    payloadPaths: ['leaseId', 'amountCents', 'periodMonth'],
    recordIdPath: 'id',
    predicates: [{ path: 'status', operator: 'not_in', values: ['paid'] }],
  },
  {
    key: 'rental-property.lease-expiring',
    eventType: LEASE_EXPIRING_TYPE,
    providerAppId: 'app-rental-property',
    serviceId: 'rental-property.leases',
    datePath: 'endDate',
    relation: 'before',
    offsetDays: 30,
    payloadPaths: ['propertyId', 'tenantName', 'startDate', 'endDate'],
    recordIdPath: 'id',
    // An `ended` or `pending` lease is not an expiring one. This is the predicate the phase's
    // verify list names explicitly.
    predicates: [{ path: 'status', operator: 'equals', equals: 'active' }],
  },
  {
    key: 'knowledge-base.article-review-due',
    eventType: ARTICLE_REVIEW_DUE_TYPE,
    providerAppId: 'app-knowledge-base',
    serviceId: 'knowledge-base.articles',
    // Articles have no review-date column; `updatedAt` is the best available proxy for "last
    // looked at", and a re-save legitimately resets the clock.
    datePath: 'updatedAt',
    relation: 'after',
    offsetDays: 180,
    horizonDays: 14,
    payloadPaths: ['title', 'category', 'status', 'author'],
    recordIdPath: 'id',
    // A draft was never published, so it cannot be stale published documentation.
    predicates: [{ path: 'status', operator: 'equals', equals: 'published' }],
  },
  {
    key: 'onboarding-checklist.task-overdue',
    eventType: ONBOARDING_TASK_OVERDUE_TYPE,
    providerAppId: 'app-onboarding-checklist',
    serviceId: 'onboarding-checklist.onboarding-tasks',
    datePath: 'dueDate',
    relation: 'after',
    offsetDays: 1,
    horizonDays: 14,
    payloadPaths: ['title', 'owner', 'checklistId', 'status'],
    recordIdPath: 'id',
    predicates: [{ path: 'status', operator: 'not_in', values: ['done'] }],
  },
  {
    key: 'training-quizzes.cert-expiring',
    eventType: CERT_EXPIRING_TYPE,
    providerAppId: 'app-training-quizzes',
    serviceId: 'training-quizzes.certifications',
    datePath: 'expiresAt',
    relation: 'before',
    offsetDays: 30,
    payloadPaths: ['title', 'learner', 'quizId'],
    recordIdPath: 'id',
    predicates: [{ path: 'status', operator: 'equals', equals: 'active' }],
  },
];

/**
 * Declared events the sweep cannot deliver yet, and the exact reason.
 *
 * Empty when every time-derived catalog event has a date field on its provider records. Entries here
 * are **not** in the per-app domain event manifests (see `docs/platform/lab-domain-events.md`).
 */
export const LAB_REQUIREMENT_BLOCKED: readonly LabRequirementBlockedV1[] = [];

/** Requirements by key, for the sweep's state lookups. */
export const LAB_REQUIREMENTS_BY_KEY: Readonly<Record<string, LabRequirementV1>> =
  Object.fromEntries(LAB_REQUIREMENT_CATALOG.map((row) => [row.key, row]));
