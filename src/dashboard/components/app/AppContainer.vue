<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch, useTemplateRef } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import AppCard from './AppCard.vue';
// AppCatalogGridSection removed per rework round 02 — grid now inlined in AppContainer
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import ToggleSwitch from 'primevue/toggleswitch';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { RuntimeApp, User } from '../../../shared/types';
import type { IApp } from '../../../shared/types/app/App';
import { useShowServerApps } from '@/shared/composables/components/useShowServerApps';
import { useShowDependencyAppsState } from '@/shared/composables/components/useShowDependencyApps';
import { fetchPlatformAppTags } from '@/shared/services/platform-app-tags.client';
import type { PlatformAppTag } from '../../../shared/types/platform-app-tags';
import { useAppCatalog } from '@/shared/composables/catalog/useAppCatalog';
import { useAppPins } from '@/shared/composables/catalog/useAppPins';
import { useAppCatalogSidebarFixedInsets } from '@/shared/composables/catalog/useAppCatalogSidebarFixedInsets';
import { useAppCatalogSidebarPanel } from '@/shared/composables/catalog/useAppCatalogSidebarPanel';
import { useLabRunningAppsRailPanel } from '@/shared/composables/catalog/useLabRunningAppsRailPanel';
import LabAppCatalogSidebar from './LabAppCatalogSidebar.vue';
import LabRunningAppsRail from './LabRunningAppsRail.vue';
import type { PlatformAppTagId } from '@/shared/config/platform-app-tag-catalog';
import { LAB_CATALOG_SECTION_PREVIEW_LIMIT } from '@/shared/constants/lab-catalog-ui';
import { LAB_CATALOG_FILTER_TAG_ACTION_VALUE } from '@/shared/constants/lab-shell-ui-automation';

/** Platform hero: spotlight band + compact stacked carousel cards */
const PLATFORM_HERO_PRESENTATION = 'spotlight' as const;
const PLATFORM_HERO_CARD_PRESENTATION = 'rail' as const;

/** Primary-tag chips omitted from the jump row (covered elsewhere in the catalog UI). */
const CATEGORY_NAV_EXCLUDED_TAG_IDS = new Set<PlatformAppTagId>(['platform']);

interface Props {
  apps: RuntimeApp[];
  user: User | null;
  /** True after server `USER_AUTHENTICATED` — required for platform tag API. */
  isAuthenticated: boolean;
  runningApps: RuntimeApp[];
  /** Running apps hidden from the workspace (restorable from the running-apps rail). */
  minimizedApps?: RuntimeApp[];
  /** Every running app is minimized, so the full catalog reclaims the workspace. */
  allAppsMinimized?: boolean;
  setShowServerApps: (showServerApps: boolean) => Promise<void>;
  getShowServerApps: () => Promise<boolean>;
}

const props = withDefaults(defineProps<Props>(), {
  minimizedApps: () => [],
  allAppsMinimized: false,
});
const emit = defineEmits(['launch', 'teardown', 'restore']);

const { generateUniqueId } = useUniqueElementId();
const heroCarouselPrevId = generateUniqueId('app-catalog-hero-prev');
const heroCarouselNextId = generateUniqueId('app-catalog-hero-next');
const searchInputId = generateUniqueId('app-catalog-search');
const typeFilterId = generateUniqueId('app-catalog-type-filter');
const clearFiltersBtnId = generateUniqueId('app-catalog-clear-filters');
const serverAppsToggleId = generateUniqueId('server-apps-toggle');
const heroScrollerRef = useTemplateRef<HTMLElement>('heroScroller');

const runningAppIdSet = computed(() => new Set(props.runningApps.map((a) => a.id)));

/** Catalog entries that are not open in a workspace tab (sidebar compact view). */
const catalogAppsNotRunning = computed(() =>
  props.apps.filter((app) => !runningAppIdSet.value.has(app.id)),
);

/**
 * Minimized apps are still running, but their `Close` action belongs to the running rail,
 * so the catalog card treats them as launchable (launching restores them).
 */
const catalogAppsAvailable = computed(() =>
  props.allAppsMinimized ? props.apps : catalogAppsNotRunning.value,
);


const { showServerApps, toggleShowServerApps } = useShowServerApps(
  (value) => props.setShowServerApps(value),
  () => props.getShowServerApps()
);

