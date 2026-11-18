import { describe, expect, test } from '@jest/globals';
import Fastify from 'fastify';
import { CHART_BUILDER_INTEGRATION_MANIFEST } from '@/backend/db/Apps/integration-manifest-seeds';
import { registerIntegrationServiceConnectors } from '@/shared/server/register-catalog-connectors';

describe('registerIntegrationServiceConnectors', () => {
  test('registers GET /api/connector/charts/:chartKey for string keys', async () => {
    const chartKey = 'lab-helpdesk.reports.priority-breakdown';
    const server = Fastify();
    await registerIntegrationServiceConnectors(
      server,
      CHART_BUILDER_INTEGRATION_MANIFEST,
      {
        charts: {
          list: () => [{ chartKey, name: 'Priority breakdown' }],
          getById: (id) =>
            id === chartKey || String(id) === chartKey
              ? { chartKey, name: 'Priority breakdown' }
              : null,
          create: () => ({ chartKey, name: 'Priority breakdown' }),
          update: () => ({ chartKey, name: 'Priority breakdown' }),
          delete: () => true,
          toConnector: (row) => row as Record<string, unknown>,
        },
      },
      'chart-builder',
    );

    const response = await server.inject({
      method: 'GET',
      url: `/api/connector/charts/${encodeURIComponent(chartKey)}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ chartKey, name: 'Priority breakdown' });
    await server.close();
  });
});
