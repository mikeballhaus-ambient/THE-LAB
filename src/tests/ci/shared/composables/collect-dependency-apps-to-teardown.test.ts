import { describe, expect, test } from '@jest/globals';
import type { RuntimeApp } from '@/shared/types';
import {
  collectDependencyAppsToTeardown,
  resolveNextActiveTabId,
} from '@/shared/composables/components/lab-dashboard/collect-dependency-apps-to-teardown';

function runtime(id: string, isDependencyLaunch?: boolean): RuntimeApp {
  return {
    id,
    name: id,
    description: '',
    faIcon: 'fa-box',
    order: 0,
    type: 'hybrid' as const,
    isEnabled: true,
    isServerSideEnabled: true,
    componentPath: undefined,
    version: '1.0.0',
    dependencies: [],
    optionalDependencies: [],
    catalogTagIds: [],
    metadata: { category: 'test', author: 'dev', tags: [], version: '1.0.0' },
    server: { entry: '', port: 3000 },
    isDependencyLaunch,
  };
}

const dependencyMap: Record<string, string[]> = {
  'app-lab-crm': ['app-lab-formsbuilder', 'app-lab-tasklist'],
  'app-lab-tasklist': ['app-lab-formsbuilder'],
};

describe('collectDependencyAppsToTeardown', () => {
  test('returns dependency launches not required by other running apps', () => {
    const running = [
      runtime('app-lab-formsbuilder', true),
      runtime('app-lab-tasklist', true),
      runtime('app-lab-crm', false),
    ];
    const result = collectDependencyAppsToTeardown('app-lab-crm', running, dependencyMap);
    expect(result).toEqual(['app-lab-formsbuilder', 'app-lab-tasklist']);
  });

  test('keeps shared dependency when another host still needs it', () => {
    const running = [
      runtime('app-lab-formsbuilder', true),
      runtime('app-lab-tasklist', false),
      runtime('app-lab-crm', false),
    ];
    const result = collectDependencyAppsToTeardown('app-lab-crm', running, dependencyMap);
    expect(result).toEqual([]);
  });

  test('skips dependencies opened directly by the user', () => {
    const running = [runtime('app-lab-formsbuilder', false), runtime('app-lab-crm', false)];
    const result = collectDependencyAppsToTeardown('app-lab-crm', running, dependencyMap);
    expect(result).toEqual([]);
  });
});

describe('resolveNextActiveTabId', () => {
  test('prefers a non-dependency app', () => {
    expect(
      resolveNextActiveTabId([
        runtime('app-lab-formsbuilder', true),
        runtime('app-lab-crm', false),
      ]),
    ).toBe('app-lab-crm');
  });
});
