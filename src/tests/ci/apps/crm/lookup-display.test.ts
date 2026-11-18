import { describe, expect, test } from '@jest/globals';
import type { EntityDefinition } from '@/apps/lab-crm/shared/types/entity.types';
import { formatLookupRecordLabel } from '@/apps/lab-crm/shared/utils/lookup-record-label';
import { formatCellValue, formatCellValueForDefinition } from '@/apps/lab-crm/shared/utils/record-list-display';

describe('lookup-record-label', () => {
  test('formatLookupRecordLabel uses entity lookupDisplayProperty', () => {
    const def: EntityDefinition = {
      id: 1,
      entityKey: 'products',
      name: 'Products',
      sortOrder: 1,
      lookupDisplayProperty: 'sku',
      isSystem: true,
      createdAt: '',
      updatedAt: '',
      properties: [
        { name: 'sku', type: 'string', label: 'SKU' },
        { name: 'name', type: 'string', label: 'Name' },
      ],
    };
    expect(formatLookupRecordLabel(def, { id: 1, sku: 'SKU-100', name: 'Widget' })).toBe('SKU-100');
  });

  test('formatLookupRecordLabel uses labelProp when target has no display format', () => {
    const def: EntityDefinition = {
      id: 1,
      entityKey: 'contacts',
      name: 'Contacts',
      sortOrder: 1,
      isSystem: true,
      createdAt: '',
      updatedAt: '',
      properties: [
        { name: 'firstName', type: 'string', label: 'First' },
        { name: 'lastName', type: 'string', label: 'Last' },
      ],
    };
    expect(
      formatLookupRecordLabel(def, { id: 1, firstName: 'Avery', lastName: 'Chen' }, 'lastName'),
    ).toBe('Chen');
    expect(formatLookupRecordLabel(def, { id: 1, firstName: 'Avery', lastName: 'Chen' })).toBe(
      'Avery Chen',
    );
  });

  test('formatLookupRecordLabel prefers lookupDisplayFormat over per-field labelProp', () => {
    const def: EntityDefinition = {
      id: 1,
      entityKey: 'contacts',
      name: 'Contacts',
      sortOrder: 1,
      lookupDisplayFormat: '{{ firstName }} {{ lastName }}',
      isSystem: true,
      createdAt: '',
      updatedAt: '',
      properties: [
        { name: 'firstName', type: 'string', label: 'First' },
        { name: 'lastName', type: 'string', label: 'Last' },
      ],
    };
    expect(
      formatLookupRecordLabel(def, { id: 1, firstName: 'Morgan', lastName: 'Foster' }, 'lastName'),
    ).toBe('Morgan Foster');
  });
});

describe('formatCellValue lookup resolution', () => {
  test('shows lookup label instead of id', () => {
    const row = { id: 10, contactId: 3 };
    const property = {
      name: 'contactId',
      type: 'lookup' as const,
      label: 'Contact',
      lookupEntityKey: 'contacts',
    };
    expect(
      formatCellValue(row, 'contactId', {
        property,
        lookupLabels: { 3: 'Avery Chen' },
      }),
    ).toBe('Avery Chen');
  });

  test('formatCellValueForDefinition wires definition and lookup map', () => {
    const def: EntityDefinition = {
      id: 2,
      entityKey: 'leads',
      name: 'Leads',
      sortOrder: 1,
      isSystem: true,
      createdAt: '',
      updatedAt: '',
      properties: [
        { name: 'contactId', type: 'lookup', label: 'Contact', lookupEntityKey: 'contacts' },
      ],
    };
    expect(
      formatCellValueForDefinition({ contactId: 5 }, 'contactId', def, {
        contactId: { 5: 'Jordan Patel' },
      }),
    ).toBe('Jordan Patel');
  });
});
