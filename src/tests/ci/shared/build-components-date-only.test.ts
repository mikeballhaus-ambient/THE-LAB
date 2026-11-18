import { describe, expect, test } from '@jest/globals';
import { buildComponentsFromConnector } from '@/shared/forms/build-components-from-connector';
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types';

describe('buildComponentsFromConnector dateOnly', () => {
  test('sets dateOnly on DatePicker when property declares it', () => {
    const connector = {
      entityModel: {
        properties: [
          { name: 'startDate', type: 'date', label: 'Start', dateOnly: true },
          { name: 'startsAt', type: 'date', label: 'Starts' },
        ],
      },
      endpoints: { lookups: [] },
    } as unknown as DataConnector;

    const components = buildComponentsFromConnector(connector, []);
    const startDate = components.find((c) => c.fieldKey === 'startDate');
    const startsAt = components.find((c) => c.fieldKey === 'startsAt');
    expect(startDate?.type).toBe('DatePicker');
    expect(startDate?.dateOnly).toBe(true);
    expect(startsAt?.dateOnly).toBeUndefined();
  });
});
