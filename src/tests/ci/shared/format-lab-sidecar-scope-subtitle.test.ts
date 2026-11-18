import { describe, expect, test } from '@jest/globals';
import { formatLabSidecarScopeSubtitle } from '@/shared/composables/lab-sidecar/format-lab-sidecar-scope-subtitle';
import type { LabSidecarViewContext } from '@/shared/types/lab-sidecar-view-context';
import type { RuntimeApp } from '@/shared/types';

const apps = [
  { id: 'app-lab-crm', name: 'CRM' },
  { id: 'app-lab-formsbuilder', name: 'Forms Builder' },
] as RuntimeApp[];

describe('formatLabSidecarScopeSubtitle', () => {
  test('single_app uses focused app display name', () => {
    const ctx: LabSidecarViewContext = {
      viewMode: 'single_app',
      visibleAppIds: ['app-lab-formsbuilder'],
      focusedAppId: 'app-lab-formsbuilder',
    };
    expect(formatLabSidecarScopeSubtitle(ctx, apps)).toBe('Forms Builder');
  });

  test('split_apps lists both app names', () => {
    const ctx: LabSidecarViewContext = {
      viewMode: 'split_apps',
      visibleAppIds: ['app-lab-crm', 'app-lab-formsbuilder'],
      focusedAppId: 'app-lab-crm',
      splitAppIds: ['app-lab-crm', 'app-lab-formsbuilder'],
    };
    expect(formatLabSidecarScopeSubtitle(ctx, apps)).toBe('CRM · Forms Builder');
  });

  test('shell overlay settings subtitle', () => {
    const ctx: LabSidecarViewContext = {
      viewMode: 'apps_home',
      visibleAppIds: [],
      focusedAppId: null,
      shellOverlay: { kind: 'settings', settingsTabId: 'themes' },
    };
    expect(formatLabSidecarScopeSubtitle(ctx, apps)).toBe('Settings · Themes');
  });

  test('apps home unchanged', () => {
    const ctx: LabSidecarViewContext = {
      viewMode: 'apps_home',
      visibleAppIds: [],
      focusedAppId: null,
    };
    expect(formatLabSidecarScopeSubtitle(ctx, apps)).toBe('Apps home');
  });
});
