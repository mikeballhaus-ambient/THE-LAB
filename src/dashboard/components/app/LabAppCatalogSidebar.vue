<script setup lang="ts">
import AppCard from './AppCard.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { RuntimeApp, User } from '@/shared/types';
import {
  LAB_SHELL_CATALOG_SIDEBAR_LABEL,
  LAB_SHELL_CATALOG_SIDEBAR_PANEL_ARIA,
} from '@/shared/constants/lab-shell-naming';
import {
  labShellCollapseCatalogSidebarAttrs,
  labShellExpandCatalogSidebarAttrs,
} from '@/shared/constants/lab-shell-workspace-automation';

const props = defineProps<{
  apps: RuntimeApp[];
  user: User | null;
  expanded: boolean;
  isAppRunning?: (appId: string) => boolean;
}>();

const emit = defineEmits<{
  (e: 'launch', id: string, appName: string): void;
  (e: 'teardown', id: string): void;
  (e: 'expand'): void;
  (e: 'collapse'): void;
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div
    class="lab-app-catalog-sidebar-shell"
    :class="expanded ? 'lab-app-catalog-sidebar-shell--expanded' : 'lab-app-catalog-sidebar-shell--collapsed'"
    :aria-label="LAB_SHELL_CATALOG_SIDEBAR_PANEL_ARIA"
  >
    <button
      v-if="!expanded"
      type="button"
      class="lab-catalog-sidebar-rail"
      :id="generateUniqueId('lab-catalog-sidebar-rail')"
      v-bind="labShellExpandCatalogSidebarAttrs()"
      aria-expanded="false"
      @click="emit('expand')"
    >
      <i class="fa-solid fa-border-all lab-catalog-sidebar-rail__icon" aria-hidden="true" />
      <span class="lab-catalog-sidebar-rail__label">{{ LAB_SHELL_CATALOG_SIDEBAR_LABEL }}</span>
    </button>

    <div v-else class="lab-app-catalog-sidebar">
      <header class="lab-app-catalog-sidebar__header">
        <button
          type="button"
          class="lab-app-catalog-sidebar__collapse"
          :id="generateUniqueId('lab-catalog-sidebar-collapse')"
          v-bind="labShellCollapseCatalogSidebarAttrs()"
          @click="emit('collapse')"
        >
          <i class="fa-solid fa-chevron-left" aria-hidden="true" />
        </button>
        <span class="lab-app-catalog-sidebar__title">{{ LAB_SHELL_CATALOG_SIDEBAR_LABEL }}</span>
      </header>
      <div class="lab-app-catalog-sidebar__list">
        <AppCard
          v-for="app in apps"
          :key="app.id"
          :app="app"
          :is-running="props.isAppRunning?.(app.id) ?? false"
          view-type="sidebar"
          :user="user"
          @launch="() => emit('launch', app.id, app.name)"
          @teardown="() => emit('teardown', app.id)"
        />
      </div>
    </div>
  </div>
</template>
