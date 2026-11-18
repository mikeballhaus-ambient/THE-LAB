import {
  buildConnectorRequestHeaders,
  isLabLocalUrl,
  resolveConnectorRowsUrl,
  unwrapDiscoveryContract,
} from '@/apps/lab-chartbuilder/back-end/services/connector-request';
import { ChartService } from '@/apps/lab-chartbuilder/back-end/services/chart-service';
import type { ChartSchema } from '@/shared/charts/chart-types';

/**
 * Regression cover for the `connector_http_401` ("Observations by condition" report) bug.
 *
 * Two independent defects fed it:
 *   1. Chart Builder called the connector with no credentials → catalog apps answered 401.
 *   2. The stored URL is the **discovery** URL, so even a 200 returned a contract, never rows.
 */

const CATALOG_CONTRACT = {
  appName: 'weather-dashboard',
  entityName: 'WeatherObservation',
  entityModel: { id: 'number', name: 'WeatherObservation', properties: [] },
  endpoints: {
    baseUrl: 'http://localhost:4120',
    crud: {
      getAll: { url: '/api/connector/weather-observations', type: 'GET', data: {} },
      get: { url: '/api/connector/weather-observations/:id', type: 'GET', data: {} },
      create: { url: '/api/connector/weather-observations', type: 'POST', data: {} },
      update: { url: '/api/connector/weather-observations/:id', type: 'POST', data: {} },
      delete: { url: '/api/connector/weather-observations/:id', type: 'DELETE', data: {} },
    },
    lookups: [],
  },
};

describe('connector rows URL resolution', () => {
  const discoveryUrl = 'http://localhost:4120/api/connector/discovery/weather-observation';

  test('reads rows from the contract crud.getAll endpoint, not the discovery URL', () => {
    expect(resolveConnectorRowsUrl(discoveryUrl, CATALOG_CONTRACT)).toBe(
      'http://localhost:4120/api/connector/weather-observations',
    );
  });

  test('accepts the hub envelope shape', () => {
    const wrapped = { success: true, data: { contract: CATALOG_CONTRACT } };
    expect(resolveConnectorRowsUrl(discoveryUrl, wrapped)).toBe(
      'http://localhost:4120/api/connector/weather-observations',
    );
  });

  test('falls back to the discovery URL when the body is not a contract', () => {
    expect(resolveConnectorRowsUrl(discoveryUrl, { unexpected: true })).toBe(discoveryUrl);
    expect(unwrapDiscoveryContract({ unexpected: true })).toBeNull();
  });

  test('uses an absolute crud URL when the contract supplies one', () => {
    const absolute = {
      ...CATALOG_CONTRACT,
      endpoints: {
        ...CATALOG_CONTRACT.endpoints,
        crud: {
          ...CATALOG_CONTRACT.endpoints.crud,
          getAll: { url: 'http://localhost:4999/api/connector/rows', type: 'GET', data: {} },
        },
      },
    };
    expect(resolveConnectorRowsUrl(discoveryUrl, absolute)).toBe(
      'http://localhost:4999/api/connector/rows',
    );
  });
});

describe('connector auth header scoping', () => {
  test('never sends the platform service token to a third-party host', () => {
    expect(isLabLocalUrl('https://api.example.com/discovery')).toBe(false);
    expect(
      buildConnectorRequestHeaders('https://api.example.com/discovery', 7),
    ).toEqual({});
  });

  test('sends service token + user id for loopback connector calls', () => {
    const headers = buildConnectorRequestHeaders('http://localhost:4120/api/connector/x', 7);
    expect(headers['x-lab-user-id']).toBe('7');
    expect(headers['x-lab-app-service-token']).toBeTruthy();
  });

  test('omits auth when no acting user is known', () => {
    expect(buildConnectorRequestHeaders('http://localhost:4120/api/connector/x', null)).toEqual({});
    expect(buildConnectorRequestHeaders('http://localhost:4120/api/connector/x', 0)).toEqual({});
  });
});

describe('ChartService.render connector flow', () => {
  function buildService(responses: Array<{ body: unknown }>): {
    service: ChartService;
    calls: Array<{ url: string; headers: Record<string, string> | undefined }>;
  } {
    const calls: Array<{ url: string; headers: Record<string, string> | undefined }> = [];
    const chart: ChartSchema = {
      chartKey: 'weather-dashboard.reports.observations-by-condition',
      name: 'Observations by condition',
      chartType: 'pie',
      options: {},
      is_active: true,
      dataConnectorId: 1,
      dataMapping: {
        mode: 'aggregate',
        groupByField: 'condition',
        measure: 'count',
        datasetLabel: 'Observations',
      },
    };
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        headers: init?.headers as Record<string, string> | undefined,
      });
      const next = responses.shift();
      return {
        ok: true,
        status: 200,
        json: async () => next?.body ?? [],
      } as unknown as Response;
    }) as typeof fetch;

    const service = new ChartService(
      {
        charts: { findByKey: () => chart, findAll: () => ({ charts: [chart], total: 1, limit: 10, offset: 0 }) } as never,
        connectors: {
          findById: () => ({
            id: 1,
            appName: 'weather-dashboard',
            entityName: 'WeatherObservation',
            discoveryUrl:
              'http://localhost:4120/api/connector/discovery/weather-observation',
            isActive: true,
          }),
        } as never,
        fetchImpl,
      },
      {} as never,
    );
    return { service, calls };
  }

  test('fetches discovery then rows, aggregating the condition buckets', async () => {
    const { service, calls } = buildService([
      { body: CATALOG_CONTRACT },
      {
        body: [
          { condition: 'clear' },
          { condition: 'clear' },
          { condition: 'snow' },
        ],
      },
    ]);

    const result = await service.render('weather-dashboard.reports.observations-by-condition', {
      context: { hostAppId: 'app-weather-dashboard' },
    }, { actorUserId: 7 });

    expect(calls.map((call) => call.url)).toEqual([
      'http://localhost:4120/api/connector/discovery/weather-observation',
      'http://localhost:4120/api/connector/weather-observations',
    ]);
    expect(calls[1].headers?.['x-lab-user-id']).toBe('7');
    expect(result.data.labels).toEqual(['clear', 'snow']);
    expect(result.data.datasets[0].data).toEqual([2, 1]);
  });

  test('surfaces a non-OK connector response as connector_http_<status>', async () => {
    const chart: ChartSchema = {
      chartKey: 'k',
      name: 'k',
      chartType: 'pie',
      options: {},
      is_active: true,
      dataConnectorId: 1,
    };
    const service = new ChartService(
      {
        charts: { findByKey: () => chart } as never,
        connectors: { findById: () => ({ id: 1, discoveryUrl: 'http://localhost:4120/x' }) } as never,
        fetchImpl: (async () =>
          ({ ok: false, status: 401, json: async () => ({}) }) as unknown as Response) as typeof fetch,
      },
      {} as never,
    );

    await expect(service.render('k', {}, { actorUserId: 7 })).rejects.toThrow('connector_http_401');
  });
});
