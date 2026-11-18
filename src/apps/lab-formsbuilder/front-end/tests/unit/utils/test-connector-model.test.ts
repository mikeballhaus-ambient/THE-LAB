import { describe, test, expect } from '@jest/globals';
import { buildComponentsFromConnector } from '@/apps/lab-formsbuilder/front-end/utils/autopopulate-from-connector';
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types';

/** Fixture lookup sizes: RadioButton when count < 3; Select when count >= 3 (see controlTypeForLookupOptionCount). */
const STATUS_LOOKUP_VALUES = [
  { id: 'active', value: 'active', label: 'Active' },
  { id: 'inactive', value: 'inactive', label: 'Inactive' },
  { id: 'draft', value: 'draft', label: 'Draft' },
];
const CAT_LOOKUP_VALUES = [
  { id: 'a', value: 'a', label: 'A' },
  { id: 'b', value: 'b', label: 'B' },
  { id: 'c', value: 'c', label: 'C' },
  { id: 'd', value: 'd', label: 'D' },
];
const TAG_LOOKUP_VALUES = [
  { id: 'one', value: 'one', label: 'One' },
  { id: 'two', value: 'two', label: 'Two' },
];

/** Mirrors discovery contract field list (one property per canvas control type). */
function sampleConnectorContract(): DataConnector {
  return {
    id: 1,
    appName: 'task-list',
    entityName: 'SampleItem',
    entityModel: {
      properties: [
        { name: 'id', type: 'number' },
        { name: 'title', type: 'string', label: 'Title' },
        { name: 'desc', type: 'string', label: 'Description' },
        { name: 'qty', type: 'number', label: 'Quantity' },
        { name: 'due', type: 'date', label: 'Due date' },
        { name: 'ok', type: 'boolean', label: 'Approved' },
        { name: 'status', type: 'string', label: 'Status' },
        { name: 'cat', type: 'string', label: 'Category' },
        { name: 'tags', type: 'array', label: 'Tags' },
      ],
    },
    endpoints: {
      baseUrl: 'http://localhost:3005',
      crud: {} as DataConnector['endpoints']['crud'],
      lookups: [
        {
          forProperty: 'status',
          endpoint: {
            url: '/api/sample/statuses',
            type: 'GET',
            data: {},
            response: [...STATUS_LOOKUP_VALUES],
          },
        },
        {
          forProperty: 'cat',
          endpoint: {
            url: '/api/sample/cats',
            type: 'GET',
            data: {},
            response: [...CAT_LOOKUP_VALUES],
          },
        },
        {
          forProperty: 'tags',
          endpoint: {
            url: '/api/sample/tags',
            type: 'GET',
            data: {},
            response: [...TAG_LOOKUP_VALUES],
          },
        },
      ],
    },
    capabilities: ['CRUD', 'Lookups'],
    createdAt: '',
    updatedAt: '',
    discoveryUrl: 'http://localhost:3005/',
    discoveryType: 'REST',
    is_active: 1,
  } as unknown as DataConnector;
}

describe('connector entity model autopopulate', () => {
  test('lookup sizes match Select vs RadioButton thresholds', () => {
    expect(STATUS_LOOKUP_VALUES.length).toBe(3);
    expect(CAT_LOOKUP_VALUES.length).toBeGreaterThan(3);
  });

  test('autopopulate maps each model property to the intended control type', () => {
    const counts = new Map<string, number>([
      ['status', STATUS_LOOKUP_VALUES.length],
      ['cat', CAT_LOOKUP_VALUES.length],
      ['tags', TAG_LOOKUP_VALUES.length],
    ]);
    const components = buildComponentsFromConnector(sampleConnectorContract(), [], [], undefined, counts);
    const byKey = Object.fromEntries(components.map(c => [c.fieldKey, c.type]));

    expect(byKey).toEqual({
      title: 'InputText',
      desc: 'Textarea',
      qty: 'NumberInput',
      due: 'DatePicker',
      ok: 'Checkbox',
      status: 'Select',
      cat: 'Select',
      tags: 'MultiSelect',
    });
  });
});
