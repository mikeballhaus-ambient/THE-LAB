import { describe, expect, test } from '@jest/globals';
import { parseConnectorRouteId } from '@/shared/server/catalog-crud-connector-routes';

describe('parseConnectorRouteId', () => {
  test('parses integer primary keys as numbers', () => {
    expect(parseConnectorRouteId('42')).toBe(42);
    expect(parseConnectorRouteId('001')).toBe(1);
  });

  test('preserves dotted chart keys as strings', () => {
    const key = 'lab-helpdesk.help-desk.tickets.reports-by-status';
    expect(parseConnectorRouteId(key)).toBe(key);
    expect(parseConnectorRouteId(encodeURIComponent(key))).toBe(key);
  });

  test('decodes percent-encoded string keys', () => {
    expect(parseConnectorRouteId('chart%2Fkey')).toBe('chart/key');
  });
});
