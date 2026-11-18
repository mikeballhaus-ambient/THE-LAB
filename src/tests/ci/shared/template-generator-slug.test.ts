import { describe, test, expect } from '@jest/globals';
import { templateGenerator } from '@/shared/services/TemplateGenerator';

describe('TemplateGenerator app id conventions', () => {
  test('resolveAppFolderSlug strips app- prefix and normalizes', () => {
    expect(templateGenerator.resolveAppFolderSlug('CRM')).toBe('crm');
    expect(templateGenerator.resolveAppFolderSlug('app-lab-crm')).toBe('lab-crm');
    expect(templateGenerator.resolveAppFolderSlug('My CRM App')).toBe('my-crm-app');
    expect(templateGenerator.resolveAppFolderSlug('Lab Smoke Test')).toBe('lab-smoke-test');
  });

  test('resolveRegistryAppId always uses app- prefix', () => {
    expect(templateGenerator.resolveRegistryAppId('crm')).toBe('app-crm');
    expect(templateGenerator.resolveRegistryAppId('Smoke Test')).toBe('app-smoke-test');
    expect(templateGenerator.resolveRegistryAppId('app-lab-crm')).toBe('app-lab-crm');
  });

  test('validateUserAppFolderSlug rejects lab-* reserved prefix', () => {
    expect(() => templateGenerator.validateUserAppFolderSlug('lab-smoke-test')).toThrow(/reserved/i);
    expect(() => templateGenerator.validateUserAppFolderSlug('smoke-test')).not.toThrow();
  });
});
