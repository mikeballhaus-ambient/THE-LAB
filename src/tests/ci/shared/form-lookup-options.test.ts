import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  mapLookupResponseToOptions,
  hydrateFormRuntimeLookups,
  lookupFetchInit,
} from '@/shared/forms/form-lookup-options';
import type { FormLookupConnector } from '@/shared/forms/form-data-fetch';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';

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

  test('uses appName and entityName for connector-style lookup labels', () => {
    expect(
      mapLookupResponseToOptions([
        { id: 3, appName: 'task-list', entityName: 'Task' },
      ]),
    ).toEqual([{ value: '3', label: 'task-list — Task' }]);
  });

  test('uses string id when value is a display label (chart types)', () => {
    expect(
      mapLookupResponseToOptions([
        { id: 'bar', value: 'Bar' },
        { id: 'line', value: 'Line' },
      ]),
    ).toEqual([
      { value: 'bar', label: 'Bar' },
      { value: 'line', label: 'Line' },
    ]);
  });

  test('unwraps platform envelope { success, data }', () => {
    expect(
      mapLookupResponseToOptions({
        success: true,
        data: [{ value: 2, label: 'Demo User' }],
      }),
    ).toEqual([{ value: '2', label: 'Demo User' }]);
  });
});

describe('hydrateFormRuntimeLookups', () => {
  const connector: FormLookupConnector = {
    endpoints: {
      baseUrl: 'http://localhost:3020',
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
    const components: IFormRuntimeField[] = [
      { fieldKey: 'status', label: 'Status', type: 'Select', row: 0, col: 0 },
    ];

    const result = await hydrateFormRuntimeLookups(components, connector);

    expect(result.hydratedCount).toBe(1);
    expect(result.components[0]?.options).toEqual([{ value: 'active', label: 'Active' }]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3020/api/test-items/statuses',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  test('uses embedded endpoint.response without HTTP fetch', async () => {
    const embeddedConnector: FormLookupConnector = {
      endpoints: {
        baseUrl: 'http://localhost:3013',
        lookups: [
          {
            forProperty: 'chartType',
            endpoint: {
              url: '',
              type: 'GET',
              data: {},
              response: [
                { id: 'bar', value: 'bar', label: 'Bar' },
                { id: 'line', value: 'line', label: 'Line' },
              ],
            },
          },
        ],
      },
    };
    const components: IFormRuntimeField[] = [
      { fieldKey: 'chartType', label: 'Chart type', type: 'Select', row: 0, col: 0 },
    ];

    const result = await hydrateFormRuntimeLookups(components, embeddedConnector);

    expect(result.components[0]?.options).toEqual([
      { value: 'bar', label: 'Bar' },
      { value: 'line', label: 'Line' },
    ]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('forwards host app id on lookup fetch', async () => {
    const components: IFormRuntimeField[] = [
      { fieldKey: 'status', label: 'Status', type: 'Select', row: 0, col: 0 },
    ];

    await hydrateFormRuntimeLookups(components, connector, { hostAppId: 'app-lab-tasklist' });

    const init = lookupFetchInit({ hostAppId: 'app-lab-tasklist' });
    expect(init.headers).toEqual(
      expect.objectContaining({
        'X-Host-App-Id': 'app-lab-tasklist',
      }),
    );
  });
});
