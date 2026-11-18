import { describe, expect, test } from '@jest/globals';
import { timeEntryToConnector } from '@/apps/time-tracking/back-end/utils/time-entry-connector-body';

describe('time-entry connector read', () => {
  test('teamMember is platform user id string for Forms Builder', () => {
    const row = timeEntryToConnector({
      id: 1,
      userId: 4,
      userName: 'Jordan Lee',
      project: 'Lab',
      task: 'Triage',
      date: '2026-10-15',
      minutes: 60,
      billable: true,
      notes: '',
      status: 'draft',
      weekKey: '2026-W42',
      createdAt: '',
    });
    expect(row.teamMember).toBe('4');
    expect(row.userName).toBe('Jordan Lee');
  });
});
