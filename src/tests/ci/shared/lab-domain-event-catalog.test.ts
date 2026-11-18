import { buildLabDomainEventCatalogResponse, isKnownEventType } from '@/shared/services/lab-domain-event-catalog';
import { LAB_DOMAIN_EVENT_CATALOG, catalogEventTypes } from '@/shared/lab-domain-events/aggregate-domain-event-catalog';
import type { LabDomainEventObservedType } from '@/shared/types/lab-domain-event-catalog';

/**
 * The catalog serves two tiers of event: **live** publishers and **declared** contracts for apps
 * that do not publish yet. These tests pin the distinction, because the failure it prevents —
 * a workflow built on an event nobody emits — is silent at every other layer.
 */

const TASK_CREATED = 'app-lab-tasklist.task.created';
const EXPENSE_APPROVED = 'app-expense-reports.expense.approved';

function observed(eventType: string, sourceAppId: string): LabDomainEventObservedType {
  return {
    eventType,
    sourceAppId,
    lastSeenAt: '2026-01-01T00:00:00.000Z',
    publishCount: 1,
  };
}

describe('lab-domain-event-catalog', () => {
  test('includes static entries and merges observed-only types', () => {
    const response = buildLabDomainEventCatalogResponse(
      [observed('app-custom.demo.pinged', 'app-custom')],
      LAB_DOMAIN_EVENT_CATALOG,
    );

    expect(response.schemaVersion).toBe(1);
    expect(response.entries.length).toBe(LAB_DOMAIN_EVENT_CATALOG.length + 1);
    expect(response.observedOnly).toHaveLength(1);
    expect(response.observedOnly[0].eventType).toBe('app-custom.demo.pinged');
    expect(response.entries.some((e) => e.eventType === TASK_CREATED)).toBe(true);
  });

  test('flags a declared event that has never fired', () => {
    const response = buildLabDomainEventCatalogResponse([], LAB_DOMAIN_EVENT_CATALOG);
    const entry = response.entries.find((e) => e.eventType === EXPENSE_APPROVED);

    expect(entry).toBeDefined();
    // Declared intent, not a live publisher — the picker must be able to say so.
    expect(entry?.neverFired).toBe(true);
  });

  test('clears the flag once the event has been observed', () => {
    const response = buildLabDomainEventCatalogResponse(
      [observed(EXPENSE_APPROVED, 'app-expense-reports')],
      LAB_DOMAIN_EVENT_CATALOG,
    );
    const entry = response.entries.find((e) => e.eventType === EXPENSE_APPROVED);

    expect(entry?.neverFired).toBe(false);
  });

  test('an observed type is never flagged, even though it is undocumented', () => {
    const response = buildLabDomainEventCatalogResponse(
      [observed('app-custom.demo.pinged', 'app-custom')],
      LAB_DOMAIN_EVENT_CATALOG,
    );
    const entry = response.entries.find((e) => e.eventType === 'app-custom.demo.pinged');

    // It exists in the log, so it demonstrably fires. Flagging it would be a lie.
    expect(entry?.neverFired).toBe(false);
  });

  test('declares the documented event vocabulary of the catalog apps', () => {
    const types = new Set(catalogEventTypes());

    // Spot-checks from APP-INTEROPERABILITY-MATRIX §2. Every one of these has a publisher — that
    // invariant is checked by lab-domain-event-publishers.test.ts.
    for (const eventType of [
      'app-okr-goals.key-result.at_risk',
      'app-project-charter.charter.approved',
      'app-time-tracking.timesheet.submitted',
      'app-job-applicant-tracker.applicant.hired',
      'app-onboarding-checklist.onboarding.completed',
      'app-training-quizzes.quiz.passed',
      'app-suggestion-box.suggestion.promoted',
      'app-knowledge-base.article.published',
      'app-knowledge-base.article.content_updated',
      'app-knowledge-base.article.index_removed',
      'app-rental-property.rent.due',
      'app-event-rsvp.rsvp-response.received',
      'app-polls-surveys.poll.published',
      'app-polls-surveys.poll.closed',
      'app-travel-itinerary.trip.scheduled',
    ]) {
      expect(types.has(eventType)).toBe(true);
    }
  });

  test('lists the time-derived events the sweep delivers, as platform publishers', () => {
    const byType = new Map(LAB_DOMAIN_EVENT_CATALOG.map((entry) => [entry.eventType, entry]));

    // "Due"/"late"/"expiring" are date comparisons, so no route can publish them. They are catalogued
    // as `platform` because the requirement sweep is their publisher — the author still picks them
    // from the picker, which is the whole point.
    for (const eventType of [
      'app-home-maintenance.maintenance.due',
      'app-home-maintenance.maintenance.overdue',
      'app-rental-property.rent.late',
      'app-rental-property.lease.expiring',
      'app-knowledge-base.article.review_due',
      'app-onboarding-checklist.task.overdue',
      'app-training-quizzes.cert.expiring',
    ]) {
      expect(byType.get(eventType)?.publisherKind).toBe('platform');
    }
  });

  test('every declared event type is well-formed and its source app matches the prefix', () => {
    for (const entry of LAB_DOMAIN_EVENT_CATALOG) {
      // A typo here is the exact mistake the catalog exists to catch, so assert the shape.
      expect(entry.eventType.startsWith(`${entry.sourceAppId}.`)).toBe(true);
      expect(entry.eventType.split('.').length).toBeGreaterThanOrEqual(3);
      expect(entry.label.trim()).not.toBe('');
      expect(entry.description.trim()).not.toBe('');
    }
  });
});

describe('isKnownEventType', () => {
  test('known when documented, even with no observations', () => {
    expect(isKnownEventType(EXPENSE_APPROVED, [], LAB_DOMAIN_EVENT_CATALOG)).toBe(true);
  });

  test('known when observed but undocumented', () => {
    expect(
      isKnownEventType(
        'app-custom.demo.pinged',
        [observed('app-custom.demo.pinged', 'app-custom')],
        [],
      ),
    ).toBe(true);
  });

  test('unknown for a typo in either half of the type', () => {
    expect(isKnownEventType('app-lab-tasklist.task.creatd', [], LAB_DOMAIN_EVENT_CATALOG)).toBe(false);
    expect(isKnownEventType('', [], LAB_DOMAIN_EVENT_CATALOG)).toBe(false);
  });
});
