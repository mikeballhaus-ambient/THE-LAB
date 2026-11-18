import { describe, expect, test } from '@jest/globals';
import {
  clampSplitRatio,
  getMountHostStyle,
  getPaneFlexStyle,
  isWorkspaceFullyMinimized,
  layoutAfterAppLaunch,
  layoutForModeChange,
  layoutForSplitTabClick,
  pickSplitSecondaryAppId,
  resolveSplitEligibleAppIdsFromApps,
  resolveActiveWorkspaceAppIds,
  resolveLayoutAfterCloseApp,
  resolveLayoutWithMinimizedApps,
  resolveNextActiveAfterMinimize,
  resolveRestoredAppId,
  resolveSplitPaneOrder,
  normalizeAppViewLayoutPersistence,
  sanitizeAppWorkspaceLayout,
} from '@/shared/composables/components/app-view-layout-utils';
import { DEFAULT_APP_WORKSPACE_LAYOUT } from '@/shared/types/app-view-layout';

describe('app-view-layout-utils', () => {
  test('normalizeAppViewLayoutPersistence reads ratio-only Dexie shape', () => {
    expect(
      normalizeAppViewLayoutPersistence({ splitHorizontalRatio: 40, anchoredSplitRatio: 70 }),
    ).toEqual({ splitHorizontalRatio: 40, anchoredSplitRatio: 70 });
  });

  test('normalizeAppViewLayoutPersistence migrates legacy full layout', () => {
    expect(
      normalizeAppViewLayoutPersistence({
        mode: 'anchored',
        splitRatio: 55,
        primaryAppId: 'app-lab-crm',
      }),
    ).toEqual({ splitHorizontalRatio: 45, anchoredSplitRatio: 55 });
  });

  test('clampSplitRatio bounds', () => {
    expect(clampSplitRatio(10)).toBe(20);
    expect(clampSplitRatio(90)).toBe(80);
    expect(clampSplitRatio(50)).toBe(50);
  });

  test('sanitize migrates legacy split-vertical to split-horizontal', () => {
    const result = sanitizeAppWorkspaceLayout(
      { mode: 'split-vertical' as never, primaryAppId: 'a', secondaryAppId: 'b' },
      ['a', 'b'],
    );
    expect(result.mode).toBe('split-horizontal');
  });

  test('sanitize drops split when fewer than 2 apps', () => {
    const result = sanitizeAppWorkspaceLayout(
      { mode: 'split-horizontal', primaryAppId: 'a', secondaryAppId: 'b' },
      ['a'],
    );
    expect(result.mode).toBe('tabs');
  });

  test('getMountHostStyle tabs shows only active', () => {
    const layout = { ...DEFAULT_APP_WORKSPACE_LAYOUT, mode: 'tabs' as const };
    expect(getMountHostStyle('a', layout, 'a', ['a', 'b']).display).not.toBe('none');
    expect(getMountHostStyle('b', layout, 'a', ['a', 'b']).display).toBe('none');
  });

  test('resolveLayoutAfterCloseApp clears secondary', () => {
    const layout = {
      ...DEFAULT_APP_WORKSPACE_LAYOUT,
      mode: 'split-horizontal' as const,
      primaryAppId: 'a',
      secondaryAppId: 'b',
    };
    const next = resolveLayoutAfterCloseApp(layout, 'b', ['a'], 'a');
    expect(next.secondaryAppId).toBeNull();
  });

  test('getPaneFlexStyle splitRatio applies to leading pane in tab order', () => {
    const tabOrder = ['app-lab-formsbuilder', 'app-lab-crm'];
    const layout = {
      ...DEFAULT_APP_WORKSPACE_LAYOUT,
      mode: 'split-horizontal' as const,
      primaryAppId: 'app-lab-crm',
      secondaryAppId: 'app-lab-formsbuilder',
      splitRatio: 35,
    };
    const leading = getPaneFlexStyle('app-lab-formsbuilder', layout, 'app-lab-crm', tabOrder);
    const trailing = getPaneFlexStyle('app-lab-crm', layout, 'app-lab-crm', tabOrder);
    expect(leading.flex).toBe('0 0 35%');
    expect(trailing.flex).toBe('0 0 65%');
    expect(leading.maxWidth).toBe('35%');
  });

  test('layoutForModeChange split picks visible tab, not hidden dependency', () => {
    const running = ['app-chart-builder', 'app-weather', 'app-expense'];
    const eligible = ['app-weather', 'app-expense'];
    const next = layoutForModeChange(
      'split-horizontal',
      DEFAULT_APP_WORKSPACE_LAYOUT,
      'app-weather',
      running,
      { splitHorizontalRatio: 55, anchoredSplitRatio: 62 },
      eligible,
      ['app-expense', 'app-weather'],
    );
    expect(next.mode).toBe('split-horizontal');
    expect(next.secondaryAppId).toBe('app-expense');
    expect(next.secondaryAppId).not.toBe('app-chart-builder');
  });

  test('sanitize remaps secondary when dependency is hidden from split', () => {
    const layout = {
      ...DEFAULT_APP_WORKSPACE_LAYOUT,
      mode: 'split-horizontal' as const,
      primaryAppId: 'app-weather',
      secondaryAppId: 'app-chart-builder',
    };
    const next = sanitizeAppWorkspaceLayout(
      layout,
      ['app-chart-builder', 'app-weather', 'app-expense'],
      ['app-weather', 'app-expense'],
      ['app-expense', 'app-weather'],
    );
    expect(next.secondaryAppId).toBe('app-expense');
  });

  test('resolveSplitEligibleAppIdsFromApps drops hidden dependency launches', () => {
    const eligible = resolveSplitEligibleAppIdsFromApps(
      [
        { id: 'app-chart-builder', type: 'hybrid', isDependencyLaunch: true },
        { id: 'app-weather', type: 'hybrid' },
        { id: 'app-expense', type: 'hybrid' },
      ],
      { showDependencyApps: false, minimizedAppIds: [] },
    );
    expect(eligible).toEqual(['app-weather', 'app-expense']);
  });

  test('pickSplitSecondaryAppId prefers neighbouring visible tab', () => {
    expect(
      pickSplitSecondaryAppId('app-weather', ['app-weather', 'app-expense'], [
        'app-expense',
        'app-weather',
      ]),
    ).toBe('app-expense');
  });

  test('layoutForModeChange anchored pins forms builder', () => {
    const next = layoutForModeChange(
      'anchored',
      DEFAULT_APP_WORKSPACE_LAYOUT,
      'app-lab-tasklist',
      ['app-lab-tasklist', 'app-lab-formsbuilder'],
    );
    expect(next.mode).toBe('anchored');
    expect(next.pinnedAppId).toBe('app-lab-formsbuilder');
    expect(next.splitRatio).toBe(62);
  });

  test('layoutForSplitTabClick keeps secondary when selecting a background tab', () => {
    const layout = {
      ...DEFAULT_APP_WORKSPACE_LAYOUT,
      mode: 'split-horizontal' as const,
      primaryAppId: 'app-lab-crm',
      secondaryAppId: 'app-lab-formsbuilder',
    };
    const three = ['app-lab-formsbuilder', 'app-lab-crm', 'app-lab-tasklist'];
    const next = layoutForSplitTabClick(layout, 'app-lab-tasklist', 'app-lab-crm', three);
    expect(next.primaryAppId).toBe('app-lab-tasklist');
    expect(next.secondaryAppId).toBe('app-lab-formsbuilder');
    const backToCrm = layoutForSplitTabClick(next, 'app-lab-crm', 'app-lab-tasklist', three);
    expect(backToCrm.primaryAppId).toBe('app-lab-crm');
    expect(backToCrm.secondaryAppId).toBe('app-lab-formsbuilder');
  });

  test('layoutForSplitTabClick swaps when clicking secondary tab', () => {
    const layout = {
      ...DEFAULT_APP_WORKSPACE_LAYOUT,
      mode: 'split-horizontal' as const,
      primaryAppId: 'app-lab-crm',
      secondaryAppId: 'app-lab-formsbuilder',
    };
    const ids = ['app-lab-formsbuilder', 'app-lab-crm'];
    const next = layoutForSplitTabClick(layout, 'app-lab-formsbuilder', 'app-lab-crm', ids);
    expect(next.primaryAppId).toBe('app-lab-formsbuilder');
    expect(next.secondaryAppId).toBe('app-lab-crm');
  });

  test('layoutAfterAppLaunch preserves split pair when a third app starts', () => {
    const layout = {
      ...DEFAULT_APP_WORKSPACE_LAYOUT,
      mode: 'split-horizontal' as const,
      primaryAppId: 'app-lab-crm',
      secondaryAppId: 'app-lab-formsbuilder',
    };
    const three = ['app-lab-formsbuilder', 'app-lab-crm', 'app-lab-tasklist'];
    const next = layoutAfterAppLaunch(layout, 'app-lab-tasklist', three);
    expect(next.primaryAppId).toBe('app-lab-crm');
    expect(next.secondaryAppId).toBe('app-lab-formsbuilder');
  });

  test('resolveSplitPaneOrder anchored puts host leading and designer trailing', () => {
    const tabOrder = ['app-lab-formsbuilder', 'app-lab-crm'];
    const layout = {
      ...DEFAULT_APP_WORKSPACE_LAYOUT,
      mode: 'anchored' as const,
      primaryAppId: 'app-lab-crm',
      pinnedAppId: 'app-lab-formsbuilder',
      splitRatio: 62,
    };
    const order = resolveSplitPaneOrder(layout, 'app-lab-crm', tabOrder);
    expect(order).toEqual({ leading: 'app-lab-crm', trailing: 'app-lab-formsbuilder' });
    const hostPane = getPaneFlexStyle('app-lab-crm', layout, 'app-lab-crm', tabOrder);
    expect(hostPane.flex).toBe('0 0 62%');
  });

  test('resolveActiveWorkspaceAppIds drops minimized apps', () => {
    expect(resolveActiveWorkspaceAppIds(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
    expect(resolveActiveWorkspaceAppIds(['a', 'b'], [])).toEqual(['a', 'b']);
  });

  test('isWorkspaceFullyMinimized only when every running app is minimized', () => {
    expect(isWorkspaceFullyMinimized(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(isWorkspaceFullyMinimized(['a', 'b'], ['a'])).toBe(false);
    expect(isWorkspaceFullyMinimized([], [])).toBe(false);
  });

  test('resolveLayoutWithMinimizedApps clears minimized selection and split mode', () => {
    const layout = {
      ...DEFAULT_APP_WORKSPACE_LAYOUT,
      mode: 'split-horizontal' as const,
      primaryAppId: 'a',
      secondaryAppId: 'b',
      splitRatio: 40,
    };
    const active = resolveActiveWorkspaceAppIds(['a', 'b'], ['b']);
    const next = resolveLayoutWithMinimizedApps(layout, active);
    expect(next.mode).toBe('tabs');
    expect(next.primaryAppId).toBe('a');
    expect(next.secondaryAppId).toBeNull();
  });

  test('resolveLayoutWithMinimizedApps clears all ids when nothing is active', () => {
    const layout = {
      ...DEFAULT_APP_WORKSPACE_LAYOUT,
      mode: 'split-horizontal' as const,
      primaryAppId: 'a',
      secondaryAppId: 'b',
    };
    const next = resolveLayoutWithMinimizedApps(layout, []);
    expect(next.primaryAppId).toBeNull();
    expect(next.secondaryAppId).toBeNull();
    expect(next.pinnedAppId).toBeNull();
  });

  test('resolveRestoredAppId prefers the requested app', () => {
    expect(resolveRestoredAppId('b', ['a', 'b'])).toBe('b');
    expect(resolveRestoredAppId('z', ['a', 'b'])).toBe('a');
    expect(resolveRestoredAppId(null, ['a'])).toBe('a');
    expect(resolveRestoredAppId('a', [])).toBeNull();
  });

  test('resolveNextActiveAfterMinimize picks the neighbouring visible tab', () => {
    const tabOrder = ['a', 'b', 'c'];
    expect(resolveNextActiveAfterMinimize('b', tabOrder, ['a', 'b', 'c'], [])).toBe('c');
    expect(resolveNextActiveAfterMinimize('c', tabOrder, ['a', 'b', 'c'], [])).toBe('a');
    expect(resolveNextActiveAfterMinimize('a', tabOrder, ['a', 'b'], ['b'])).toBeNull();
  });
});
