import { describe, test, expect } from '@jest/globals';
import {
  buildConnectorDiscoveryIndex,
  buildStandardConnectorCrudPaths,
  resolveConnectorApiBase,
  resolveConnectorDiscoveryUrl,
} from '@/shared/server/connector-discovery';

describe('connector-discovery', () => {
  test('resolveConnectorApiBase normalizes trailing slash', () => {
    expect(resolveConnectorApiBase('http://localhost/', 4001)).toBe('http://localhost:4001');
  });

  test('buildStandardConnectorCrudPaths includes optional getAll filter', () => {
    const paths = buildStandardConnectorCrudPaths({ segment: 'tasks', getAllFilter: 'taskListId' });
    expect(paths.getAll.url).toBe('/api/connector/tasks');
    expect(paths.getAll.filter).toBe('taskListId');
    expect(paths.update.url).toBe('/api/connector/tasks/:id');
  });

  test('buildConnectorDiscoveryIndex maps discovery paths', () => {
    const doc = buildConnectorDiscoveryIndex('help-desk', [
      { entityKey: 'ticket', name: 'Ticket', discoveryPath: 'ticket' },
    ]);
    expect(doc.entities[0]?.discoveryUrl).toBe('/api/connector/discovery/ticket');
  });

  test('resolveConnectorDiscoveryUrl accepts absolute paths', () => {
    expect(resolveConnectorDiscoveryUrl('/custom/discovery')).toBe('/custom/discovery');
  });
});
