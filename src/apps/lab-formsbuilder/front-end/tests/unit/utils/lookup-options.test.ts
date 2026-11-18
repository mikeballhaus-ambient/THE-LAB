import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  mapLookupResponseToOptions,
  hydrateFormComponentsWithLookups,
  hydrateComponentWithLookupOptions,
} from '@/apps/lab-formsbuilder/front-end/utils/lookup-options';
import type { DataConnector, FormComponent } from '@/apps/lab-formsbuilder/shared/types';

describe('mapLookupResponseToOptions', () => {
  test('maps value/label rows', () => {
    expect(
      mapLookupResponseToOptions([
        { id: 1, value: 'active', label: 'Active' },
        { id: 2, value: 'inactive', label: 'Inactive' },
      ]),
    ).toEqual([
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]);
  });

  test('falls back to id when value missing', () => {
    expect(mapLookupResponseToOptions([{ id: 'general', label: 'General' }])).toEqual([
      { value: 'general', label: 'General' },
    ]);
  });

  test('returns empty for unrecognized object', () => {
    expect(mapLookupResponseToOptions({})).toEqual([]);
  });

  test('unwraps platform envelope { success, data }', () => {
    expect(
      mapLookupResponseToOptions({
        success: true,
        data: [
          { value: 2, label: 'Demo User' },
          { value: 3, label: 'Another User' },
        ],
      }),
    ).toEqual([
      { value: '2', label: 'Demo User' },
      { value: '3', label: 'Another User' },
    ]);
  });
});

describe('hydrateFormComponentsWithLookups', () => {
  const connector: DataConnector = {
    id: 1,
    appName: 'test-connector',
    entityName: 'Item',
    entityModel: { properties: [] } as unknown as DataConnector['entityModel'],
    endpoints: {
      baseUrl: 'http://localhost:3020',
      crud: {} as DataConnector['endpoints']['crud'],
      lookups: [
        {
          forProperty: 'status',
          endpoint: {
            url: '/api/test-items/statuses',
            type: 'GET',
            data: {},
            response: [],
          },
        },
      ],
    },
    capabilities: ['Lookups'],
    createdAt: '',
    updatedAt: '',
    discoveryUrl: 'http://localhost:3020/discovery',
    discoveryType: 'REST',
    is_active: 1,
  };

  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => [{ value: 'active', label: 'Active' }],
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fetches and stores options on Select fields with matching field key', async () => {
    const components: FormComponent[] = [
      { fieldKey: 'status', label: 'Status', type: 'Select', row: 0, col: 0 },
    ];

    const result = await hydrateFormComponentsWithLookups(components, connector);

    expect(result.hydratedCount).toBe(1);
    expect(result.components[0]?.options).toEqual([{ value: 'active', label: 'Active' }]);
    expect(result.components[0]?.dataFetch?.forProperty).toBe('status');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3020/api/test-items/statuses',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  test('skips fetch for non-option control types', async () => {
    const components: FormComponent[] = [
      { fieldKey: 'status', label: 'Status', type: 'InputText', row: 0, col: 0 },
    ];

    const result = await hydrateFormComponentsWithLookups(components, connector);

    expect(result.hydratedCount).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.components[0]?.dataFetch?.forProperty).toBe('status');
  });
});

describe('hydrateComponentWithLookupOptions', () => {
  const connector: DataConnector = {
    id: 1,
    appName: 'test-connector',
    entityName: 'Item',
    entityModel: { properties: [] } as unknown as DataConnector['entityModel'],
    endpoints: {
      baseUrl: 'http://localhost:3020',
      crud: {} as DataConnector['endpoints']['crud'],
      lookups: [
        {
          forProperty: 'cat',
          endpoint: {
            url: '/api/test-items/categories',
            type: 'GET',
            data: {},
            response: [],
          },
        },
      ],
    },
    capabilities: ['Lookups'],
    createdAt: '',
    updatedAt: '',
    discoveryUrl: 'http://localhost:3020/discovery',
    discoveryType: 'REST',
    is_active: 1,
  };

  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => [{ value: 'general', label: 'General' }],
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('hydrates Select with explicit dataFetch after model wiring', async () => {
    const component: FormComponent = {
      fieldKey: 'cat',
      label: 'Category',
      type: 'Select',
      row: 0,
      col: 0,
      dataFetch: {
        forProperty: 'cat',
        endpoint: connector.endpoints!.lookups![0].endpoint,
      },
    };

    const hydrated = await hydrateComponentWithLookupOptions(component, connector);

    expect(hydrated.options).toEqual([{ value: 'general', label: 'General' }]);
    expect(hydrated.dataFetch?.forProperty).toBe('cat');
  });
});
