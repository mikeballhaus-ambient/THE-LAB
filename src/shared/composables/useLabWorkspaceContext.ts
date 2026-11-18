import { computed, inject, provide, ref, watch, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import { labShellUserRef } from '@/shared/auth/lab-shell-user-state';
import type { AppWorkspaceLayoutState } from '@/shared/types/app-view-layout';
import type { LabSidecarViewContext } from '@/shared/types/lab-sidecar-view-context';
import type { LabShellOverlayState } from '@/shared/types/lab-shell-overlay';
import type { UserRole } from '@/shared/types/user';
import { buildLabSidecarViewContext } from '@/shared/composables/lab-sidecar/build-lab-sidecar-view-context';

export interface LabWorkspaceContextSources {
  focusedAssistant: Ref<boolean | undefined>;
  runningAppIds: Ref<string[]>;
  activeTabId: Ref<string | null>;
  workspaceLayout: Ref<AppWorkspaceLayoutState>;
  /** Signed-in shell user (re-provided into mounted apps for permission UI). */
  user: Ref<{ role: UserRole } | null>;
  /** Foreground shell modal (Settings, Messages, …) — set from LabDashboard (rm-68.1). */
  shellOverlay: Ref<LabShellOverlayState | null>;
}

export interface LabWorkspaceContextApi {
  viewContext: ComputedRef<LabSidecarViewContext>;
  /** Role from the lab shell session (may differ from platform HTTP JWT until re-login). */
  userRole: ComputedRef<UserRole | null>;
  hostContext: Ref<Record<string, string>>;
  sidecarToolProfile: Ref<import('@/shared/types/lab-sidecar-view-context').LabSidecarToolProfile | undefined>;
  setHostContext: (patch: Record<string, string>) => void;
  clearHostContext: () => void;
  setSidecarToolProfile: (
    profile: import('@/shared/types/lab-sidecar-view-context').LabSidecarToolProfile | undefined,
  ) => void;
}

export const labWorkspaceContextApiKey: InjectionKey<LabWorkspaceContextApi> =
  Symbol('labWorkspaceContext');

let dashboardLabWorkspaceContext: LabWorkspaceContextApi | null = null;

/** Shell registers once; AppLifecycle re-provides into mounted app roots. */
export function getDashboardLabWorkspaceContext(): LabWorkspaceContextApi | null {
  return dashboardLabWorkspaceContext;
}

/**
 * Dashboard / shell: provide Sidecar view context from live workspace refs (rm-57.1.1+).
 */
export function provideLabWorkspaceContext(sources: LabWorkspaceContextSources): LabWorkspaceContextApi {
  const hostContext = ref<Record<string, string>>({});
  const sidecarToolProfile = ref<
    import('@/shared/types/lab-sidecar-view-context').LabSidecarToolProfile | undefined
  >(undefined);

  const viewContext = computed(() =>
    buildLabSidecarViewContext({
      focusedAssistant: Boolean(sources.focusedAssistant.value),
      runningAppIds: sources.runningAppIds.value,
      activeTabId: sources.activeTabId.value,
      workspaceLayout: sources.workspaceLayout.value,
      hostContext: hostContext.value,
      toolProfile: sidecarToolProfile.value,
      shellOverlay: sources.shellOverlay.value,
    }),
  );

  const userRole = computed(() => sources.user.value?.role ?? null);

  watch(
    () => sources.user.value,
    (u) => {
      if (u && labShellUserRef.value) {
        labShellUserRef.value = { ...labShellUserRef.value, role: u.role };
      }
    },
    { immediate: true },
  );

  const api: LabWorkspaceContextApi = {
    viewContext,
    userRole,
    hostContext,
    sidecarToolProfile,
    setHostContext(patch: Record<string, string>) {
      hostContext.value = { ...hostContext.value, ...patch };
    },
    clearHostContext() {
      hostContext.value = {};
    },
    setSidecarToolProfile(profile) {
      sidecarToolProfile.value = profile;
    },
  };

  provide(labWorkspaceContextApiKey, api);
  dashboardLabWorkspaceContext = api;
  return api;
}

/** Apps or shell chrome: read workspace context when provided. */
export function useLabWorkspaceContext(): LabWorkspaceContextApi | null {
  return inject(labWorkspaceContextApiKey, null);
}

/**
 * Test / story helper without Vue provide (same computed rules as production).
 */
export function createLabWorkspaceContextApi(
  sources: LabWorkspaceContextSources,
): LabWorkspaceContextApi {
  const hostContext = ref<Record<string, string>>({});
  const sidecarToolProfile = ref<
    import('@/shared/types/lab-sidecar-view-context').LabSidecarToolProfile | undefined
  >(undefined);

  const viewContext = computed(() =>
    buildLabSidecarViewContext({
      focusedAssistant: Boolean(sources.focusedAssistant.value),
      runningAppIds: sources.runningAppIds.value,
      activeTabId: sources.activeTabId.value,
      workspaceLayout: sources.workspaceLayout.value,
      hostContext: hostContext.value,
      toolProfile: sidecarToolProfile.value,
      shellOverlay: sources.shellOverlay.value,
    }),
  );

  const userRole = computed(() => sources.user.value?.role ?? null);

  return {
    viewContext,
    userRole,
    hostContext,
    sidecarToolProfile,
    setHostContext(patch: Record<string, string>) {
      hostContext.value = { ...hostContext.value, ...patch };
    },
    clearHostContext() {
      hostContext.value = {};
    },
    setSidecarToolProfile(profile) {
      sidecarToolProfile.value = profile;
    },
  };
}
