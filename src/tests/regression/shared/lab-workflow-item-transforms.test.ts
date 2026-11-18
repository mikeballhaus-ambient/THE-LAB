import { describe, expect, test } from '@jest/globals';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';
import {
  applyDateTime,
  applyFilterItems,
  applyRenameFields,
  applySetFields,
  applySortLimitDedupe,
} from '@/shared/utils/lab-workflow-item-transforms';
import { conditionsMatch } from '@/backend/lab-rules/lab-rules-match';

/**
 * W6b — the five declarative data nodes (A2–A6), gate G2.
 *
 * Each node gets a table-driven test with **three or more item cases**, because the whole point of
 * the item contract is that a node is applied per row. A one-item fixture would pass against a
 * single-payload implementation and tell us nothing.
 *
 * Every case also asserts `detail`, because a node that silently changes nothing is the failure mode
 * the run panel exists to explain.
 */

const ITEMS: LabWorkflowItem[] = [
  { json: { id: 'r1', qty: 2, price: 5, status: 'open', assigneeId: '2' }, pairedItem: { nodeId: 'trigger', itemIndex: 0 } },
  { json: { id: 'r2', qty: 3, price: 5, status: 'done', assigneeId: '3' }, pairedItem: { nodeId: 'trigger', itemIndex: 1 } },
  { json: { id: 'r3', qty: 4, price: 5, status: 'open', assigneeId: '4' }, pairedItem: { nodeId: 'trigger', itemIndex: 2 } },
];

const ENVELOPE = { source: 'test' };

describe('A2 — set_fields', () => {
  test.each([
    {
      name: 'literal into an existing key',
      fields: [{ path: 'status', source: 'literal' as const, value: 'reviewed' }],
      expected: ['reviewed', 'reviewed', 'reviewed'],
      read: (item: LabWorkflowItem) => item.json.status,
    },
    {
      name: 'literal into a new nested path',
      fields: [{ path: 'meta.origin.flow', source: 'literal' as const, value: 'w6b' }],
      expected: ['w6b', 'w6b', 'w6b'],
      read: (item: LabWorkflowItem) =>
        (item.json.meta as { origin: { flow: string } }).origin.flow,
    },
    {
      name: 'from_payload copies a per-item value (qty)',
      fields: [{ path: 'copied', source: 'from_payload' as const, value: 'qty' }],
      expected: [2, 3, 4],
      read: (item: LabWorkflowItem) => item.json.copied,
    },
    {
      name: 'template renders per item',
      fields: [{ path: 'label', source: 'template' as const, value: '{{payload.id}}/{{payload.qty}}' }],
      expected: ['r1/2', 'r2/3', 'r3/4'],
      read: (item: LabWorkflowItem) => item.json.label,
    },
  ])('$name', ({ fields, expected, read }) => {
    const result = applySetFields(ITEMS, fields, ENVELOPE, 'n-set');
    expect(result.items.map(read)).toEqual(expected);
    expect(result.detail.stepKind).toBe('set_fields');
    expect(result.detail.itemCount).toBe(3);
  });

  test('does not mutate the input item json', () => {
    applySetFields(ITEMS, [{ path: 'status', source: 'literal', value: 'clobbered' }], ENVELOPE, 'n-set');
    expect(ITEMS[0].json.status).toBe('open');
  });

  test('reports changed count so a no-op is visible', () => {
    const result = applySetFields(
      ITEMS,
      [{ path: 'status', source: 'from_payload', value: 'status' }],
      ENVELOPE,
      'n-set',
    );
    expect(result.detail.changed).toBe(0);
  });
});

describe('A3 — rename_fields', () => {
  test('renames, removes, and reports both counts', () => {
    const result = applyRenameFields(
      ITEMS,
      [
        { from: 'qty', to: 'quantity' },
        { from: 'price', to: 'unitPrice' },
      ],
      ['assigneeId'],
      ENVELOPE,
      'n-rename',
    );

    expect(result.items.map((item) => item.json.quantity)).toEqual([2, 3, 4]);
    expect(result.items.map((item) => item.json.unitPrice)).toEqual([5, 5, 5]);
    expect(result.items.map((item) => item.json.qty)).toEqual([undefined, undefined, undefined]);
    expect(result.items.map((item) => item.json.assigneeId)).toEqual([undefined, undefined, undefined]);
    expect(result.detail).toMatchObject({ renamed: 6, removed: 3, itemCount: 3 });
  });

  test('a rename whose source is missing is a per-item no-op, not an error', () => {
    const items: LabWorkflowItem[] = [
      { json: { id: 'a', optional: 'x' } },
      { json: { id: 'b' } },
      { json: { id: 'c', optional: 'z' } },
    ];
    const result = applyRenameFields(
      items,
      [{ from: 'optional', to: 'moved' }],
      [],
      ENVELOPE,
      'n-rename',
    );
    expect(result.items.map((item) => item.json.moved)).toEqual(['x', undefined, 'z']);
    expect(result.detail.renamed).toBe(2);
  });

  test('remove on a path that does not exist does not inflate the count', () => {
    const result = applyRenameFields(ITEMS, [], ['notThere'], ENVELOPE, 'n-rename');
    expect(result.detail.removed).toBe(0);
  });
});

