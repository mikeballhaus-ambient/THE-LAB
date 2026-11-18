import {
  isAppVisibleInWorkspace,
  isSplitWorkspaceMode,
  resolvePrimaryAppId,
  resolveSplitPaneOrder,
} from '@/shared/composables/components/app-view-layout-utils';
import type {
  LabSidecarViewContext,
  LabSidecarViewContextInput,
} from '@/shared/types/lab-sidecar-view-context';

function visibleRunningAppIds(input: LabSidecarViewContextInput): string[] {
  const { runningAppIds, workspaceLayout, activeTabId } = input;
  return runningAppIds.filter((id) =>
    isAppVisibleInWorkspace(id, workspaceLayout, activeTabId, runningAppIds),
  );
}

function resolveFocusedAppId(
  input: LabSidecarViewContextInput,
  visibleAppIds: string[],
): string | null {
  const { activeTabId, workspaceLayout } = input;
  if (activeTabId && visibleAppIds.includes(activeTabId)) {
    return activeTabId;
  }
  const primary = resolvePrimaryAppId(workspaceLayout, activeTabId);
  if (primary && visibleAppIds.includes(primary)) {
    return primary;
  }
  return visibleAppIds[0] ?? null;
}

/**
 * Derives Sidecar scope from lab shell workspace state (pure — safe for unit tests).
 */
export function buildLabSidecarViewContext(
  input: LabSidecarViewContextInput,
): LabSidecarViewContext {
  const hostContext =
    input.hostContext && Object.keys(input.hostContext).length > 0
      ? { ...input.hostContext }
      : undefined;

  const toolProfile = input.toolProfile;
  const integrationMeta = {
    integrationIntent: input.integrationIntent,
    integrationWorkflowPhase: input.integrationWorkflowPhase,
  };

  const shellOverlay =
    !input.focusedAssistant && input.shellOverlay
      ? { ...input.shellOverlay }
      : undefined;

  const workspaceRunningAppIds =
    input.runningAppIds.length > 0 ? [...input.runningAppIds] : undefined;

  const workspaceLayoutMode =
    input.runningAppIds.length > 0 ? input.workspaceLayout.mode : undefined;

  if (input.focusedAssistant) {
    return {
      viewMode: 'lab_assistant_full',
      visibleAppIds: [...input.runningAppIds],
      focusedAppId: resolveFocusedAppId(input, input.runningAppIds),
      workspaceRunningAppIds,
      workspaceLayoutMode,
      hostContext,
      toolProfile,
      ...integrationMeta,
    };
  }

  if (input.runningAppIds.length === 0) {
    return {
      viewMode: 'apps_home',
      visibleAppIds: [],
      focusedAppId: null,
      hostContext,
      toolProfile,
      shellOverlay,
      ...integrationMeta,
    };
  }

  const visibleAppIds = visibleRunningAppIds(input);

  if (visibleAppIds.length === 0) {
    return {
      viewMode: 'apps_home',
      visibleAppIds: [],
      focusedAppId: null,
      workspaceRunningAppIds,
      workspaceLayoutMode,
      hostContext,
      toolProfile,
      shellOverlay,
      ...integrationMeta,
    };
  }

  const split =
    isSplitWorkspaceMode(input.workspaceLayout.mode) && visibleAppIds.length >= 2
      ? resolveSplitPaneOrder(
          input.workspaceLayout,
          input.activeTabId,
          input.runningAppIds,
        )
      : null;

  if (split && visibleAppIds.includes(split.leading) && visibleAppIds.includes(split.trailing)) {
    return {
      viewMode: 'split_apps',
      visibleAppIds,
      focusedAppId: resolveFocusedAppId(input, visibleAppIds),
      splitAppIds: [split.leading, split.trailing],
      workspaceRunningAppIds,
      workspaceLayoutMode,
      hostContext,
      toolProfile,
      shellOverlay,
      ...integrationMeta,
    };
  }

  return {
    viewMode: 'single_app',
    visibleAppIds,
    focusedAppId: resolveFocusedAppId(input, visibleAppIds),
    workspaceRunningAppIds,
    workspaceLayoutMode,
    hostContext,
    toolProfile,
    shellOverlay,
    ...integrationMeta,
  };
}
