import { describe, expect, test } from '@jest/globals';
import { ref } from 'vue';
import { buildLabSidecarViewContext } from '@/shared/composables/lab-sidecar/build-lab-sidecar-view-context';
import { createLabWorkspaceContextApi } from '@/shared/composables/useLabWorkspaceContext';
import { DEFAULT_APP_WORKSPACE_LAYOUT } from '@/shared/types/app-view-layout';

const CRM = 'app-lab-crm';
const FORMS = 'app-lab-formsbuilder';
const TASK = 'app-lab-tasklist';

describe('buildLabSidecarViewContext', () => {
  test('apps home when no running apps', () => {
    expect(
      buildLabSidecarViewContext({
        focusedAssistant: false,
        runningAppIds: [],
        activeTabId: null,
        workspaceLayout: { ...DEFAULT_APP_WORKSPACE_LAYOUT },
      }),
    ).toEqual({
      viewMode: 'apps_home',
      visibleAppIds: [],
      focusedAppId: null,
    });
  });

  test('single_app in tabs mode with active tab', () => {
    const ctx = buildLabSidecarViewContext({
      focusedAssistant: false,
      runningAppIds: [CRM, FORMS],
      activeTabId: FORMS,
      workspaceLayout: {
        ...DEFAULT_APP_WORKSPACE_LAYOUT,
        mode: 'tabs',
        primaryAppId: CRM,
      },
    });
    expect(ctx.viewMode).toBe('single_app');
    expect(ctx.visibleAppIds).toEqual([FORMS]);
    expect(ctx.focusedAppId).toBe(FORMS);
  });

  test('switching active tab updates focused app', () => {
    const layout = { ...DEFAULT_APP_WORKSPACE_LAYOUT, mode: 'tabs' as const };
    const running = [CRM, FORMS];

    const first = buildLabSidecarViewContext({
      focusedAssistant: false,
      runningAppIds: running,
      activeTabId: CRM,
      workspaceLayout: layout,
    });
    const second = buildLabSidecarViewContext({
      focusedAssistant: false,
      runningAppIds: running,
      activeTabId: FORMS,
      workspaceLayout: layout,
    });

    expect(first.focusedAppId).toBe(CRM);
    expect(second.focusedAppId).toBe(FORMS);
  });

  test('split_apps in split-horizontal with two panes', () => {
    const ctx = buildLabSidecarViewContext({
      focusedAssistant: false,
      runningAppIds: [CRM, FORMS],
      activeTabId: FORMS,
      workspaceLayout: {
        mode: 'split-horizontal',
        primaryAppId: CRM,
        secondaryAppId: FORMS,
        pinnedAppId: null,
        splitRatio: 50,
      },
    });
    expect(ctx.viewMode).toBe('split_apps');
    expect(ctx.visibleAppIds).toEqual(expect.arrayContaining([CRM, FORMS]));
    expect(ctx.splitAppIds).toEqual([CRM, FORMS]);
    expect(ctx.focusedAppId).toBe(FORMS);
  });

  test('anchored mode exposes pinned and host panes', () => {
    const ctx = buildLabSidecarViewContext({
      focusedAssistant: false,
      runningAppIds: [FORMS, CRM],
      activeTabId: CRM,
      workspaceLayout: {
        mode: 'anchored',
        primaryAppId: CRM,
        secondaryAppId: FORMS,
        pinnedAppId: FORMS,
        splitRatio: 62,
      },
    });
    expect(ctx.viewMode).toBe('split_apps');
    expect(ctx.splitAppIds).toEqual([CRM, FORMS]);
    expect(ctx.focusedAppId).toBe(CRM);
  });

  test('lab_assistant_full when assistant view focused', () => {
    const ctx = buildLabSidecarViewContext({
      focusedAssistant: true,
      runningAppIds: [CRM],
      activeTabId: CRM,
      workspaceLayout: { ...DEFAULT_APP_WORKSPACE_LAYOUT, mode: 'tabs' },
    });
    expect(ctx.viewMode).toBe('lab_assistant_full');
    expect(ctx.visibleAppIds).toEqual([CRM]);
    expect(ctx.focusedAppId).toBe(CRM);
  });

  test('includes shell overlay when settings modal open', () => {
    const ctx = buildLabSidecarViewContext({
      focusedAssistant: false,
      runningAppIds: [],
      activeTabId: null,
      workspaceLayout: { ...DEFAULT_APP_WORKSPACE_LAYOUT },
      shellOverlay: {
        kind: 'settings',
        settingsTabId: 'themes',
      },
    });
    expect(ctx.shellOverlay).toEqual({
      kind: 'settings',
      settingsTabId: 'themes',
    });
  });

  test('omits shell overlay when Laboratory focused', () => {
    const ctx = buildLabSidecarViewContext({
      focusedAssistant: true,
      runningAppIds: [CRM],
      activeTabId: CRM,
      workspaceLayout: { ...DEFAULT_APP_WORKSPACE_LAYOUT, mode: 'tabs' },
      shellOverlay: { kind: 'settings', settingsTabId: 'api' },
    });
    expect(ctx.shellOverlay).toBeUndefined();
  });

  test('merges hostContext from app host', () => {
    const ctx = buildLabSidecarViewContext({
      focusedAssistant: false,
      runningAppIds: [CRM],
      activeTabId: CRM,
      workspaceLayout: { ...DEFAULT_APP_WORKSPACE_LAYOUT, mode: 'tabs' },
      hostContext: { entityId: 'acct-1', route: 'records' },
    });
    expect(ctx.hostContext).toEqual({ entityId: 'acct-1', route: 'records' });
  });
});

describe('useLabWorkspaceContext (createLabWorkspaceContextApi)', () => {
  test('reacts when active tab ref changes', () => {
    const focusedAssistant = ref(false);
    const runningAppIds = ref([CRM, TASK]);
    const activeTabId = ref<string | null>(CRM);
    const workspaceLayout = ref({ ...DEFAULT_APP_WORKSPACE_LAYOUT, mode: 'tabs' as const });

    const api = createLabWorkspaceContextApi({
      focusedAssistant,
      runningAppIds,
      activeTabId,
      workspaceLayout,
      user: ref(null),
      shellOverlay: ref(null),
    });

    expect(api.viewContext.value.focusedAppId).toBe(CRM);

    activeTabId.value = TASK;
    expect(api.viewContext.value.focusedAppId).toBe(TASK);
    expect(api.viewContext.value.viewMode).toBe('single_app');
  });

  test('setHostContext patches host hints', () => {
    const api = createLabWorkspaceContextApi({
      focusedAssistant: ref(false),
      runningAppIds: ref([CRM]),
      activeTabId: ref(CRM),
      workspaceLayout: ref({ ...DEFAULT_APP_WORKSPACE_LAYOUT, mode: 'tabs' }),
      user: ref(null),
      shellOverlay: ref(null),
    });

    api.setHostContext({ recordId: '42' });
    expect(api.viewContext.value.hostContext).toEqual({ recordId: '42' });

    api.clearHostContext();
    expect(api.viewContext.value.hostContext).toBeUndefined();
  });
});
