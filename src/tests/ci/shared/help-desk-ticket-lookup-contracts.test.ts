import { describe, expect, test } from '@jest/globals';
import {
  buildHelpDeskTicketLookupContracts,
  mergeHelpDeskTicketLookupsOntoConnector,
} from '@/shared/lab-integrations/help-desk-ticket-lookup-contracts';
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types';
import { syncFormComponentTypesFromConnector } from '@/shared/forms/sync-form-component-types-from-connector';

describe('help-desk ticket lookup contracts', () => {
  test('declares status, priority, and assignee lookups', () => {
    const lookups = buildHelpDeskTicketLookupContracts('http://localhost:3012');
    const props = lookups.map((l) => l.forProperty);
    expect(props).toEqual(
      expect.arrayContaining(['status', 'priority', 'assigneeId', 'requesterLabUserId']),
    );
    expect(lookups.find((l) => l.forProperty === 'status')?.endpoint.response).toHaveLength(5);
  });

  test('mergeHelpDeskTicketLookupsOntoConnector upgrades stale InputText fields to Select', () => {
    const connector: DataConnector = {
      id: 1,
      appName: 'help-desk',
      entityName: 'Ticket',
      discoveryUrl: 'http://localhost:3012/discovery/ticket',
      discoveryType: 'REST',
      entityModel: {
        id: 'string',
        name: 'Ticket',
        description: 'Ticket',
        status: 'active',
        properties: [
          { name: 'status', type: 'string', label: 'Status' },
          { name: 'priority', type: 'string', label: 'Priority' },
          { name: 'assigneeId', type: 'string', label: 'Assignee' },
        ],
      },
      endpoints: {
        baseUrl: 'http://localhost:3012',
        crud: {
          getAll: { url: '/api/connector/tickets', type: 'GET', data: {} },
          get: { url: '/api/connector/tickets/:id', type: 'GET', data: {} },
          create: { url: '/api/connector/tickets', type: 'POST', data: {} },
          update: { url: '/api/connector/tickets/:id', type: 'POST', data: {} },
          delete: { url: '/api/connector/tickets/:id', type: 'DELETE', data: {} },
        },
        lookups: [],
      },
      capabilities: ['CRUD', 'Lookups'],
      is_active: 1,
      createdAt: '',
      updatedAt: '',
      last_verified_at: '',
    };
    const merged = mergeHelpDeskTicketLookupsOntoConnector(connector);
    const synced = syncFormComponentTypesFromConnector(
      merged,
      [
        { fieldKey: 'status', type: 'InputText', label: 'Status', row: 0, col: 0, span: 1 },
        { fieldKey: 'priority', type: 'InputText', label: 'Priority', row: 0, col: 1, span: 1 },
        { fieldKey: 'assigneeId', type: 'InputText', label: 'Assignee', row: 1, col: 0, span: 1 },
      ],
    );
    expect(synced.map((c) => c.type)).toEqual(['Select', 'Select', 'Select']);
    expect(synced.every((c) => c.dataFetch?.forProperty)).toBe(true);
  });
});