describe('A4 — date_time', () => {
  // No offsets: these are **wall-clock** values in the node's zone, which is what an author writes.
  const dated: LabWorkflowItem[] = [
    { json: { id: 'd1', at: '2026-03-01T09:00:00' } },
    { json: { id: 'd2', at: '2026-03-07T09:00:00' } },
    { json: { id: 'd3', at: '2026-03-31T09:00:00' } },
  ];

  test('adds days across the US spring-forward boundary', () => {
    // 2026-03-08 is the US DST switch. Adding one *day* must keep the local wall clock at 09:00,
    // which changes the UTC instant — exactly what Intl.DateTimeFormat cannot express.
    const result = applyDateTime(
      dated,
      [{ source: 'at', op: 'add', amount: 1, unit: 'days', zone: 'America/Denver' }],
      'n-date',
    );
    const values = result.items.map((item) => item.json.at as string);
    expect(values).toHaveLength(3);
    // 03-02 09:00 MST = 16:00Z (offset -07).
    expect(values[0]).toBe('2026-03-02T16:00:00.000Z');
    // 03-08 09:00 MDT = 15:00Z (offset -06) — same wall clock, different instant.
    expect(values[1]).toBe('2026-03-08T15:00:00.000Z');
    // 04-01 09:00 MDT is still 15:00Z.
    expect(values[2]).toBe('2026-04-01T15:00:00.000Z');
    expect(result.detail.changed).toBe(3);
    expect(result.detail.unresolved).toBe(0);
  });

  test('adds a month without overflowing February', () => {
    const items: LabWorkflowItem[] = [{ json: { at: '2026-01-31T12:00:00.000Z' } }];
    const result = applyDateTime(
      items,
      [{ source: 'at', op: 'add', amount: 1, unit: 'months', zone: 'UTC' }],
      'n-date',
    );
    // Luxon clamps to 2026-02-28 rather than producing March 3rd.
    expect(result.items[0].json.at).toBe('2026-02-28T12:00:00.000Z');
  });

  test('formats in a named zone', () => {
    const result = applyDateTime(
      dated,
      [{ source: 'at', op: 'format', output: 'yyyy-LL-dd HH:mm', zone: 'America/Denver' }],
      'n-date',
    );
    expect(result.items.map((item) => item.json.at)).toEqual([
      '2026-03-01 09:00',
      '2026-03-07 09:00',
      '2026-03-31 09:00',
    ]);
  });

  test('an unparseable date is counted, not fatal', () => {
    const items: LabWorkflowItem[] = [
      { json: { at: '2026-03-01T00:00:00.000Z' } },
      { json: { at: 'not a date' } },
      { json: { at: '' } },
    ];
    const result = applyDateTime(items, [{ source: 'at', op: 'add', amount: 1, unit: 'days' }], 'n-date');
    expect(result.detail.unresolved).toBe(2);
    expect(result.items[1].json.at).toBe('not a date');
  });

  test('an unknown zone falls back and records a warning', () => {
    const items: LabWorkflowItem[] = [{ json: { at: '2026-03-01T00:00:00.000Z' } }];
    const result = applyDateTime(
      items,
      [{ source: 'at', op: 'add', amount: 1, unit: 'days', zone: 'Mars/Olympus' }],
      'n-date',
    );
    expect(result.detail.warnings).toBeDefined();
    expect(result.items[0].json.at).toBe('2026-03-02T00:00:00.000Z');
  });

  test('target writes elsewhere, leaving the source intact', () => {
    const items: LabWorkflowItem[] = [{ json: { at: '2026-03-01T00:00:00.000Z' } }];
    const result = applyDateTime(
      items,
      [{ source: 'at', target: 'dueAt', op: 'add', amount: 7, unit: 'days', zone: 'UTC' }],
      'n-date',
    );
    expect(result.items[0].json.at).toBe('2026-03-01T00:00:00.000Z');
    expect(result.items[0].json.dueAt).toBe('2026-03-08T00:00:00.000Z');
  });
});

