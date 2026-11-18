import { describe, expect, test } from '@jest/globals';
import {
  validateCreateDefinitionInput,
  validateEntityKey,
} from '@/apps/lab-crm/back-end/services/entity-definition-validation';
import type { EntityProperty } from '@/apps/lab-crm/shared/types/entity.types';

describe('entity-definition-validation', () => {
  test('validateEntityKey rejects reserved keys', () => {
    expect(validateEntityKey('users')).toContain('entityKey "users" is reserved');
  });

  test('validateCreateDefinitionInput requires lookup target', () => {
    const properties: EntityProperty[] = [
      {
        name: 'contactId',
        type: 'lookup',
        label: 'Contact',
        lookupEntityKey: 'missing',
      },
    ];
    const errors = validateCreateDefinitionInput(
      { entityKey: 'partners', name: 'Partners', properties },
      new Set(),
      new Set(['contacts']),
    );
    expect(errors.some((e) => e.includes('missing'))).toBe(true);
  });
});
