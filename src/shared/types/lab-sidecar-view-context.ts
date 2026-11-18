/**
 * Lab Sidecar — view scope for system prompts and UI automation (rm-57).
 */

import type { LabShellOverlayState } from '@/shared/types/lab-shell-overlay';

export type LabViewMode =
  | 'apps_home'
  | 'single_app'
  | 'split_apps'
  | 'lab_assistant_full';

/** Narrow MCP allowlist for Sidecar sends (rm-63 App Builder, rm-64 integrations). */
export type LabSidecarToolProfile = 'app_builder' | 'integration';

export type LabIntegrationWorkflowPhase =
  | 'discover'
  | 'bind_form'
  | 'bind_chart'
  | 'export_host'
  | 'host_shell';

export interface LabSidecarViewContext {
  viewMode: LabViewMode;
  /** When set, backend intersects persona tools with the profile allowlist. */
  toolProfile?: LabSidecarToolProfile;
  /** Registry app ids currently mounted and visible in the workspace */
  visibleAppIds: string[];
  /** Primary pane for UI automation (active tab when visible, else workspace primary) */
  focusedAppId: string | null;
  /** When {@link LabViewMode} is `split_apps`: [leading, trailing] pane order */
  splitAppIds?: [string, string];
  /** Per-app optional hints from `useLabWorkspaceContext().setHostContext()` */
  hostContext?: Record<string, string>;
  /** When true, inject integration routing + playbooks (rm-64). */
  integrationIntent?: boolean;
  /** Optional wizard phase playbook (`wizard-phase-*.md`). */
  integrationWorkflowPhase?: LabIntegrationWorkflowPhase;
  /** Quick-nav / shell modal above apps workspace (Settings, Messages, …). */
  shellOverlay?: LabShellOverlayState;
  /**
   * Registry ids with a live tab or server (includes minimized/parked).
   * When non-empty, the catalog UI is usually the compact **app launcher sidebar** rail.
   */
  workspaceRunningAppIds?: string[];
  /** Workspace layout mode when apps are open (`tabs`, `split-horizontal`, `anchored`). */
  workspaceLayoutMode?: import('@/shared/types/app-view-layout').AppWorkspaceMode;
}

export interface LabSidecarViewContextInput {
  focusedAssistant: boolean;
  runningAppIds: string[];
  activeTabId: string | null;
  workspaceLayout: import('@/shared/types/app-view-layout').AppWorkspaceLayoutState;
  hostContext?: Record<string, string>;
  toolProfile?: LabSidecarToolProfile;
  integrationIntent?: boolean;
  integrationWorkflowPhase?: LabIntegrationWorkflowPhase;
  shellOverlay?: LabShellOverlayState | null;
}

/** Wire payload on SOCKET_EVENTS.MESSAGE when the user sends from Lab Sidecar. */
export type LabSidecarChatContext = LabSidecarViewContext;

export function toLabSidecarChatContext(ctx: LabSidecarViewContext): LabSidecarChatContext {
  return {
    viewMode: ctx.viewMode,
    visibleAppIds: [...ctx.visibleAppIds],
    focusedAppId: ctx.focusedAppId,
    splitAppIds: ctx.splitAppIds ? [...ctx.splitAppIds] as [string, string] : undefined,
    hostContext: ctx.hostContext ? { ...ctx.hostContext } : undefined,
    toolProfile: ctx.toolProfile,
    integrationIntent: ctx.integrationIntent,
    integrationWorkflowPhase: ctx.integrationWorkflowPhase,
    shellOverlay: ctx.shellOverlay ? { ...ctx.shellOverlay } : undefined,
    workspaceRunningAppIds: ctx.workspaceRunningAppIds
      ? [...ctx.workspaceRunningAppIds]
      : undefined,
    workspaceLayoutMode: ctx.workspaceLayoutMode,
  };
}
