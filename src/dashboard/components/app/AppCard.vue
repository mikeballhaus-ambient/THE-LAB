<script setup lang="ts">
import { RuntimeApp, User } from '../../../shared/types';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';
import { userCanModifyCatalogTagsForApp } from '@/shared/utils/catalog-tag-permissions';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labCatalogCloseTabRootAttrs } from '@/shared/constants/lab-shell-workspace-automation';
import {
  LAB_CATALOG_EDIT_TAGS_ACTION_VALUE,
  LAB_CATALOG_LAUNCH_ACTION_VALUE,
  LAB_CATALOG_TOGGLE_PIN_ACTION_VALUE,
} from '@/shared/constants/lab-shell-ui-automation';
import Button from 'primevue/button';
import Card from 'primevue/card';
import VersionBadge from './VersionBadge.vue';
import AppCatalogTagsEditorDialog, {
  type AppCatalogTagsSavedPayload,
} from './AppCatalogTagsEditorDialog.vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  app: RuntimeApp
  allApps?: RuntimeApp[]
  isRunning?: boolean
  viewType?: string
  /** Quieter metadata row (platform catalog section). */
  compactMeta?: boolean
  /** Platform hero carousel card layout (browse cards omit this). */
  platformHeroPresentation?: 'spotlight' | 'rail' | 'feature'
  user: User | null
  isPinned?: boolean
  onTogglePin?: () => void
  catalogTags?: PlatformAppTag[]
}>()

const emit = defineEmits<{
  (e: 'launch'): void
  (e: 'teardown'): void
  (e: 'catalogTagsSaved', payload: AppCatalogTagsSavedPayload): void
}>()

const { generateUniqueId } = useUniqueElementId();
const tagsDialogVisible = ref(false);

const depsPopoverOpen = ref(false)
const depsAnchorRef = ref<HTMLElement | null>(null)

function toggleDepsPopover(event?: Event): void {
  event?.stopPropagation()
  depsPopoverOpen.value = !depsPopoverOpen.value
}

function onDocumentPointerDown(event: MouseEvent): void {
  if (!depsPopoverOpen.value) return
  const target = event.target as Node
  if (depsAnchorRef.value?.contains(target)) return
  depsPopoverOpen.value = false
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown, true))
onUnmounted(() => document.removeEventListener('pointerdown', onDocumentPointerDown, true))

const appNameById = computed(() => {
  const map = new Map<string, string>()
  for (const entry of props.allApps ?? []) {
    map.set(entry.id, entry.name)
  }
  return map
})

function resolveAppLabel(appId: string): string {
  return appNameById.value.get(appId) ?? appId
}

const requiredDependencies = computed(() => props.app.dependencies ?? [])
const optionalDependencies = computed(() => props.app.optionalDependencies ?? [])

const hasDependencies = computed(
  () => requiredDependencies.value.length > 0 || optionalDependencies.value.length > 0,
)

const dependencyCount = computed(
  () => requiredDependencies.value.length + optionalDependencies.value.length,
)

const showGridDeps = computed(() => props.viewType === 'grid' && hasDependencies.value)

const platformHeroClass = computed(() => {
  const p = props.platformHeroPresentation
  if (!p) {
    return ''
  }
  return `app-card-grid--platform-${p}`
})

const appTypeLabel = computed(() => {
  switch (props.app.type) {
    case 'browser':
      return 'Browser'
    case 'hybrid':
      return 'Full-stack'
    case 'server':
      return 'Server'
    default:
      return props.app.type
  }
})

const appTypeIcon = computed(() => {
  switch (props.app.type) {
    case 'browser':
      return 'fa fa-globe'
    case 'hybrid':
      return 'fa fa-laptop-code'
    case 'server':
      return 'fa fa-server'
    default:
      return 'fa fa-cube'
  }
})

const handleLaunch = (): void => emit('launch')
const handleTeardown = (): void => emit('teardown')

