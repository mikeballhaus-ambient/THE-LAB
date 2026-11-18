import { describe, expect, test } from '@jest/globals';
import Fastify from 'fastify';
import {
  registerCatalogLookupRoutes,
  type CatalogCrudConnectorHandlers,
} from '@/shared/server/catalog-crud-connector-routes';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';

interface Row {
  id: number;
  name: string;
  status: string;
}

const rows: Row[] = [
  { id: 1, name: 'Alpha', status: 'open' },
  { id: 2, name: 'Beta', status: 'closed' },
];

function handlers(
  overrides: Partial<CatalogCrudConnectorHandlers<Row>> = {},
): CatalogCrudConnectorHandlers<Row> {
  return {
    list: () => rows,
    getById: (id) => rows.find((row) => row.id === id) ?? null,
    create: () => rows[0],
    update: () => rows[0],
    delete: () => true,
    toConnector: (row) => ({ ...row }),
    ...overrides,
  };
}

const properties: FormBuilderContractModelProperty[] = [
  {
    name: 'status',
    type: 'string',
    lookupProvider: 'enum',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
    ],
  },
  {
    name: 'parentId',
    type: 'number',
    lookupProvider: 'self-entity',
    lookupEntityKey: 'widgets',
  },
  { name: 'title', type: 'string' },
];

async function build(overrides: Partial<CatalogCrudConnectorHandlers<Row>> = {}) {
  const app = Fastify();
  await registerCatalogLookupRoutes(app, '/api/connector/widgets', handlers(overrides), properties);
  return app;
}

describe('registerCatalogLookupRoutes', () => {
  test('serves enum options from manifest metadata', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/api/connector/widgets/lookups/status' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      { id: 'open', value: 'open', label: 'Open' },
      { id: 'closed', value: 'closed', label: 'Closed' },
    ]);
    await app.close();
  });

  test('serves self-entity rows labelled by name', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/api/connector/widgets/lookups/parentId' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      { id: 1, value: '1', label: 'Alpha' },
      { id: 2, value: '2', label: 'Beta' },
    ]);
    await app.close();
  });

  test('honours lookupLabelProperty override', async () => {
    const app = Fastify();
    await registerCatalogLookupRoutes(
      app,
      '/api/connector/widgets',
      handlers(),
      [
        {
          name: 'parentId',
          type: 'number',
          lookupProvider: 'self-entity',
          lookupEntityKey: 'widgets',
          lookupLabelProperty: 'status',
        },
      ],
    );
    const res = await app.inject({ method: 'GET', url: '/api/connector/widgets/lookups/parentId' });
    expect(res.json().map((row: { label: string }) => row.label)).toEqual(['open', 'closed']);
    await app.close();
  });

  test('prefers app-specific lookupOptions over manifest metadata', async () => {
    const app = await build({
      lookupOptions: (propertyName) =>
        propertyName === 'status' ? [{ id: 'x', value: 'x', label: 'Custom' }] : null,
    });
    const res = await app.inject({ method: 'GET', url: '/api/connector/widgets/lookups/status' });

    expect(res.json()).toEqual([{ id: 'x', value: 'x', label: 'Custom' }]);
    await app.close();
  });

  test('404s an unknown property', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/api/connector/widgets/lookups/nope' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  test('400s a property that is not a lookup', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/api/connector/widgets/lookups/title' });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('400s a lab-user property (served by the platform, not here)', async () => {
    const app = Fastify();
    await registerCatalogLookupRoutes(app, '/api/connector/widgets', handlers(), [
      { name: 'ownerName', type: 'string', lookupProvider: 'lab-user' },
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/api/connector/widgets/lookups/ownerName',
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('does not swallow CRUD routes registered on the same prefix', async () => {
    // The lookups route must not shadow /:id — it is registered before, but path shape differs.
    const app = Fastify();
    await registerCatalogLookupRoutes(app, '/api/connector/widgets', handlers(), properties);
    const res = await app.inject({ method: 'GET', url: '/api/connector/widgets/lookups/status' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
