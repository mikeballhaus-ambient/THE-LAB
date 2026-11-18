<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch';
import { RuntimeApp } from '@/shared/types';
import type { AppWorkspaceLayoutState, AppWorkspaceMode } from '@/shared/types/app-view-layout';
import { computed, onUnmounted, ref, watch } from 'vue';
import { useShowDependencyApps } from '@/shared/composables/components/useShowDependencyApps';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  LAB_SHELL_MINIMIZE_ALL_APPS_ARIA,
  LAB_SHELL_MINIMIZE_APP_ARIA,
} from '@/shared/constants/lab-shell-naming';
import {
  labShellCloseAppIconAttrs,
  labShellFocusTabAttrs,
  labShellLayoutModeAttrs,
  labShellMinimizeAllAttrs,
  labShellMinimizeAppIconAttrs,
} from '@/shared/constants/lab-shell-workspace-automation';
import {
  getPaneFlexStyle,
  isAppVisibleInWorkspace,
  isSplitWorkspaceMode,
  resolveSecondaryAppId,
  resolveSplitPaneOrder,
} from '@/shared/composables/components/app-view-layout-utils';

const props = withDefaults(
  defineProps<{
    tabOrderApps: RuntimeApp[];
    activeTabId: string | null;
    tabLoadingStates: Record<string, boolean>;
    workspaceLayout: AppWorkspaceLayoutState;
    /** Running apps whose panes are parked (panes stay mounted, tabs stay hidden). */
    minimizedAppIds?: string[];
    /** Every running app is parked: collapse the workspace chrome but keep panes mounted. */
    workspaceParked?: boolean;
    handleCloseTab: (appId: string) => Promise<void>;
    /** Hide an app's pane while keeping it running (shows in the running-apps rail). */
    minimizeApp: (appId: string) => void;
    /** Hide every open app so the app catalog workspace is visible again. */
    minimizeAllApps: () => void;
    updateActiveAppTab: (appId: string) => void;
    setShowDependencyApps: (showDependencyApps: boolean) => Promise<void>;
    getShowDependencyApps: () => Promise<boolean>;
  }>(),
  {},
);