const canLaunchApp = computed(() => {
  if (props.user) {
    const hasGlobalPermission: boolean = props.user.permissions?.global?.canLaunchApps ?? false
    let hasAppPermission: boolean = false
    if (props.user.permissions?.app && props.user.permissions.app.length > 0) {
      const app = props.user.permissions.app.filter(_ => _.appId == props.app.id)[0]
      hasAppPermission = app && app.canLaunch ? true : false
    }
    return hasGlobalPermission || hasAppPermission
  }
  return false
})

const launchBlockedMessage = computed(() => {
  return 'Contact your administrator for app access'
})

/** Running hybrid/full-stack apps only close this user's tab — the server keeps running for others. */
const runningActionLabel = computed(() => {
  if (!props.isRunning) return 'Launch'
  return props.app.type === 'browser' ? 'Close' : 'Close tab'
})

const canViewApp = computed(() => Boolean(props.user))

const canModifyCatalogTags = computed(() =>
  userCanModifyCatalogTagsForApp(props.user, props.app.id),
)

function openTagsDialog(event?: Event): void {
  event?.stopPropagation()
  tagsDialogVisible.value = true
}

function onCatalogTagsSaved(payload: AppCatalogTagsSavedPayload): void {
  emit('catalogTagsSaved', payload)
}

const catalogTagBadges = computed(() => {
  const ids = props.app.catalogTagIds ?? []
  const catalog = props.catalogTags ?? []
  if (ids.length === 0 || catalog.length === 0) {
    return [] as Array<{ id: string; label: string }>
  }
  const byId = new Map(catalog.map((tag) => [tag.id, tag]))
  const badges: Array<{ id: string; label: string }> = []
  for (const id of ids) {
    const tag = byId.get(id)
    if (tag) {
      badges.push({ id: tag.id, label: tag.label })
    }
  }
  return badges
})

const LIST_VIEW_MAX_CATALOG_TAG_BADGES = 3

const visibleCatalogTagBadges = computed(() =>
  catalogTagBadges.value.slice(0, LIST_VIEW_MAX_CATALOG_TAG_BADGES),
)

const hiddenCatalogTagBadgeCount = computed(() =>
  Math.max(0, catalogTagBadges.value.length - LIST_VIEW_MAX_CATALOG_TAG_BADGES),
)

</script>

