import { describe, expect, test } from '@jest/globals';
import {
  isLabAppServerWarmupEnabled,
  resolveLabAppServerWarmupScope,
  resolvePlatformWarmupAppIds,
  resolveWarmupAppIds,
  shouldWarmUpAppServer,
} from '@/shared/config/lab-app-server-warmup';
import type { IApp } from '@/shared/types/app/app.d';

function baseApp(overrides: Partial<IApp> = {}): IApp {
  return {
    id: 'app-test',
    name: 'Test',
    description: '',
    faIcon: 'fa',
    order: 1,
    type: 'hybrid',
    isEnabled: true,
    isServerSideEnabled: true,
    dependencies: [],
    optionalDependencies: [],
    metadata: { category: 'general', author: 'x', version: '1', tags: [] },
    version: '1.0.0',
    changelog: [],
    server: { entry: '/src/apps/test/back-end/server.ts', port: 4001 },
    ...overrides,
  } as IApp;
}

function serverApp(id: string, overrides: Partial<IApp> = {}): IApp {
  return baseApp({
    id,
    name: id,
    server: { entry: `/src/apps/${id}/back-end/entry.ts`, port: 4001 },
    ...overrides,
  });
}

describe('lab-app-server-warmup', () => {
  test('isLabAppServerWarmupEnabled defaults on', () => {
    expect(isLabAppServerWarmupEnabled({})).toBe(true);
    expect(isLabAppServerWarmupEnabled({ LAB_APP_SERVER_WARMUP: '1' })).toBe(true);
  });

  test('isLabAppServerWarmupEnabled respects opt-out', () => {
    expect(isLabAppServerWarmupEnabled({ LAB_APP_SERVER_WARMUP: '0' })).toBe(false);
    expect(isLabAppServerWarmupEnabled({ LAB_APP_SERVER_WARMUP: 'false' })).toBe(false);
  });

  test('shouldWarmUpAppServer filters enabled hybrid/server with entry', () => {
    expect(shouldWarmUpAppServer(baseApp())).toBe(true);
    expect(shouldWarmUpAppServer(baseApp({ isEnabled: false }))).toBe(false);
    expect(shouldWarmUpAppServer(baseApp({ type: 'browser' }))).toBe(false);
    expect(shouldWarmUpAppServer(baseApp({ isServerSideEnabled: false }))).toBe(false);
    expect(shouldWarmUpAppServer(baseApp({ server: undefined }))).toBe(false);
  });

  test('resolveLabAppServerWarmupScope defaults to platform', () => {
    expect(resolveLabAppServerWarmupScope({})).toBe('platform');
    expect(resolveLabAppServerWarmupScope({ LAB_APP_SERVER_WARMUP_SCOPE: 'all' })).toBe('all');
    expect(resolveLabAppServerWarmupScope({ LAB_APP_SERVER_WARMUP_SCOPE: 'PLATFORM' })).toBe(
      'platform',
    );
    expect(resolveLabAppServerWarmupScope({ LAB_APP_SERVER_WARMUP_SCOPE: 'bogus' })).toBe(
      'platform',
    );
  });

  describe('resolvePlatformWarmupAppIds', () => {
    test('includes protected platform apps and transitive dependencies only', () => {
      const apps = [
        serverApp('app-lab-formsbuilder'),
        serverApp('app-lab-chartbuilder', { dependencies: ['app-lab-formsbuilder'] }),
        serverApp('app-lab-tasklist', {
          dependencies: ['app-lab-formsbuilder', 'app-lab-chartbuilder'],
        }),
        serverApp('app-lab-crm', {
          dependencies: ['app-lab-tasklist'],
          optionalDependencies: ['app-lab-approvals-policies'],
        }),
        serverApp('app-lab-helpdesk'),
        serverApp('app-okr-goals'),
        serverApp('app-solitaire'),
      ];

      const ids = resolvePlatformWarmupAppIds(apps);

      expect(ids.has('app-lab-formsbuilder')).toBe(true);
      expect(ids.has('app-lab-chartbuilder')).toBe(true);
      expect(ids.has('app-lab-tasklist')).toBe(true);
      expect(ids.has('app-lab-crm')).toBe(true);
      expect(ids.has('app-lab-helpdesk')).toBe(true);

      expect(ids.has('app-okr-goals')).toBe(false);
      expect(ids.has('app-solitaire')).toBe(false);
    });

    test('ignores browser apps in dependency lists', () => {
      const apps = [
        serverApp('app-lab-crm', {
          dependencies: [],
          optionalDependencies: ['app-lab-approvals-policies'],
        }),
        baseApp({
          id: 'app-lab-approvals-policies',
          type: 'browser',
          isServerSideEnabled: false,
          server: undefined,
        }),
      ];

      const ids = resolvePlatformWarmupAppIds(apps);

      expect(ids.has('app-lab-crm')).toBe(true);
      expect(ids.has('app-lab-approvals-policies')).toBe(false);
    });

    test('excludes disabled dependencies', () => {
      const apps = [
        serverApp('app-lab-formsbuilder', { isEnabled: false }),
        serverApp('app-lab-chartbuilder', { dependencies: ['app-lab-formsbuilder'] }),
      ];

      const ids = resolvePlatformWarmupAppIds(apps);

      expect(ids.has('app-lab-formsbuilder')).toBe(false);
      expect(ids.has('app-lab-chartbuilder')).toBe(true);
    });

    test('handles missing dependency ids without throwing', () => {
      const apps = [serverApp('app-lab-crm', { dependencies: ['app-not-registered'] })];
      expect(() => resolvePlatformWarmupAppIds(apps)).not.toThrow();
      expect(resolvePlatformWarmupAppIds(apps).has('app-lab-crm')).toBe(true);
    });
  });

  describe('resolveWarmupAppIds', () => {
    const apps = [
      serverApp('app-lab-formsbuilder'),
      serverApp('app-lab-crm', { dependencies: ['app-lab-formsbuilder'] }),
      serverApp('app-okr-goals'),
    ];

    test('platform scope excludes catalog apps', () => {
      const ids = resolveWarmupAppIds(apps, 'platform');
      expect(ids.has('app-okr-goals')).toBe(false);
      expect(ids.has('app-lab-crm')).toBe(true);
    });

    test('all scope includes every warmable app', () => {
      const ids = resolveWarmupAppIds(apps, 'all');
      expect(ids.has('app-okr-goals')).toBe(true);
      expect(ids.has('app-lab-formsbuilder')).toBe(true);
      expect(ids.has('app-lab-crm')).toBe(true);
    });
  });
});
