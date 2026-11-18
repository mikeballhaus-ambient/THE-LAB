import { describe, test, expect } from '@jest/globals';
import {
  findAppRootLoaderKey,
  isAppRootComponentPath,
  normalizeAppComponentPath,
  resolveAppRootLoader,
} from '@/shared/services/ComponentLoader';

describe('ComponentLoader (4.7)', () => {
  test('normalizeAppComponentPath adds leading slash', () => {
    expect(normalizeAppComponentPath('src/apps/lab-crm/front-end/App.vue')).toBe(
      '/src/apps/lab-crm/front-end/App.vue',
    );
  });

  test('findAppRootLoaderKey matches case-insensitive app path', () => {
    const loaders = {
      '/src/apps/lab-crm/front-end/App.vue': async () => ({ default: {} as never }),
    };
    expect(
      findAppRootLoaderKey(loaders, '/src/apps/Lab-CRM/front-end/App.vue'),
    ).toBe('/src/apps/lab-crm/front-end/App.vue');
  });

  test('resolveAppRootLoader is undefined for unknown path under Jest', () => {
    expect(resolveAppRootLoader('/src/apps/unknown-app/front-end/App.vue')).toBeUndefined();
  });

  test('isAppRootComponentPath accepts template generator app root paths', () => {
    expect(isAppRootComponentPath('/src/apps/smoke-test/front-end/App.vue')).toBe(true);
    expect(isAppRootComponentPath('src/apps/foo/bar/App.vue')).toBe(false);
  });
});
