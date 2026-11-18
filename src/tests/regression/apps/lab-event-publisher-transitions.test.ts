import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { isObjectiveComplete } from '@/apps/okr-goals/back-end/objective-progress';
import { isChecklistComplete } from '@/apps/onboarding-checklist/back-end/onboarding-progress';
import { bootstrapRentalTables, RentalRepository } from '@/apps/rental-property/back-end/rental-repository';

/**
 * The publishers that are *not* a straight `status` comparison.
 *
 * Three of the eighteen events could not be read off a single column, and each carries a rule that
 * is easy to get subtly wrong:
 *
 * - `objective.completed` — a roll-up; the objective row has no status.
 * - `onboarding.completed` — inferred from the sibling set, so a batch closes once.
 * - `rent.due` — needed a repository writer that did not exist.
 *
 * These tests pin the rules rather than the routes. The routes are covered by the per-app smoke
 * runs in the phase's verify list; the rules are what regress silently.
 */

describe('objective.completed roll-up', () => {
  test('is complete only when every key result is done', () => {
    expect(isObjectiveComplete([{ status: 'done' }, { status: 'done' }])).toBe(true);
    expect(isObjectiveComplete([{ status: 'done' }, { status: 'on-track' }])).toBe(false);
    expect(isObjectiveComplete([{ status: 'at-risk' }])).toBe(false);
  });

  test('an objective with no key results is not complete', () => {
    // Length 0 satisfies `every()` vacuously; publishing on it would fire for every new objective.
    expect(isObjectiveComplete([])).toBe(false);
  });

  test('the roll-up is silent while the set stays incomplete', () => {
    // Two KRs: marking the first done must not complete the objective.
    const before = [{ status: 'on-track' }, { status: 'on-track' }];
    const after = [{ status: 'done' }, { status: 'on-track' }];
    expect(isObjectiveComplete(before)).toBe(false);
    expect(isObjectiveComplete(after)).toBe(false);
  });
});

describe('onboarding.completed inference', () => {
  test('is complete only when every sibling task is done', () => {
    expect(isChecklistComplete([{ status: 'done' }, { status: 'done' }])).toBe(true);
    expect(isChecklistComplete([{ status: 'done' }, { status: 'doing' }])).toBe(false);
    expect(isChecklistComplete([{ status: 'todo' }])).toBe(false);
  });

  test('an empty checklist is not complete', () => {
    expect(isChecklistComplete([])).toBe(false);
  });

  test('a batch publishes once — every intermediate state is still incomplete', () => {
    // Closing tasks one at a time, as the route does. Only the final step crosses the threshold,
    // which is what keeps the publisher from firing per task.
    const steps = [
      [{ status: 'done' }, { status: 'todo' }, { status: 'todo' }],
      [{ status: 'done' }, { status: 'done' }, { status: 'todo' }],
      [{ status: 'done' }, { status: 'done' }, { status: 'done' }],
    ];
    const completions = steps.filter((step) => isChecklistComplete(step));
    expect(completions).toHaveLength(1);
  });

  test('re-saving an already-complete checklist does not cross the threshold again', () => {
    const complete = [{ status: 'done' }, { status: 'done' }];
    const before = isChecklistComplete(complete);
    const after = isChecklistComplete([...complete]);
    // The publisher publishes on `!before && after`, so a re-save is silent.
    expect(before && after).toBe(true);
    expect(!before && after).toBe(false);
  });
});

describe('rental payment status writer', () => {
  function setup(): { db: Database.Database; repo: RentalRepository; leaseId: number } {
    const db = new Database(':memory:');
    bootstrapRentalTables(db);
    const repo = new RentalRepository(db);
    const property = repo.createProperty({
      name: 'Elm St',
      address: '',
      monthlyRentCents: 180_000,
      status: 'occupied',
      notes: '',
    });
    const lease = repo.addLease({
      propertyId: property.id,
      tenantName: 'A. Tenant',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active',
    });
    return { db, repo, leaseId: lease.id };
  }

  test('sets a payment to due without touching paid_at', () => {
    const { db, repo, leaseId } = setup();
    const payment = repo.addPayment({
      leaseId,
      periodMonth: '2026-11',
      amountCents: 180_000,
      status: 'paid',
    });
    expect(payment.paidAt).not.toBeNull();

    const updated = repo.setPaymentStatus(payment.id, 'due');
    expect(updated?.status).toBe('due');
    // Leaving `paid` must clear `paid_at`, or the column contradicts the status.
    expect(updated?.paidAt).toBeNull();
    db.close();
  });

  test('stamps paid_at when moving to paid', () => {
    const { db, repo, leaseId } = setup();
    const payment = repo.addPayment({
      leaseId,
      periodMonth: '2026-12',
      amountCents: 180_000,
      status: 'due',
    });
    expect(payment.paidAt).toBeNull();

    const updated = repo.setPaymentStatus(payment.id, 'paid');
    expect(updated?.status).toBe('paid');
    expect(updated?.paidAt).not.toBeNull();
    db.close();
  });

  test('accepts late without stamping paid_at', () => {
    const { db, repo, leaseId } = setup();
    const payment = repo.addPayment({
      leaseId,
      periodMonth: '2026-10',
      amountCents: 180_000,
      status: 'due',
    });
    const updated = repo.setPaymentStatus(payment.id, 'late');
    expect(updated?.status).toBe('late');
    expect(updated?.paidAt).toBeNull();
    db.close();
  });

  test('reports a missing payment rather than throwing', () => {
    const { db, repo } = setup();
    expect(repo.setPaymentStatus(9999, 'due')).toBeNull();
    db.close();
  });
});
