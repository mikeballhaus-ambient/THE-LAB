import { describe, test, expect } from '@jest/globals';
import {
  countOpenQueue,
  countTicketsByStatus,
  ticketPriorityCounts,
  ticketStatusCounts,
} from '@/apps/lab-helpdesk/shared/utils/dashboard-aggregates';

describe('help-desk dashboard-aggregates', () => {
  const sample = [
    { status: 'new', priority: 'low' },
    { status: 'open', priority: 'urgent' },
    { status: 'pending', priority: 'high' },
    { status: 'resolved', priority: 'medium' },
    { status: 'closed', priority: 'low' },
  ];

  test('ticketStatusCounts preserves workflow order', () => {
    const segments = ticketStatusCounts(sample);
    expect(segments.map(s => s.key)).toEqual(['new', 'open', 'pending', 'resolved', 'closed']);
    expect(segments.every(s => s.value === 1)).toBe(true);
  });

  test('countOpenQueue includes new, open, pending', () => {
    expect(countOpenQueue(sample)).toBe(3);
  });

  test('countTicketsByStatus', () => {
    expect(countTicketsByStatus(sample, 'resolved')).toBe(1);
  });

  test('ticketPriorityCounts sorts by count desc', () => {
    const withDup = [...sample, { status: 'open', priority: 'low' }];
    const segments = ticketPriorityCounts(withDup);
    expect(segments[0].key).toBe('low');
    expect(segments[0].value).toBe(3);
  });
});
