import { describe, expect, test } from '@jest/globals';
import type { EntityDefinition } from '@/apps/lab-crm/shared/types/entity.types';
import {
  filterRecords,
  formatCellValue,
  listDisplayColumns,
  recordsToCsv,
} from '@/apps/lab-crm/shared/utils/record-list-display';

describe('record-list-display', () => {
  test('listDisplayColumns uses property labels', () => {
    const def: EntityDefinition = {
      id: 1,
      entityKey: 'contacts',
      name: 'Contacts',
      sortOrder: 1,
      isSystem: true,
      createdAt: '',
      updatedAt: '',
      properties: [
        { name: 'firstName', type: 'string', label: 'First name' },
        { name: 'email', type: 'string', label: 'Email' },
      ],
    };
    const cols = listDisplayColumns(def, 2);
    expect(cols[0].label).toBe('First name');
  });

  test('filterRecords applies search and enum filter', () => {
    const rows = [
      { id: 1, status: 'new', name: 'Acme' },
      { id: 2, status: 'converted', name: 'Beta' },
    ];
    const filtered = filterRecords(rows, { q: 'acme', fieldFilters: { status: 'new' } });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
  });

  test('listDisplayColumns includes approvalStatus on deal entities', () => {
    const def: EntityDefinition = {
      id: 1,
      entityKey: 'sales',
      name: 'Sales',
      sortOrder: 1,
      isSystem: true,
      createdAt: '',
      updatedAt: '',
      properties: [
        { name: 'name', type: 'string', label: 'Name' },
        { name: 'stage', type: 'enum', label: 'Stage', options: [] },
        { name: 'approvalStatus', type: 'enum', label: 'Approval status', options: [] },
        { name: 'amount', type: 'number', label: 'Amount' },
      ],
    };
    const cols = listDisplayColumns(def, 5);
    expect(cols.map((c) => c.name)).toEqual(['name', 'stage', 'approvalStatus', 'amount']);
  });

  test('formatCellValue formats amount as currency', () => {
    expect(
      formatCellValue(
        { amount: 24000 },
        'amount',
        { property: { name: 'amount', type: 'number', label: 'Amount' } },
      ),
    ).toMatch(/\$24,000/);
  });

  test('recordsToCsv includes header row', () => {
    const csv = recordsToCsv([{ name: 'name', label: 'Name' }], [{ id: 1, name: 'Test' }]);
    expect(csv.split('\n')[0]).toContain('id');
    expect(csv).toContain('Test');
  });
});