/** Shared flag — `AppViewLayout` owns the control; the rail only reads it. */
const { showDependencyApps } = useShowDependencyAppsState();

const emitLaunch = (id: string, appName: string) => {
  emit('launch', id, appName);
};

const emitTeardown = (id: string) => {
  emit('teardown', id);
};

const minimizedAppIdSet = computed(
  () => new Set((props.minimizedApps ?? []).map((app) => app.id)),
);

/** Parked apps read as launchable in the catalog — launching restores them. */
const isAppRunning = (id: string) => {
  if (minimizedAppIdSet.value.has(id)) {
    return false;
  }
  return props.runningApps.some((app) => app.id === id);
};

const launchableApps = computed(() => {
  const apps = catalogAppsAvailable.value;
  return showServerApps.value
    ? apps
    : apps.filter((a) => a.type === 'browser' || a.type === 'hybrid');
});

const showServerAppsRefForCatalog = computed(() => showServerApps.value);

/** Catalog composable for tag-based filtering and sections */
const catalogTags = ref<PlatformAppTag[]>([]);
const catalogTagAssignments = ref<Record<string, string[]>>({});

const categoryNavTags = computed(() =>
  catalogTags.value.filter((tag) => !CATEGORY_NAV_EXCLUDED_TAG_IDS.has(tag.id as PlatformAppTagId)),
);

/** Browse mode: show up to N apps per tag section before "Show all". */
const CATALOG_SECTION_PREVIEW = LAB_CATALOG_SECTION_PREVIEW_LIMIT;

const { pinnedAppIds, loadPins, togglePin } = useAppPins();

/** Pins load from Dexie before the socket hydrates `props.apps` — only render resolved apps. */
const pinnedCatalogApps = computed(() => {
  const byId = new Map(props.apps.map((app) => [app.id, app]));
  return pinnedAppIds.value
    .map((id) => byId.get(id))
    .filter((app): app is RuntimeApp => app != null);
});

async function loadCatalogTags(): Promise<void> {
  try {
    const payload = await fetchPlatformAppTags();
    catalogTags.value = payload.tags;
    catalogTagAssignments.value = payload.catalogTagAssignments;
  } catch (e) {
    console.warn('[AppContainer] Failed to load catalog tags', e);
  }
}

function onCatalogTagsSaved(payload: { appId: string; tagIds: string[] }): void {
  catalogTagAssignments.value = {
    ...catalogTagAssignments.value,
    [payload.appId]: [...payload.tagIds],
  };
  void loadCatalogTags();
}

function resolveAppWithCatalogTags(app: RuntimeApp): RuntimeApp {
  return {
    ...app,
    catalogTagIds:
      catalogTagAssignments.value[app.id] ??
      app.catalogTagIds ??
      [],
  };
}

const launchableAppsWithTags = computed(() =>
  launchableApps.value.map((app) => ({
    ...app,
    catalogTagIds:
      catalogTagAssignments.value[app.id] ??
      app.catalogTagIds ??
      [],
  })),
);

onMounted(async () => {
  try {
    await loadPins();
  } catch (e) {
    console.warn('[AppContainer] Failed to load pinned apps', e);
  }
});

watch(
  () => props.isAuthenticated,
  (authed) => {
    if (authed) {
      void loadCatalogTags();
    }
  },
  { immediate: true },
);

watch(
  () => props.apps,
  (apps) => {
    const next = { ...catalogTagAssignments.value };
    let changed = false;
    for (const app of apps) {
      const ids = app.catalogTagIds;
      if (!ids?.length) continue;
      const key = app.id;
      const prev = next[key];
      if (!prev || prev.join('|') !== ids.join('|')) {
        next[key] = [...ids];
        changed = true;
      }
    }
    if (changed) {
      catalogTagAssignments.value = next;
    }
  },
  { deep: true },
);

const {
  searchQuery,
  typeFilter,
  selectedTagIds,
  filteredApps,
  isFiltering,
  heroApps,
  tagSections,
  clearFilters,
} = useAppCatalog({
  apps: computed(() => launchableAppsWithTags.value as IApp[]),
  tags: catalogTags,
  showServerApps: showServerAppsRefForCatalog,
});

