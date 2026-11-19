<script setup lang="ts">
import AppCard from './AppCard.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { RuntimeApp, User } from '@/shared/types';
import type { CatalogTagSection } from '@/shared/utils/catalog-tag-utils';
import {
  LAB_SHELL_CATALOG_SIDEBAR_LABEL,
  LAB_SHELL_CATALOG_SIDEBAR_PANEL_ARIA,
} from '@/shared/constants/lab-shell-naming';
import {
  labShellCollapseCatalogSidebarAttrs,
  labShellExpandCatalogSidebarAttrs,
} from '@/shared/constants/lab-shell-workspace-automation';

const props = defineProps<{
  sections: CatalogTagSection[];
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
        <section
          v-for="section in sections"
          :key="section.tag.id"
          class="lab-app-catalog-sidebar__section app-catalog-section app-catalog-section--tag-group"
          :data-catalog-section-tag="section.tag.id"
        >
          <header class="lab-app-catalog-sidebar__section-head app-catalog-section__head">
            <h2 class="app-catalog-section__title">
              {{ section.tag.label }}
              <span class="app-catalog-section__count" aria-hidden="true">({{ section.apps.length }})</span>
            </h2>
          </header>
          <div class="lab-app-catalog-sidebar__section-apps">
            <AppCard
              v-for="app in section.apps"
              :key="app.id"
              :app="app as RuntimeApp"
              :is-running="props.isAppRunning?.(app.id) ?? false"
              view-type="sidebar"
              :user="user"
              @launch="() => emit('launch', app.id, app.name)"
              @teardown="() => emit('teardown', app.id)"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>