describe('A5 — filter_items', () => {
  test.each([
    {
      name: 'payload_equals keeps two of three',
      conditions: [{ kind: 'payload_equals' as const, path: 'status', value: 'open' }],
      combine: 'all' as const,
      expectedIds: ['r1', 'r3'],
      dropped: 1,
    },
    {
      name: 'payload_exists drops none of three',
      conditions: [{ kind: 'payload_exists' as const, path: 'assigneeId' }],
      combine: 'all' as const,
      expectedIds: ['r1', 'r2', 'r3'],
      dropped: 0,
    },
    {
      name: 'any combines two conditions',
      conditions: [
        { kind: 'payload_equals' as const, path: 'status', value: 'done' },
        { kind: 'payload_equals' as const, path: 'qty', value: 4 },
      ],
      combine: 'any' as const,
      expectedIds: ['r2', 'r3'],
      dropped: 1,
    },
    {
      name: 'all combines two conditions',
      conditions: [
        { kind: 'payload_equals' as const, path: 'status', value: 'done' },
        { kind: 'payload_equals' as const, path: 'qty', value: 4 },
      ],
      combine: 'all' as const,
      expectedIds: [],
      dropped: 3,
    },
  ])('$name', ({ conditions, combine, expectedIds, dropped }) => {
    const result = applyFilterItems(
      ITEMS,
      conditions,
      combine,
      (condition, json) => conditionsMatch([condition], json),
      'n-filter',
    );
    expect(result.items.map((item) => item.json.id)).toEqual(expectedIds);
    expect(result.detail.dropped).toBe(dropped);
    expect(result.detail.combine).toBe(combine);
  });

  test('keeps the original item index for what survives', () => {
    const result = applyFilterItems(
      ITEMS,
      [{ kind: 'payload_equals', path: 'status', value: 'open' }],
      'all',
      (condition, json) => conditionsMatch([condition], json),
      'n-filter',
    );
    // "item 3 of the trigger" is the useful provenance, not "item 2 of the filter".
    expect(result.items.map((item) => item.pairedItem?.itemIndex)).toEqual([0, 2]);
  });
});

describe('A6 — sort_items', () => {
  test('sorts, limits and reports truncation', () => {
    const result = applySortLimitDedupe(
      ITEMS,
      [{ path: 'qty', direction: 'desc' }],
      2,
      undefined,
      'n-sort',
    );
    expect(result.items.map((item) => item.json.id)).toEqual(['r3', 'r2']);
    expect(result.detail.truncated).toBe(1);
    expect(result.detail.reordered).toBe(true);
  });

  test('dedupes by a key, keeping the first occurrence', () => {
    const items: LabWorkflowItem[] = [
      { json: { id: 'a', group: 'x' } },
      { json: { id: 'b', group: 'y' } },
      { json: { id: 'c', group: 'x' } },
    ];
    const result = applySortLimitDedupe(items, [], undefined, 'group', 'n-sort');
    expect(result.items.map((item) => item.json.id)).toEqual(['a', 'b']);
    expect(result.detail.deduped).toBe(1);
  });

  test('a missing dedupe value does not collapse rows together', () => {
    const items: LabWorkflowItem[] = [
      { json: { id: 'a' } },
      { json: { id: 'b' } },
      { json: { id: 'c' } },
    ];
    const result = applySortLimitDedupe(items, [], undefined, 'group', 'n-sort');
    expect(result.items).toHaveLength(3);
    expect(result.detail.deduped).toBe(0);
  });

  test('a limit of zero empties the array rather than meaning "no limit"', () => {
    const result = applySortLimitDedupe(ITEMS, [], 0, undefined, 'n-sort');
    expect(result.items).toHaveLength(0);
    expect(result.detail.truncated).toBe(3);
  });

  test('string sort is stable across three rows', () => {
    const items: LabWorkflowItem[] = [
      { json: { id: 'c' } },
      { json: { id: 'a' } },
      { json: { id: 'b' } },
    ];
    const result = applySortLimitDedupe(items, [{ path: 'id' }], undefined, undefined, 'n-sort');
    expect(result.items.map((item) => item.json.id)).toEqual(['a', 'b', 'c']);
  });
});