const filteredAppsSectionTitle = computed(() => {
  if (
    selectedTagIds.value.length === 1 &&
    !searchQuery.value.trim() &&
    typeFilter.value === 'all'
  ) {
    const tag = catalogTags.value.find((t) => t.id === selectedTagIds.value[0]);
    if (tag) return tag.label;
  }
  return 'Filtered apps';
});

/** Platform carousel already lists `isSystem` apps — omit them only from the Platform tag section grid. */
function catalogSectionBrowseApps(apps: IApp[], sectionTagId: string): IApp[] {
  if (sectionTagId === 'platform') {
    return apps.filter((app) => app.isSystem !== true);
  }
  return apps;
}

function previewAppsForSection(apps: IApp[], sectionTagId: string): IApp[] {
  return catalogSectionBrowseApps(apps, sectionTagId).slice(0, CATALOG_SECTION_PREVIEW);
}

function sectionHasMoreApps(apps: IApp[], sectionTagId: string): boolean {
  return catalogSectionBrowseApps(apps, sectionTagId).length > CATALOG_SECTION_PREVIEW;
}

function sectionBrowseAppCount(apps: IApp[], sectionTagId: string): number {
  return catalogSectionBrowseApps(apps, sectionTagId).length;
}

function scrollHeroCarousel(direction: -1 | 1): void {
  const el = heroScrollerRef.value;
  if (!el) return;
  const card = el.querySelector<HTMLElement>('.app-card-grid');
  if (!card) return;
  const styles = getComputedStyle(el);
  const gapPx = Number.parseFloat(styles.columnGap || styles.gap) || 0;
  const step = card.offsetWidth + gapPx;
  const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
  const atEnd = el.scrollLeft >= maxScroll - 4;
  const atStart = el.scrollLeft <= 4;

  if (direction === 1 && atEnd) {
    el.scrollTo({ left: 0, behavior: 'smooth' });
    return;
  }
  if (direction === -1 && atStart) {
    el.scrollTo({ left: maxScroll, behavior: 'smooth' });
    return;
  }
  el.scrollBy({ left: direction * step, behavior: 'smooth' });
}

function onCategoryNavClick(tagId: string): void {
  const isOnlyThisTag =
    selectedTagIds.value.length === 1 &&
    selectedTagIds.value[0] === tagId &&
    !searchQuery.value.trim() &&
    typeFilter.value === 'all';
  if (isOnlyThisTag) {
    clearFilters();
    return;
  }
  filterByTagOnly(tagId);
}

function filterByTagOnly(tagId: string): void {
  selectedTagIds.value = [tagId];
  searchQuery.value = '';
  typeFilter.value = 'all';
}

const runningLaunchableApps = computed(() => {
  const launchableTypes = new Set(['browser', 'hybrid', 'server']);
  const launchableAppIds = props.apps.filter((_) => launchableTypes.has(_.type)).map((_) => _.id);
  return props.runningApps.filter(
    (_) => launchableTypes.has(_.type) && launchableAppIds.includes(_.id)
  );
});

/**
 * Only apps that can actually own a pane keep the catalog in compact-sidebar mode.
 *
 * A dependency app hidden by the toggle (Forms Builder) is still "running", so counting it
 * here left the launcher stuck in sidebar mode with nothing rendered — an empty screen when
 * the sole real tab was minimized.
 */
const workspaceVisibleApps = computed(() => {
  if (showDependencyApps.value) {
    return runningLaunchableApps.value;
  }
  return runningLaunchableApps.value.filter((app) => !app.isDependencyLaunch);
});

const sidebarCatalogActive = computed(
  () => workspaceVisibleApps.value.length > 0 && !props.allAppsMinimized,
);

/**
 * Dependency apps are hidden from the workspace when "Show Dependency Apps" is off, so they
 * must not appear in the parked rail either — restoring one would surface a pane with no tab.
 */
const railApps = computed(() => {
  const minimized = props.minimizedApps ?? [];
  if (showDependencyApps.value) {
    return minimized;
  }
  return minimized.filter((app) => !app.isDependencyLaunch);
});

/** Left rail of parked apps — the counterpart of the compact launcher while apps run. */
const showRunningRail = computed(() => railApps.value.length > 0);

const hideSidebarCatalog = computed(
  () => sidebarCatalogActive.value && launchableApps.value.length === 0,
);

