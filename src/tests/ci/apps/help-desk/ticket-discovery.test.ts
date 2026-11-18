import { describe, test, expect } from '@jest/globals';
import { buildTicketDiscoveryContract } from '@/apps/lab-helpdesk/back-end/utils/connector/ticket-discovery-builder';

describe('help-desk ticket discovery contract', () => {
  const contract = buildTicketDiscoveryContract('http://localhost', 3012);

  test('identifies app and entity', () => {
    expect(contract.appName).toBe('help-desk');
    expect(contract.entityName).toBe('Ticket');
    expect(contract.capabilities).toContain('Lookups');
  });

  test('declares CRUD endpoints', () => {
    const crud = contract.endpoints.crud;
    expect(crud.getAll.url).toBe('/api/connector/tickets');
    expect(crud.get.type).toBe('GET');
    expect(crud.create.type).toBe('POST');
    expect(crud.update.type).toBe('POST');
    expect(crud.delete.type).toBe('DELETE');
    expect(contract.endpoints.baseUrl).toBe('http://localhost:3012');
  });

  test('includes property metadata and lookups', () => {
    const props = contract.entityModel.properties ?? [];
    expect(props.some(p => p.name === 'subject')).toBe(true);
    expect(props.some(p => p.name === 'status')).toBe(true);
    const lookupProps = contract.endpoints.lookups.map(l => l.forProperty);
    expect(lookupProps).toEqual(
      expect.arrayContaining(['status', 'priority', 'assigneeId', 'requesterLabUserId']),
    );
    const assigneeLookup = contract.endpoints.lookups.find(l => l.forProperty === 'assigneeId');
    expect(assigneeLookup?.endpoint.url).toBe('http://localhost:3012/api/connector/tickets/assignees');
    const metadataProp = props.find(p => p.name === 'metadata');
    expect(metadataProp?.hidden).toBe(true);
  });
});
