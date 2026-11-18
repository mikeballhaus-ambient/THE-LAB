import { describe, expect, test } from '@jest/globals';
import {
  DEFAULT_ENTITY_ICON,
  entityIconForPrimeButton,
  normalizeEntityIconClass,
} from '@/apps/lab-crm/shared/utils/entity-icon';

describe('entity-icon', () => {
  test('defaults when empty', () => {
    expect(normalizeEntityIconClass()).toBe(`pi ${DEFAULT_ENTITY_ICON}`);
    expect(entityIconForPrimeButton(null)).toBe(`pi ${DEFAULT_ENTITY_ICON}`);
  });

  test('normalizes pi- prefix form', () => {
    expect(normalizeEntityIconClass('pi-users')).toBe('pi pi-users');
  });

  test('preserves full pi class list', () => {
    expect(normalizeEntityIconClass('pi pi-filter')).toBe('pi pi-filter');
  });
});