const catalogSidebarColumnRef = useTemplateRef<HTMLElement>('catalogSidebarColumn');
const catalogSidebarHostRef = useTemplateRef<HTMLElement>('catalogSidebarHost');
const { expanded: catalogSidebarExpanded, expand: expandCatalogSidebar, collapse: collapseCatalogSidebar } =
  useAppCatalogSidebarPanel();
const { syncInsets: syncCatalogSidebarInsets } = useAppCatalogSidebarFixedInsets(
  catalogSidebarColumnRef,
  catalogSidebarHostRef,
  sidebarCatalogActive,
);

/**
 * Catalog column sizing: the running-apps rail is an in-flow sibling, so the
 * full catalog must share the row width instead of claiming 100% and pushing
 * itself past the viewport edge.
 */
const catalogColumnClass = computed(() => {
  if (sidebarCatalogActive.value) {
    return {
      'shrink-0 app-list-container--with-running-apps': true,
      'app-list-container--catalog-collapsed': !catalogSidebarExpanded.value,
      hidden: hideSidebarCatalog.value,
    };
  }
  return {
    'flex-1 min-w-0': true,
    'w-full': !showRunningRail.value,
  };
});

/** Running-apps rail behaves like the launcher: collapsed tab that slides open. */
const {
  expanded: runningRailExpanded,
  expand: expandRunningRail,
  collapse: collapseRunningRail,
} = useLabRunningAppsRailPanel();

/**
 * Minimize/restore changes the parked set — park the rail closed each time so the
 * workspace (or catalog) owns the screen. The rail's own tab re-opens it on demand.
 */
const parkedAppIdKey = computed(() =>
  railApps.value
    .map((app) => app.id)
    .sort()
    .join('|'),
);

watch(parkedAppIdKey, () => {
  collapseRunningRail();
  // Appearing/disappearing rail shifts the catalog anchor horizontally without changing its
  // size, so re-measure explicitly — the fixed sidebar would otherwise keep its old offset.
  void nextTick(syncCatalogSidebarInsets);
});

const runningRailShellRef = useTemplateRef<HTMLElement>('runningRailShell');

function resolveRunningRailShellEl(): HTMLElement | null {
  const raw = runningRailShellRef.value;
  if (raw instanceof HTMLElement) {
    return raw;
  }
  if (raw && typeof raw === 'object' && '$el' in raw) {
    const el = (raw as { $el?: unknown }).$el;
    if (el instanceof HTMLElement) {
      return el;
    }
  }
  return null;
}

/** Rail width transitions move the fixed catalog host without resizing the anchor box. */
useResizeObserver(
  computed(() => resolveRunningRailShellEl()),
  () => {
    syncCatalogSidebarInsets();
  },
);

function scheduleCatalogSidebarInsetSync(): void {
  void nextTick(() => {
    syncCatalogSidebarInsets();
    window.setTimeout(syncCatalogSidebarInsets, 280);
  });
}

watch(runningRailExpanded, scheduleCatalogSidebarInsetSync);
watch(catalogSidebarExpanded, scheduleCatalogSidebarInsetSync);
</script>

