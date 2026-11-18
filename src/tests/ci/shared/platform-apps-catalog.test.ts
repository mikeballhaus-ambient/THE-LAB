import { describe, test, expect, afterEach } from '@jest/globals';
import type { IApp } from '@/shared/types/app/app.d';
import {
  getPlatformAppsCatalog,
  registerPlatformAppsCatalog,
  resetPlatformAppsCatalogForTests,
  tryGetPlatformAppsCatalog,
} from '@/shared/services/platform-apps-catalog';

describe('platform-apps-catalog (4.5)', () => {
  afterEach(() => {
    resetPlatformAppsCatalogForTests();
  });

  test('registerPlatformAppsCatalog exposes getAllApps', () => {
    const stubApp = { id: 'app-demo', name: 'Demo' } as IApp;
    registerPlatformAppsCatalog({
      getAllApps: () => [stubApp],
      getAppById: (id) => (id === 'app-demo' ? stubApp : undefined),
      createApp: () => undefined,
      ensureInitialized: async () => undefined,
    });

    expect(tryGetPlatformAppsCatalog()?.getAllApps()).toEqual([stubApp]);
    expect(getPlatformAppsCatalog().getAppById('app-demo')).toEqual(stubApp);
  });

  test('getPlatformAppsCatalog throws when not registered', () => {
    expect(() => getPlatformAppsCatalog()).toThrow(/not registered/i);
  });
});