<template>
  <div
    v-if="canViewApp && viewType == 'sidebar'"
    class="app-card-container app-card-sidebar"
    :data-app-id="props.app.id"
    :data-appname="props.app.name"
  >
    <Button
      v-if="canLaunchApp"
      class="lab-catalog-sidebar-launch"
      outlined
      size="small"
      :severity="isRunning ? 'danger' : 'secondary'"
      :data-appname="props.app.name"
      :data-app-id="props.app.id"
      :data-lab-catalog-action="isRunning ? 'close-tab' : LAB_CATALOG_LAUNCH_ACTION_VALUE"
      :aria-label="`${isRunning ? runningActionLabel : 'Launch'} ${props.app.name}`"
      :pt="{
        root: {
          class:
            'lab-catalog-sidebar-launch-root w-full! max-w-full! justify-start! text-left!',
          attrs: isRunning
            ? labCatalogCloseTabRootAttrs(props.app.id, props.app.name, generateUniqueId)
            : {
                id: generateUniqueId(`lab-catalog-launch-${props.app.id}`),
                'data-lab-catalog-action': LAB_CATALOG_LAUNCH_ACTION_VALUE,
              },
        },
        label: { class: 'w-full! flex! justify-start! text-left!' },
      }"
      @click="isRunning ? handleTeardown() : handleLaunch()"
    >
      <span class="text-xs flex w-full items-center justify-start gap-2 whitespace-nowrap text-left text-lab-general-text">
        <i
          :class="
            isRunning ? 'pi pi-times text-amber-500' : 'pi pi-play text-lab-button-outlined-text'
          "
          aria-hidden="true"
        />
        <span class="font-medium truncate">{{ props.app.name }}</span>
      </span>
    </Button>
  </div>

  <!-- Grid: soft surface, inset ring, quieter metadata -->
  <article
    v-else-if="canViewApp && viewType === 'grid'"
    class="app-card-grid"
    :class="{ 'app-card-grid--running': isRunning, [platformHeroClass]: Boolean(platformHeroClass) }"
    :data-app-id="props.app.id"
    :data-appname="props.app.name"
  >
    <header class="app-card-grid__header">
      <div class="app-card-grid__title-row">
        <div class="app-card-grid__identity">
          <div class="app-card-grid__icon" aria-hidden="true">
            <i
              :class="props.app.faIcon ? props.app.faIcon : 'fa fa-cube'"
              class="fa-solid text-base"
            ></i>
          </div>
          <div class="min-w-0">
            <h3 class="app-card-grid__title">{{ props.app.name }}</h3>
            <p v-if="isRunning" class="app-card-grid__running-label">Open in tab</p>
            <div
              v-if="catalogTagBadges.length"
              class="app-card-grid__tag-badges"
              :aria-label="`Tags: ${catalogTagBadges.map((t) => t.label).join(', ')}`"
            >
              <span
                v-for="badge in catalogTagBadges"
                :key="badge.id"
                class="lab-app-tag-badge"
              >{{ badge.label }}</span>
            </div>
          </div>
        </div>
        <p v-if="!isRunning" class="app-card-grid__meta-line">
          <span>{{ appTypeLabel }}</span>
          <span class="app-card-grid__meta-sep" aria-hidden="true">·</span>
          <span class="font-mono text-[0.68rem]">{{ props.app.version || '—' }}</span>
          <template v-if="!compactMeta && app.isSystem">
            <span class="app-card-grid__meta-sep" aria-hidden="true">·</span>
            <span title="Protected platform app">Protected</span>
          </template>
          <span
            v-if="showGridDeps"
            ref="depsAnchorRef"
            class="app-deps-anchor relative inline"
          >
            <span class="app-card-grid__meta-sep" aria-hidden="true">·</span>
            <button
              type="button"
              class="app-card-grid__deps-link"
              :title="depsPopoverOpen ? 'Hide dependencies' : 'Show dependencies'"
              @click="toggleDepsPopover"
            >
              {{ dependencyCount }} deps
            </button>
            <div
              v-show="depsPopoverOpen"
              class="app-deps-popover absolute right-0 top-full z-50 mt-1.5 min-w-[14rem] max-w-[20rem] rounded-lg px-3 py-2 text-left shadow-lg backdrop-blur-sm"
              @click.stop
            >
              <p v-if="requiredDependencies.length" class="text-[10px] uppercase tracking-wide text-lab-general-text-muted m-0 mb-1">
                Required
              </p>
              <ul v-if="requiredDependencies.length" class="list-none m-0 mb-2 p-0 space-y-0.5">
                <li
                  v-for="depId in requiredDependencies"
                  :key="`req-${depId}`"
                  class="text-xs text-lab-general-text-muted"
                >
                  {{ resolveAppLabel(depId) }}
                  <span class="text-lab-general-text-muted opacity-80">({{ depId }})</span>
                </li>
              </ul>
              <p
                v-if="optionalDependencies.length"
                class="text-[10px] uppercase tracking-wide text-lab-general-text-muted m-0 mb-1"
              >
                Optional
              </p>
              <ul v-if="optionalDependencies.length" class="list-none m-0 p-0 space-y-0.5">
                <li
                  v-for="depId in optionalDependencies"
                  :key="`opt-${depId}`"
                  class="text-xs text-lab-card-title"
                >
                  {{ resolveAppLabel(depId) }}
                  <span class="text-lab-general-text-muted opacity-80">({{ depId }})</span>
                </li>
              </ul>
            </div>
          </span>
        </p>
      </div>
    </header>

    <p class="app-card-grid__description">
      {{ props.app.description }}
    </p>

    <footer class="app-card-grid__footer">
      <div class="app-card-grid__footer-row">
        <div class="flex items-center gap-2 min-w-0">
          <Button
            v-if="canLaunchApp"
            :data-appname="props.app.name"
            :data-app-id="props.app.id"
            :data-lab-catalog-action="isRunning ? 'close-tab' : LAB_CATALOG_LAUNCH_ACTION_VALUE"
            :aria-label="`${isRunning ? runningActionLabel : 'Launch'} ${props.app.name}`"
            :pt="{
              root: {
                attrs: isRunning
                  ? labCatalogCloseTabRootAttrs(props.app.id, props.app.name, generateUniqueId)
                  : { id: generateUniqueId(`lab-catalog-launch-${props.app.id}`) },
              },
            }"
            class="lab-catalog-launch"
            outlined
            size="small"
            :severity="isRunning ? 'danger' : undefined"
            @click="isRunning ? handleTeardown() : handleLaunch()"
          >
            <span class="text-sm flex items-center gap-2 whitespace-nowrap">
              <template v-if="!isRunning">
                <i class="fa fa-rocket"></i>
                <span>Launch</span>
              </template>
              <template v-else>
                <i class="fa fa-flag-checkered"></i>
                <span>{{ runningActionLabel }}</span>
              </template>
            </span>
          </Button>
          <p v-if="!canLaunchApp" class="text-xs text-lab-general-text-muted italic m-0">{{ launchBlockedMessage }}</p>

          <Button
            v-if="viewType === 'grid' && !isRunning && props.onTogglePin"
            :data-app-id="props.app.id"
            :data-appname="props.app.name"
            :data-lab-catalog-action="LAB_CATALOG_TOGGLE_PIN_ACTION_VALUE"
            outlined
            size="small"
            class="app-card-pin-btn lab-catalog-pin"
            :aria-label="props.isPinned ? 'Unpin app' : 'Pin app'"
            :pt="{
              root: {
                attrs: { id: generateUniqueId(`lab-catalog-pin-${props.app.id}`) },
              },
            }"
            @click="props.onTogglePin()"
          >
            <i
              class="fa-solid fa-star text-sm"
              :class="{ 'opacity-45': !props.isPinned }"
              aria-hidden="true"
            ></i>
          </Button>
        </div>
        <button
          v-if="canModifyCatalogTags"
          type="button"
          class="app-card-grid__tags-link lab-catalog-edit-tags"
          :data-app-id="props.app.id"
          :data-appname="props.app.name"
          :data-lab-catalog-action="LAB_CATALOG_EDIT_TAGS_ACTION_VALUE"
          :aria-label="`Edit catalog tags for ${props.app.name}`"
          :id="generateUniqueId(`app-card-tags-${props.app.id}`)"
          @click="openTagsDialog"
        >
          Tags
        </button>
      </div>
    </footer>
    <AppCatalogTagsEditorDialog
      v-model:visible="tagsDialogVisible"
      :app="props.app"
      :tags="catalogTags ?? []"
      @saved="onCatalogTagsSaved"
    />
  </article>

  <Card v-else-if="canViewApp && viewType == 'list'"
    class="_card _list app-card-list"
    :pt:body="{ class: '' }"
    :pt:content="{ class: '' }"
  >
    <template #content>
      <div class="flex flex-row justify-between items-center gap-4">
        <div class="flex flex-row justify-between items-center gap-4 min-w-0 flex-1">
          <div class="flex flex-row items-center gap-3 min-w-0">
            <div class="app-card-grid__icon app-card-grid__icon--sm shrink-0" aria-hidden="true">
              <i
                :class="props.app.faIcon ? props.app.faIcon : 'fa fa-cube'"
                class="fa-solid text-sm"
              ></i>
            </div>
            <span class="app-card-list__title truncate">{{ props.app.name }}</span>
            <div class="hidden sm:flex items-center gap-1.5 flex-wrap">
              <span v-if="app.isSystem" class="app-card-meta-pill">
                <i class="fa fa-shield-halved text-[10px]"></i>
                <span>Protected</span>
              </span>
              <span class="app-card-meta-pill">
                <i :class="appTypeIcon" class="text-[10px]"></i>
                <span>{{ appTypeLabel }}</span>
              </span>
              <span class="app-card-meta-pill app-card-meta-pill--version">
                <VersionBadge :app="app" />
              </span>
              <span
                v-for="badge in visibleCatalogTagBadges"
                :key="`list-tag-${badge.id}`"
                class="lab-app-tag-badge"
              >{{ badge.label }}</span>
              <span
                v-if="hiddenCatalogTagBadgeCount > 0"
                class="lab-app-tag-badge lab-app-tag-badge--more"
              >+{{ hiddenCatalogTagBadgeCount }}</span>
            </div>
          </div>
          <p class="text-lab-general-text-muted text-sm m-0 truncate max-w-[40%] hidden md:block">
            {{ props.app.description }}
          </p>
        </div>
        <div class="shrink-0">
          <Button
            v-if="canLaunchApp"
            :data-appname="props.app.name"
            :data-app-id="props.app.id"
            :data-lab-catalog-action="isRunning ? 'close-tab' : LAB_CATALOG_LAUNCH_ACTION_VALUE"
            :aria-label="`${isRunning ? runningActionLabel : 'Launch'} ${props.app.name}`"
            :pt="{
              root: {
                attrs: isRunning
                  ? labCatalogCloseTabRootAttrs(props.app.id, props.app.name, generateUniqueId)
                  : { id: generateUniqueId(`lab-catalog-launch-${props.app.id}`) },
              },
            }"
            class="lab-catalog-launch"
            outlined
            size="small"
            :severity="isRunning ? 'danger' : undefined"
            @click="isRunning ? handleTeardown() : handleLaunch()"
          >
            <span class="text-sm flex items-center gap-2 whitespace-nowrap">
              <template v-if="!isRunning">
                <i class="fa fa-rocket"></i>
                <span>Launch</span>
              </template>
              <template v-else>
                <i class="fa fa-flag-checkered"></i>
                <span>{{ runningActionLabel }}</span>
              </template>
            </span>
          </Button>
          <div class="text-xs text-lab-general-text-muted italic" v-if="!canLaunchApp">{{ launchBlockedMessage }}</div>
        </div>
      </div>
    </template>
  </Card>
