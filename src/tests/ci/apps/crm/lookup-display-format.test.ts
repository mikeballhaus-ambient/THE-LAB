import { describe, expect, test } from '@jest/globals';
import type { EntityDefinition } from '@/apps/lab-crm/shared/types/entity.types';
import {
  applyLookupDisplayFormat,
  validateLookupDisplayFormat,
} from '@/apps/lab-crm/shared/utils/lookup-display-format';
import { formatLookupRecordLabel } from '@/apps/lab-crm/shared/utils/lookup-record-label';

describe('lookup-display-format', () => {
  const contactDef: EntityDefinition = {
    id: 1,
    entityKey: 'contacts',
    name: 'Contacts',
    sortOrder: 1,
    lookupDisplayFormat: '{{ salutation }} {{ firstName }} {{ lastName }}',
    isSystem: true,
    createdAt: '',
    updatedAt: '',
    properties: [
      { name: 'salutation', type: 'string', label: 'Salutation' },
      { name: 'firstName', type: 'string', label: 'First name' },
      { name: 'lastName', type: 'string', label: 'Last name' },
    ],
  };

  test('applyLookupDisplayFormat substitutes placeholders and trims gaps', () => {
    expect(
      applyLookupDisplayFormat('{{ salutation }} {{ firstName }} {{ lastName }}', contactDef, {
        salutation: 'Dr.',
        firstName: 'Avery',
        lastName: 'Chen',
      }),
    ).toBe('Dr. Avery Chen');
    expect(
      applyLookupDisplayFormat('{{ firstName }} {{ lastName }}', contactDef, {
        firstName: 'Avery',
        lastName: 'Chen',
      }),
    ).toBe('Avery Chen');
  });

  test('validateLookupDisplayFormat rejects unknown properties', () => {
    const errors = validateLookupDisplayFormat('{{ notAField }}', contactDef.properties);
    expect(errors.some((e) => e.includes('notAField'))).toBe(true);
  });

  test('formatLookupRecordLabel prefers lookupDisplayFormat over single property', () => {
    const def: EntityDefinition = {
      ...contactDef,
      lookupDisplayProperty: 'lastName',
    };
    expect(
      formatLookupRecordLabel(def, {
        id: 1,
        salutation: 'Ms.',
        firstName: 'Jordan',
        lastName: 'Patel',
      }),
    ).toBe('Ms. Jordan Patel');
  });
});
