import { describe, expect, test } from '@jest/globals';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';

/**
 * Gate G2, schema half: every data node (A2–A6) must accept a realistic definition and reject the
 * shapes that would make the runtime guess.
 *
 * The rejection cases matter as much as the acceptance ones. Each is a mistake an author can
 * plausibly make — an empty assignment list, an app-lookup condition in a per-item filter — and each
 * would otherwise reach a stored workflow and fail at run time with a message nobody can act on.
 */

const valid = [
  {
    name: 'set_fields with all three sources',
    step: {
      kind: 'set_fields',
      fields: [
        { path: 'total', source: 'literal', value: 42 },
        { path: 'copied', source: 'from_payload', value: 'qty' },
        { path: 'label', source: 'template', value: '{{payload.id}}' },
      ],
    },
  },
  {
    name: 'rename_fields with renames and removals',
    step: {
      kind: 'rename_fields',
      renames: [{ from: 'qty', to: 'quantity' }],
      remove: ['tmp'],
    },
  },
  {
    name: 'date_time add/subtract/format',
    step: {
      kind: 'date_time',
      operations: [
        { source: 'createdAt', op: 'add', amount: 2, unit: 'days', zone: 'America/Denver' },
        { source: 'dueAt', op: 'subtract', amount: 1, unit: 'hours' },
        { source: 'dueAt', target: 'dueLabel', op: 'format', output: 'yyyy-LL-dd' },
      ],
    },
  },
  {
    name: 'filter_items with payload conditions',
    step: {
      kind: 'filter_items',
      conditions: [
        { kind: 'payload_equals', path: 'status', value: 'open' },
        { kind: 'payload_exists', path: 'assigneeId' },
      ],
      combine: 'any',
    },
  },
  {
    name: 'sort_items with sort, limit and dedupe',
    step: {
      kind: 'sort_items',
      sort: [{ path: 'createdAt', direction: 'desc' }],
      limit: 25,
      dedupeBy: 'email',
    },
  },
];

describe('data-node step schema (W6b, gate G2)', () => {
  test.each(valid)('accepts $name', ({ step }) => {
    const parsed = LabWorkflowStepSchema.safeParse(step);
    expect(parsed.success).toBe(true);
  });

  test.each([
    {
      name: 'set_fields with no assignments',
      step: { kind: 'set_fields', fields: [] },
    },
    {
      name: 'set_fields with an unknown source',
      step: { kind: 'set_fields', fields: [{ path: 'a', source: 'expression', value: 1 }] },
    },
    {
      name: 'filter_items with an app-lookup condition',
      step: {
        kind: 'filter_items',
        conditions: [
          {
            kind: 'lookup_field_equals',
            providerAppId: 'app-lab-crm',
            serviceId: 'records',
            recordIdPath: 'id',
            field: 'status',
            value: 'open',
          },
        ],
      },
    },
    {
      name: 'filter_items with no conditions',
      step: { kind: 'filter_items', conditions: [] },
    },
    {
      name: 'date_time with an unknown operation',
      step: { kind: 'date_time', operations: [{ source: 'at', op: 'round' }] },
    },
    {
      name: 'sort_items with a negative limit',
      step: { kind: 'sort_items', limit: -5 },
    },
    {
      name: 'rename_fields with an empty path',
      step: { kind: 'rename_fields', renames: [{ from: '', to: 'x' }] },
    },
  ])('rejects $name', ({ step }) => {
    const parsed = LabWorkflowStepSchema.safeParse(step);
    expect(parsed.success).toBe(false);
  });

  test('a stored workflow with only existing node kinds still parses', () => {
    // Additive by default: the eight pre-existing kinds must not be affected by the new union arms.
    const legacy = [
      { kind: 'notify_users', userIds: [1] },
      { kind: 'notify_users', userIds: [], path: 'assigneeId' },
      { kind: 'publish_event', type: 'x.y', sourceAppId: 'app' },
      { kind: 'comms_system_dm_payload_user', path: 'assigneeId' },
      {
        kind: 'integration_create',
        providerAppId: 'app-lab-crm',
        serviceId: 'records',
      },
      {
        kind: 'integration_update',
        providerAppId: 'app-lab-crm',
        serviceId: 'records',
        recordIdPath: 'id',
      },
      { kind: 'rule_ref', ruleId: '11111111-1111-4111-8111-111111111111' },
    ];
    for (const step of legacy) {
      expect(LabWorkflowStepSchema.safeParse(step).success).toBe(true);
    }
  });
});
