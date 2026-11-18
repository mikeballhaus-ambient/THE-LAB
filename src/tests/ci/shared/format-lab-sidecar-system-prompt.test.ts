import { describe, expect, test } from '@jest/globals';
import { formatLabSidecarSystemPromptAppendix } from '@/shared/composables/lab-sidecar/format-lab-sidecar-system-prompt';

describe('formatLabSidecarSystemPromptAppendix', () => {
  test('includes view mode and focused app', () => {
    const block = formatLabSidecarSystemPromptAppendix(
      {
        viewMode: 'single_app',
        visibleAppIds: ['app-lab-crm'],
        focusedAppId: 'app-lab-crm',
      },
      { 'app-lab-crm': 'CRM agent rules here' },
    );
    expect(block).toContain('LAB SIDECAR VIEW CONTEXT');
    expect(block).toContain('Single app focused');
    expect(block).toContain('app-lab-crm');
    expect(block).toContain('CRM agent rules here');
    expect(block).toContain('UI automation default target');
  });

  test('includes split panes and host context', () => {
    const block = formatLabSidecarSystemPromptAppendix({
      viewMode: 'split_apps',
      visibleAppIds: ['app-lab-crm', 'app-lab-formsbuilder'],
      focusedAppId: 'app-lab-formsbuilder',
      splitAppIds: ['app-lab-crm', 'app-lab-formsbuilder'],
      hostContext: { formId: 'f-1' },
    });
    expect(block).toContain('Split panes');
    expect(block).toContain('formId');
  });

  test('quarks overlay includes close-wallet discover guidance', () => {
    const block = formatLabSidecarSystemPromptAppendix({
      viewMode: 'apps_home',
      visibleAppIds: [],
      focusedAppId: null,
      shellOverlay: { kind: 'quarks' },
    });
    expect(block).toContain('lab-quarks-wallet-dialog');
    expect(block).toContain('close-quarks-wallet');
    expect(block).toContain('ui_automation_discover_elements');
    expect(block).toContain('pcclosebutton');
  });

  test('settings overlay includes Settings guidance and suppresses catalog launch block', () => {
    const block = formatLabSidecarSystemPromptAppendix({
      viewMode: 'apps_home',
      visibleAppIds: [],
      focusedAppId: null,
      shellOverlay: {
        kind: 'settings',
        settingsTabId: 'themes',
      },
    });
    expect(block).toContain('Shell overlay (foreground)');
    expect(block).toContain('Lab shell — Settings');
    expect(block).toContain('themes');
    expect(block).not.toContain('Apps catalog — launch');
  });

  test('single_app with running workspace prioritizes in-app automation over catalog launch', () => {
    const block = formatLabSidecarSystemPromptAppendix(
      {
        viewMode: 'single_app',
        visibleAppIds: ['app-lab-workflow-studio'],
        focusedAppId: 'app-lab-workflow-studio',
        workspaceRunningAppIds: ['app-lab-workflow-studio'],
      },
      { 'app-lab-workflow-studio': 'Workflow rules' },
      [
        {
          id: 'app-lab-workflow-studio',
          name: 'Workflow Studio',
          description: 'Workflows',
          type: 'browser',
          categories: ['Platform'],
        },
      ],
    );
    expect(block).toContain('In-app UI automation (workspace already open)');
    expect(block).toContain('never');
    expect(block).toContain('launch');
    expect(block).toContain('app-lab-workflow-studio');
    expect(block).toContain('Apps catalog — launch / open **additional** apps');
    expect(block).toContain('Skip this section');
    expect(block).toContain('lab-app-catalog-sidebar');
    expect(block).toContain('full registry');
  });

  test('apps_home includes catalog launch ui automation guidance', () => {
    const block = formatLabSidecarSystemPromptAppendix(
      {
        viewMode: 'apps_home',
        visibleAppIds: [],
        focusedAppId: null,
      },
      {},
      [
        {
          id: 'app-lab-workflow-studio',
          name: 'Workflow Studio',
          description: 'Workflows',
          type: 'browser',
          categories: ['Platform'],
        },
      ],
    );
    expect(block).toContain('Apps catalog — launch');
    expect(block).toContain('ui_automation_discover_elements');
    expect(block).toContain('app-lab-workflow-studio');
    expect(block).toContain('elementRef');
    expect(block).toContain('30 seconds');
    expect(block).toContain('tab-container');
    expect(block).toContain('app-list-container');
    expect(block).toContain('catalog-launch');
    expect(block).toContain('full registry');
    expect(block).toContain('Workflow Studio');
    expect(block).toContain('pin / favorite');
    expect(block).toContain('catalog-pin');
    expect(block).toContain('toggle-pin');
    expect(block).toContain('catalog-edit-tags');
    expect(block).toContain('catalog-tag-filter');
    expect(block).toContain('lab-app-catalog-tags-dialog');
  });
});