const emit = defineEmits<{
  (e: 'setWorkspaceMode', mode: AppWorkspaceMode): void;
  (e: 'updateSplitRatio', ratio: number): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const dependencyToggleId = generateUniqueId('dependency-apps-toggle');
const minimizeAllId = generateUniqueId('app-workspace-minimize-all');
const layoutTabsId = generateUniqueId('app-layout-mode-tabs');
const layoutSplitHId = generateUniqueId('app-layout-mode-split-h');
const layoutAnchoredId = generateUniqueId('app-layout-mode-anchored');

// Shared module-level flag: the rail and the shell's parked decision read the same ref, so a
// toggle flip propagates without each copy re-hydrating from the session store.
const { showDependencyApps, updateShowDependencyApps } = useShowDependencyApps(
  (value) => props.setShowDependencyApps(value),
  () => props.getShowDependencyApps(),
);

const activeTabIdRef = ref<string | null>(null);

watch(
  () => props.activeTabId,
  (newVal) => {
    activeTabIdRef.value = newVal;
  },
  { immediate: true },
);

const launchableTypes = new Set(['browser', 'hybrid', 'server']);

const allLaunchableApps = computed(() =>
  props.tabOrderApps.filter((app) => launchableTypes.has(app.type)),
);

const runningAppIds = computed(() => allLaunchableApps.value.map((a) => a.id));

const minimizedIdSet = computed(() => new Set(props.minimizedAppIds ?? []));

/** Tab buttons only — minimized apps stay mounted in `mountPaneApps` but leave the tab strip. */
const visibleTabApps = computed(() => {
  const apps = showDependencyApps.value
    ? allLaunchableApps.value
    : allLaunchableApps.value.filter(
        (app) => !app.isDependencyLaunch || app.id === props.workspaceLayout.pinnedAppId,
      );
  return apps.filter((app) => !minimizedIdSet.value.has(app.id));
});

const hasDependencyTabs = computed(() =>
  allLaunchableApps.value.some((app) => app.isDependencyLaunch === true),
);

const splitActive = computed(() => isSplitWorkspaceMode(props.workspaceLayout.mode));

const splitEligibleAppIds = computed(() => visibleTabApps.value.map((app) => app.id));

/** Split panes in leading→trailing DOM order so flex % matches gutter position */
const mountPaneApps = computed((): RuntimeApp[] => {
  const apps = allLaunchableApps.value;
  if (!splitActive.value) {
    return apps;
  }
  const pair = resolveSplitPaneOrder(
    props.workspaceLayout,
    props.activeTabId,
    runningAppIds.value,
    splitEligibleAppIds.value,
    splitEligibleAppIds.value,
  );
  if (!pair) {
    return apps;
  }
  const orderedIds = [pair.leading, pair.trailing];
  const ordered = orderedIds
    .map((id) => apps.find((a) => a.id === id))
    .filter((a): a is RuntimeApp => a != null);
  const rest = apps.filter((a) => !orderedIds.includes(a.id));
  return [...ordered, ...rest];
});

const secondaryLabel = computed(() => {
  const secId = resolveSecondaryAppId(
    props.workspaceLayout,
    props.activeTabId,
    runningAppIds.value,
    splitEligibleAppIds.value,
    splitEligibleAppIds.value,
  );
  const app = allLaunchableApps.value.find((a) => a.id === secId);
  return app?.name ?? 'Secondary';
});

function onTabClick(appId: string): void {
  activeTabIdRef.value = appId;
  props.updateActiveAppTab(appId);
}

function setMode(mode: AppWorkspaceMode): void {
  emit('setWorkspaceMode', mode);
}

/**
 * A hidden dependency app must not render a pane either.
 *
 * `visibleTabApps` already filters `isDependencyLaunch` apps when the toggle is off, but pane
 * visibility used the unfiltered running set. Minimizing the only real tab (e.g. Weather) then
 * handed the active tab to its dependency (Forms Builder), which rendered a full-screen pane
 * with no corresponding tab — looking like an app you never opened.
 */
function paneShowsDependency(app: RuntimeApp): boolean {
  return showDependencyApps.value || !app.isDependencyLaunch;
}

function paneVisible(appId: string): boolean {
  if (minimizedIdSet.value.has(appId)) {
    return false;
  }
  const app = allLaunchableApps.value.find((row) => row.id === appId);
  if (!app || !paneShowsDependency(app)) {
    return false;
  }
  return isAppVisibleInWorkspace(
    appId,
    props.workspaceLayout,
    props.activeTabId,
    runningAppIds.value,
    splitEligibleAppIds.value,
    splitEligibleAppIds.value,
  );
}

function paneFlexStyle(appId: string): Record<string, string> {
  return getPaneFlexStyle(
    appId,
    props.workspaceLayout,
    props.activeTabId,
    runningAppIds.value,
    splitEligibleAppIds.value,
    splitEligibleAppIds.value,
  );
}

function paneSurfaceClass(appId: string): string {
  const base =
    'app-workspace-pane flex flex-col min-h-0 min-w-0 max-w-full overflow-x-hidden';
  if (splitActive.value) {
    const anchored = props.workspaceLayout.mode === 'anchored';
    const isPinnedDesigner =
      anchored && appId === props.workspaceLayout.pinnedAppId;
    const isHostPane = anchored && !isPinnedDesigner && paneVisible(appId);
    const roleClass = isPinnedDesigner
      ? ' app-workspace-pane--designer'
      : isHostPane
        ? ' app-workspace-pane--host'
        : '';
    return `${base} shrink-0 overflow-x-hidden${roleClass}`;
  }
  return `${base} flex-1 w-full`;
}

function splitRatioBounds(): { min: number; max: number } {
  if (props.workspaceLayout.mode === 'anchored') {
    return { min: 50, max: 82 };
  }
  return { min: 20, max: 80 };
}

const mountRowClass = computed(() => (splitActive.value ? 'flex-row' : 'flex-col'));

watch(
  [visibleTabApps, activeTabIdRef],
  () => {
    const current = activeTabIdRef.value;
    if (!current) return;
    if (visibleTabApps.value.some((app) => app.id === current)) return;
    const first = visibleTabApps.value[0];
    if (first) onTabClick(first.id);
  },
  { deep: true },
);

const resizing = ref(false);

function onResizePointerDown(event: PointerEvent): void {
  if (!splitActive.value) return;
  const root = (event.currentTarget as HTMLElement).parentElement;
  if (!root) return;
  resizing.value = true;

  const onMove = (moveEvent: PointerEvent): void => {
    const rect = root.getBoundingClientRect();
    const ratio = ((moveEvent.clientX - rect.left) / rect.width) * 100;
    const { min, max } = splitRatioBounds();
    emit('updateSplitRatio', Math.min(max, Math.max(min, Math.round(ratio))));
  };

  const onUp = (): void => {
    resizing.value = false;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  event.preventDefault();
}

onUnmounted(() => {
  resizing.value = false;
});
</script>

<template>
  <!--
    Rendered whenever apps are open, even when every one is parked: the mounted app
    instances live inside `tab-container-*`, so removing this subtree would destroy them.
  -->
  <div
    v-if="allLaunchableApps.length > 0"
    class="app-view-layout flex flex-col flex-1 min-h-0 w-full min-w-0"
    :class="{ 'app-view-layout--parked': props.workspaceParked }"
  >
    <div v-show="!props.workspaceParked" class="lab-workspace-tabbar">
      <button
        v-for="app in visibleTabApps"
        :key="app.id"
        type="button"
        class="tab-item lab-workspace-tab"
        :class="
          activeTabIdRef === app.id ? 'lab-workspace-tab--active' : 'lab-workspace-tab--inactive'
        "
        :title="app.name"
        v-bind="labShellFocusTabAttrs(app.id, app.name)"
        @click="onTabClick(app.id)"
      >
        <i :class="app.faIcon ? app.faIcon + ' mr-2' : ''" class="fa-solid text-sm flex-shrink-0"></i>
        <span class="truncate text-sm font-semibold">{{ app.name }}</span>
        <i
          v-if="props.tabLoadingStates[app.id]"
          class="ml-2 fa fa-spinner fa-spin lab-workspace-tab-spinner"
          title="Loading..."
        ></i>
        <i
          v-if="app.hasCloseButton"
          v-bind="labShellMinimizeAppIconAttrs(app.id, app.name)"
          class="fa fa-minus lab-workspace-tab-action lab-workspace-tab-action--minimize"
          :title="LAB_SHELL_MINIMIZE_APP_ARIA"
          @click.stop="props.minimizeApp(app.id)"
        ></i>
        <i
          v-if="app.hasCloseButton"
          v-bind="labShellCloseAppIconAttrs(app.id, app.name)"
          class="fa fa-times text-red-400 hover:text-red-300 cursor-pointer flex-shrink-0 lab-workspace-tab-action"
          @click.stop="props.handleCloseTab(app.id)"
        ></i>
      </button>

      <div
        class="ml-auto flex flex-wrap items-center gap-1 px-2 py-1 shrink-0 lab-workspace-toolbar-divider"
      >
        <button
          :id="minimizeAllId"
          type="button"
          class="lab-workspace-layout-pill lab-workspace-minimize-all"
          :title="LAB_SHELL_MINIMIZE_ALL_APPS_ARIA"
          v-bind="labShellMinimizeAllAttrs()"
          @click="props.minimizeAllApps()"
        >
          <i class="fa fa-minus mr-1" aria-hidden="true"></i>
          Minimize all
        </button>
        <span class="lab-workspace-layout-label hidden sm:inline">Layout</span>
        <button
          :id="layoutTabsId"
          type="button"
          class="lab-workspace-layout-pill"
          :class="
            workspaceLayout.mode === 'tabs'
              ? 'lab-workspace-layout-pill--active'
              : 'lab-workspace-layout-pill--inactive'
          "
          title="Single app view"
          v-bind="labShellLayoutModeAttrs('layout-tabs', 'Single app view — Tabs layout')"
          :disabled="allLaunchableApps.length < 1"
          @click="setMode('tabs')"
        >
          Tabs
        </button>
        <button
          :id="layoutSplitHId"
          type="button"
          class="lab-workspace-layout-pill"
          :class="
            workspaceLayout.mode === 'split-horizontal'
              ? 'lab-workspace-layout-pill--active'
              : 'lab-workspace-layout-pill--inactive'
          "
          title="Split side by side"
          v-bind="labShellLayoutModeAttrs('layout-split-horizontal', 'Split side by side')"
          :disabled="allLaunchableApps.length < 2"
          @click="setMode('split-horizontal')"
        >
          Split ↔
        </button>
        <button
          :id="layoutAnchoredId"
          type="button"
          class="lab-workspace-layout-pill"
          :class="
            workspaceLayout.mode === 'anchored'
              ? 'lab-workspace-layout-pill--active'
              : 'lab-workspace-layout-pill--inactive'
          "
          title="Active app on the left; Forms Builder stays pinned on the right"
          v-bind="labShellLayoutModeAttrs('layout-anchored', 'Form designer layout')"
          :disabled="allLaunchableApps.length < 2"
          @click="setMode('anchored')"
        >
          Form designer
        </button>
      </div>

      <div
        v-if="hasDependencyTabs"
        class="flex items-center gap-2 px-3 py-1 shrink-0 lab-workspace-toolbar-divider"
      >
        <ToggleSwitch
          :input-id="dependencyToggleId"
          :model-value="showDependencyApps"
          @update:model-value="updateShowDependencyApps"
        />
        <label
          :for="dependencyToggleId"
          class="text-xs! lab-workspace-dependency-label whitespace-nowrap cursor-pointer"
        >
          Show Dependency Apps
        </label>
      </div>
    </div>

    <div v-if="splitActive && !props.workspaceParked" class="lab-workspace-split-hint">
      <template v-if="workspaceLayout.mode === 'anchored'">
        <span>
          Active app:
          <span class="lab-workspace-split-hint__emphasis">{{
            visibleTabApps.find((a) => a.id === activeTabIdRef)?.name ?? '—'
          }}</span>
          (left, resizable)
        </span>
        <span>
          Forms Builder:
          <span class="lab-workspace-split-hint__accent">{{ secondaryLabel }}</span>
          (pinned right)
        </span>
      </template>
      <template v-else>
        <span>Primary: {{ visibleTabApps.find((a) => a.id === activeTabIdRef)?.name ?? '—' }}</span>
        <span>Secondary: {{ secondaryLabel }}</span>
      </template>
    </div>

    <div
      class="app-workspace-mount-root flex flex-1 min-h-0 min-w-0 w-full relative"
      :class="mountRowClass"
    >
      <div
        v-for="app in mountPaneApps"
        :key="app.id"
        v-show="paneVisible(app.id)"
        :class="paneSurfaceClass(app.id)"
        :data-app-pane-app-id="app.id"
        :data-pane-role="
          workspaceLayout.mode === 'anchored' && app.id === workspaceLayout.pinnedAppId
            ? 'designer'
            : workspaceLayout.mode === 'anchored' && paneVisible(app.id)
              ? 'host'
              : undefined
        "
        :style="paneFlexStyle(app.id)"
      >
        <div
          v-if="workspaceLayout.mode === 'anchored' && app.id === workspaceLayout.pinnedAppId"
          class="lab-workspace-designer-chrome"
        >
          Forms Builder (pinned)
        </div>
        <div
          :id="`tab-container-${app.id}`"
          class="tab-app-container w-full min-w-0 flex flex-col flex-1 min-h-0"
        ></div>
      </div>

      <div
        v-if="splitActive"
        class="app-workspace-split-gutter lab-workspace-split-gutter absolute z-20 touch-none top-0 bottom-0 w-1.5 cursor-col-resize"
        :class="{ 'select-none': resizing }"
        :style="{ left: `${workspaceLayout.splitRatio}%`, transform: 'translateX(-50%)' }"
        title="Drag to resize panes"
        @pointerdown="onResizePointerDown"
      />
    </div>
  </div>
</template>

