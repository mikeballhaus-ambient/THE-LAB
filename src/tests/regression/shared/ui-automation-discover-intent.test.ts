import { describe, expect, test } from '@jest/globals';
import { resolveUiAutomationDiscoverIntent } from '@/shared/utils/ui-automation-discover-intent';

describe('resolveUiAutomationDiscoverIntent', () => {
  test('workspace tab bar', () => {
    expect(resolveUiAutomationDiscoverIntent('lab-workflow-studio-app lab-workspace-tabbar')).toBe(
      'workspace',
    );
  });

  test('catalog launch funnel for apps home', () => {
    expect(resolveUiAutomationDiscoverIntent('app-list-container')).toBe('catalog-launch');
  });

  test('catalog launch when compact sidebar with apps open', () => {
    expect(resolveUiAutomationDiscoverIntent('lab-app-catalog-sidebar')).toBe('catalog-launch');
  });

  test('catalog chrome for collapsed launcher rail', () => {
    expect(resolveUiAutomationDiscoverIntent('lab-catalog-sidebar-rail')).toBe('catalog-chrome');
  });

  test('catalog chrome for running apps rail', () => {
    expect(resolveUiAutomationDiscoverIntent('lab-running-apps-rail-shell')).toBe('catalog-chrome');
  });

  test('in-app default', () => {
    expect(resolveUiAutomationDiscoverIntent('lab-workflow-studio-app')).toBe('default');
  });
});