<template>
  <div
    class="app-catalog-workspace flex min-w-0 gap-3"
    :class="sidebarCatalogActive ? 'flex-none' : 'flex-1 w-full'"
  >
    <LabRunningAppsRail
      v-if="showRunningRail"
      ref="runningRailShell"
      class="shrink-0"
      :class="{ 'lab-running-apps-rail--compact': sidebarCatalogActive }"
      :apps="railApps"
      :expanded="runningRailExpanded"
      @restore="(id) => emit('restore', id)"
      @teardown="(id) => emitTeardown(id)"
      @expand="expandRunningRail"
      @collapse="collapseRunningRail"
    />
    <div
      ref="catalogSidebarColumn"
      class="app-list-container min-w-0"
      :class="catalogColumnClass"
    >
    <header v-if="!sidebarCatalogActive" class="app-catalog-toolbar">
      <div class="app-catalog-toolbar__filters">
        <InputText
          v-model="searchQuery"
          placeholder="Search apps…"
          class="lab-catalog-search"
          :pt="{ root: { attrs: { id: searchInputId } } }"
        />
        <Select
          v-model="typeFilter"
          :options="[
            { label: 'All types', value: 'all' },
            { label: 'Browser', value: 'browser' },
            { label: 'Full-stack', value: 'hybrid' },
            { label: 'Server', value: 'server' },
          ]"
          option-label="label"
          option-value="value"
          class="lab-catalog-type-filter"
          :pt="{ root: { attrs: { id: typeFilterId } } }"
        />
        <div class="app-catalog-toolbar__server-toggle">
          <ToggleSwitch
            v-model="showServerApps"
            :inputId="serverAppsToggleId"
            @click="toggleShowServerApps"
          />
          <label :for="serverAppsToggleId" class="text-xs text-lab-general-text-muted">Show server apps</label>
        </div>
      </div>
    </header>
    <div
      v-if="sidebarCatalogActive"
      ref="catalogSidebarHost"
      class="lab-app-catalog-sidebar-host"
      :id="generateUniqueId('lab-app-catalog-sidebar-host')"
    >
      <LabAppCatalogSidebar
        :apps="launchableApps"
        :user="props.user"
        :expanded="catalogSidebarExpanded"
        :is-app-running="isAppRunning"
        @launch="(id, name) => emitLaunch(id, name)"
        @teardown="(id) => emitTeardown(id)"
        @expand="expandCatalogSidebar"
        @collapse="collapseCatalogSidebar"
      />
    </div>
    <div v-else class="app-catalog-body" :data-hero-presentation="PLATFORM_HERO_PRESENTATION">
      <div class="app-catalog-body__main">
      <!-- Hero section (only when not filtering) -->
      <section v-if="!isFiltering && heroApps.length" class="app-catalog-section app-catalog-section--hero">
        <header class="app-catalog-section__head app-catalog-hero-bar__title">
          <h2 class="app-catalog-section__title">Platform apps</h2>
          <p class="app-catalog-section__hint">Core services for your lab</p>
        </header>
        <div class="app-catalog-hero-carousel">
          <button
            type="button"
            class="app-catalog-hero-carousel__nav app-catalog-hero-carousel__nav--prev"
            :id="heroCarouselPrevId"
            aria-label="Previous platform apps"
            @click="scrollHeroCarousel(-1)"
          >
            <i class="pi pi-chevron-left" aria-hidden="true"></i>
          </button>
          <div
            ref="heroScroller"
            class="app-catalog-grid app-catalog-grid--hero app-catalog-grid--hero-carousel lab-app-catalog-scroll"
          >
            <AppCard
              v-for="app in heroApps"
              :key="app.id"
              :app="resolveAppWithCatalogTags(app as RuntimeApp)"
              :all-apps="props.apps"
              :is-running="isAppRunning(app.id)"
              view-type="grid"
              :compact-meta="true"
              :platform-hero-presentation="PLATFORM_HERO_CARD_PRESENTATION"
              :user="props.user"
              :is-pinned="pinnedAppIds.includes(app.id)"
              :on-toggle-pin="() => togglePin(app.id)"
              :catalog-tags="catalogTags"
              @launch="() => emitLaunch(app.id, app.name)"
              @teardown="() => emitTeardown(app.id)"
              @catalog-tags-saved="onCatalogTagsSaved"
            />
          </div>
          <button
            type="button"
            class="app-catalog-hero-carousel__nav app-catalog-hero-carousel__nav--next"
            :id="heroCarouselNextId"
            aria-label="Next platform apps"
            @click="scrollHeroCarousel(1)"
          >
            <i class="pi pi-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </section>

      <nav
        v-if="categoryNavTags.length || isFiltering"
        class="app-catalog-category-nav lab-catalog-tag-filters"
        role="group"
        aria-label="Filter by category"
      >
        <button
          v-for="tag in categoryNavTags"
          :key="tag.id"
          type="button"
          class="lab-catalog-tag-chip"
          :class="{ 'lab-catalog-tag-chip--active': selectedTagIds.includes(tag.id) }"
          :aria-pressed="selectedTagIds.includes(tag.id)"
          :data-lab-catalog-action="LAB_CATALOG_FILTER_TAG_ACTION_VALUE"
          :data-catalog-tag-id="tag.id"
          :aria-label="`Filter catalog by ${tag.label}`"
          :id="`app-catalog-tag-${tag.id}`"
          @click="onCategoryNavClick(tag.id)"
        >
          {{ tag.label }}
        </button>
        <button
          v-if="isFiltering"
          type="button"
          class="lab-catalog-tag-chip lab-catalog-tag-chip--clear"
          :data-lab-catalog-action="LAB_CATALOG_FILTER_TAG_ACTION_VALUE"
          aria-label="Clear catalog category filters"
          :id="clearFiltersBtnId"
          @click="clearFilters"
        >
          Clear filters
        </button>
      </nav>

      <!-- Pinned apps (browser-only, no server sync) -->
      <section v-if="!isFiltering && pinnedCatalogApps.length" class="app-catalog-section app-catalog-section--pinned">
        <header class="app-catalog-section__head">
          <h2 class="app-catalog-section__title">Pinned apps</h2>
          <p class="app-catalog-section__hint">Quick access to your favorite apps</p>
        </header>
        <div class="app-catalog-grid app-catalog-grid--hero">
          <AppCard
            v-for="app in pinnedCatalogApps"
            :key="app.id"
            :app="resolveAppWithCatalogTags(app)"
            :all-apps="props.apps"
            :is-running="isAppRunning(app.id)"
            view-type="grid"
            :compact-meta="true"
            :user="props.user"
            :is-pinned="pinnedAppIds.includes(app.id)"
            :on-toggle-pin="() => togglePin(app.id)"
            :catalog-tags="catalogTags"
            @launch="() => emitLaunch(app.id, app.name)"
            @teardown="() => emitTeardown(app.id)"
            @catalog-tags-saved="onCatalogTagsSaved"
          />
        </div>
      </section>

      <div v-if="!isFiltering" class="app-catalog-sections-grid">
        <section
          v-for="section in tagSections"
          v-show="sectionBrowseAppCount(section.apps, section.tag.id) > 0"
          :key="section.tag.id"
          :id="`app-catalog-section-tag-${section.tag.id}`"
          class="app-catalog-section app-catalog-section--tag-group app-catalog-section--tag-group--wide"
        >
            <header class="app-catalog-section__head">
              <h2 class="app-catalog-section__title">
                {{ section.tag.label }}
                <span class="app-catalog-section__count" aria-hidden="true">({{ sectionBrowseAppCount(section.apps, section.tag.id) }})</span>
              </h2>
              <p v-if="section.tag.description" class="app-catalog-section__hint">{{ section.tag.description }}</p>
            </header>
            <div class="app-catalog-grid app-catalog-grid--browse">
              <AppCard
                v-for="app in previewAppsForSection(section.apps, section.tag.id)"
                :key="app.id"
                :app="resolveAppWithCatalogTags(app as RuntimeApp)"
                :all-apps="props.apps"
                :is-running="isAppRunning(app.id)"
                view-type="grid"
                :user="props.user"
                :is-pinned="pinnedAppIds.includes(app.id)"
                :on-toggle-pin="() => togglePin(app.id)"
                :catalog-tags="catalogTags"
                @launch="() => emitLaunch(app.id, app.name)"
                @teardown="() => emitTeardown(app.id)"
                @catalog-tags-saved="onCatalogTagsSaved"
              />
            </div>
            <button
              v-if="sectionHasMoreApps(section.apps, section.tag.id)"
              type="button"
              class="lab-catalog-section-more"
              @click="filterByTagOnly(section.tag.id)"
            >
              Show all {{ section.tag.label }} apps ({{ sectionBrowseAppCount(section.apps, section.tag.id) }})
            </button>
        </section>
      </div>
      <template v-else>
        <section class="app-catalog-section">
          <header class="app-catalog-section__head">
            <h2 class="app-catalog-section__title">{{ filteredAppsSectionTitle }}</h2>
            <p class="app-catalog-section__hint">Use category links above to change or clear filters.</p>
          </header>
          <div class="app-catalog-grid app-catalog-grid--browse-filtered">
            <AppCard
              v-for="app in filteredApps"
              :key="app.id"
              :app="resolveAppWithCatalogTags(app as RuntimeApp)"
              :all-apps="props.apps"
              :is-running="isAppRunning(app.id)"
              view-type="grid"
              :user="props.user"
              :is-pinned="pinnedAppIds.includes(app.id)"
              :on-toggle-pin="() => togglePin(app.id)"
              :catalog-tags="catalogTags"
              @launch="() => emitLaunch(app.id, app.name)"
              @teardown="() => emitTeardown(app.id)"
              @catalog-tags-saved="onCatalogTagsSaved"
            />
          </div>
        </section>
      </template>
      </div>
    </div>
    </div>
  </div>
</template>
