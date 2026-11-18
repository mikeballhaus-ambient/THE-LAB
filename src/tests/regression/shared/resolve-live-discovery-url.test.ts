import { describe, expect, test } from '@jest/globals';
import { resolveLiveDiscoveryUrl } from '@/backend/lab-integrations/resolve-live-discovery-url';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';

const baseContract: FormsBuilderContract = {
  appName: 'help-desk',
  entityName: 'Ticket',
  capabilities: ['CRUD'],
  entityModel: {
    id: 'number',
    name: 'Ticket',
    description: 'Ticket',
    status: 'active',
    properties: [],
  },
  endpoints: {
    baseUrl: 'http://localhost:3012',
    crud: {
      getAll: { url: '/api/connector/tickets', type: 'GET', data: {} },
      get: { url: '/x/:id', type: 'GET', data: {} },
      create: { url: '/x', type: 'POST', data: {} },
      update: { url: '/x/:id', type: 'POST', data: {} },
      delete: { url: '/x/:id', type: 'DELETE', data: {} },
    },
    lookups: [],
  },
};

describe('resolveLiveDiscoveryUrl', () => {
  test('help desk ticket discovery uses connector prefix', () => {
    const url = resolveLiveDiscoveryUrl(baseContract, '/connector/discovery/ticket');
    expect(url).toBe('http://localhost:3012/api/connector/discovery/ticket');
  });
});