</template>
<style scoped>
._card._list :deep(.p-card-body) {
  padding: 10px 16px !important;
}

._card.app-card-list .app-card-list__title {
  color: color-mix(in srgb, var(--lab-general-text) 42%, var(--lab-card-title-text));
  font-weight: 600;
}

._card.app-card-list :deep(.p-card-content) {
  color: var(--lab-general-text);
}

._card.app-card-list .app-card-grid__icon {
  color: var(--lab-accent-primary, var(--lab-button-border-hover));
  background: var(--lab-card-icon-bg);
  box-shadow: inset 0 0 0 1px var(--lab-card-icon-border);
}

._card.app-card-list .app-card-grid__icon i {
  color: inherit;
}

._card.app-card-list .app-card-meta-pill {
  color: var(--lab-general-text-muted);
}

._card.app-card-list {
  background: var(--lab-card-gradient) !important;
  border: 1px solid var(--lab-card-border) !important;
  box-shadow: var(--lab-card-shadow) !important;
}

.app-deps-anchor {
  overflow: visible;
}

.app-deps-popover {
  pointer-events: auto;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 80%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 95%, transparent);
}

.app-card-sidebar {
  width: 100%;
  min-width: 0;
}

.app-card-sidebar :deep(.lab-catalog-sidebar-launch.p-button),
.app-card-sidebar :deep(.lab-catalog-sidebar-launch-root) {
  justify-content: flex-start !important;
  width: 100%;
}
.app-card-sidebar :deep(.lab-catalog-sidebar-launch .p-button-label) {
  justify-content: flex-start !important;
  width: 100%;
}

.app-card-pin-btn {
  color: var(--lab-general-text-muted);
  transition: color 0.2s ease;
}

.app-card-pin-btn:hover {
  color: #fbbf24;
}

.app-card-pin-btn.p-button-active {
  color: #fbbf24;
}
</style>
