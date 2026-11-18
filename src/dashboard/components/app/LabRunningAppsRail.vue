<script setup lang="ts">
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { RuntimeApp } from '@/shared/types';
import {
  LAB_SHELL_RESTORE_APP_ARIA,
  LAB_SHELL_RUNNING_APPS_LABEL,
  LAB_SHELL_RUNNING_APPS_PANEL_ARIA,
} from '@/shared/constants/lab-shell-naming';
import {
  labShellCloseAppIconAttrs,
  labShellCollapseRunningAppsRailAttrs,
  labShellExpandRunningAppsRailAttrs,
  labShellRestoreAppAttrs,
} from '@/shared/constants/lab-shell-workspace-automation';

defineProps<{
  apps: RuntimeApp[];
  loadingStates?: Record<string, boolean>;
  /** Collapsed = narrow rail button; expanded = sliding panel (mirrors the app launcher). */
  expanded?: boolean;
}>();

const emit = defineEmits<{
  (e: 'restore', id: string): void;
  (e: 'teardown', id: string): void;
  (e: 'expand'): void;
  (e: 'collapse'): void;
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <aside
    class="lab-running-apps-rail-shell"
    :class="
      expanded
        ? 'lab-running-apps-rail-shell--expanded'
        : 'lab-running-apps-rail-shell--collapsed'
    "
    :aria-label="LAB_SHELL_RUNNING_APPS_PANEL_ARIA"
  >
    <button
      v-if="!expanded"
      type="button"
      class="lab-running-apps-rail-tab"
      :id="generateUniqueId('lab-running-apps-tab')"
      v-bind="labShellExpandRunningAppsRailAttrs()"
      aria-expanded="false"
      @click="emit('expand')"
    >
      <i class="fa-solid fa-window-minimize lab-running-apps-rail-tab__icon" aria-hidden="true" />
      <span class="lab-running-apps-rail-tab__label">{{ LAB_SHELL_RUNNING_APPS_LABEL }}</span>
      <span class="lab-running-apps-rail-tab__count">{{ apps.length }}</span>
    </button>

    <div v-else class="lab-running-apps-rail">
      <header class="lab-running-apps-rail__header">
        <button
          type="button"
          class="lab-running-apps-rail__collapse"
          :id="generateUniqueId('lab-running-apps-collapse')"
          v-bind="labShellCollapseRunningAppsRailAttrs()"
          @click="emit('collapse')"
        >
          <i class="fa-solid fa-chevron-left" aria-hidden="true" />
        </button>
        <i class="fa-solid fa-window-minimize lab-running-apps-rail__icon" aria-hidden="true" />
        <span class="lab-running-apps-rail__title">{{ LAB_SHELL_RUNNING_APPS_LABEL }}</span>
        <span class="lab-running-apps-rail__count">{{ apps.length }}</span>
      </header>
      <ul class="lab-running-apps-rail__list">
        <li v-for="app in apps" :key="app.id" class="lab-running-apps-rail__item">
          <button
            type="button"
            class="lab-running-apps-rail__restore"
            :id="generateUniqueId(`lab-running-app-restore-${app.id}`)"
            v-bind="labShellRestoreAppAttrs(app.id, app.name)"
            :title="`${LAB_SHELL_RESTORE_APP_ARIA}: ${app.name}`"
            @click="emit('restore', app.id)"
          >
            <i
              :class="app.faIcon ? app.faIcon : 'fa fa-cube'"
              class="fa-solid lab-running-apps-rail__app-icon"
              aria-hidden="true"
            />
            <span class="lab-running-apps-rail__app-name">{{ app.name }}</span>
            <i
              v-if="loadingStates?.[app.id]"
              class="fa fa-spinner fa-spin lab-running-apps-rail__spinner"
              aria-hidden="true"
            />
            <i
              v-else
              class="fa fa-up-right-and-down-left-from-center lab-running-apps-rail__restore-icon"
              aria-hidden="true"
            />
          </button>
          <button
            v-if="app.hasCloseButton"
            type="button"
            class="lab-running-apps-rail__close"
            v-bind="labShellCloseAppIconAttrs(app.id, app.name)"
            :id="generateUniqueId(`lab-running-app-close-${app.id}`)"
            @click="emit('teardown', app.id)"
          >
            <i class="fa fa-times" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>
