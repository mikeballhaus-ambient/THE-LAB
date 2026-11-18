<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { makeDroppable } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { RuntimeApp } from '@/shared/types';
import AppOrderDnDRow from './AppOrderDnDRow.vue';

const props = defineProps<{
  apps: RuntimeApp[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  reorder: [apps: RuntimeApp[]];
  toggleEnabled: [appId: string, enabled: boolean];
}>();

const { generateUniqueId } = useUniqueElementId();
const listRef = useTemplateRef<HTMLElement>('listRef');

makeDroppable(
  listRef,
  {
    events: {
      onDrop(e: IDragEvent) {
        const result = e.helpers.suggestSort('vertical');
        if (!result) {
          return;
        }
        const srcItems = e.draggedItems[0]?.items as RuntimeApp[] | undefined;
        if (!srcItems || srcItems !== props.apps) {
          return;
        }
        emit('reorder', result.sourceItems as RuntimeApp[]);
      },
    },
  },
  () => props.apps,
);
</script>

<template>
  <div
    class="app-order-dnd-list overflow-hidden rounded-lg border border-lab-general-border"
    :class="{ 'opacity-60 pointer-events-none': disabled }"
    :id="generateUniqueId('app-order-dnd-list')"
  >
    <div
      class="flex items-center gap-2 border-b border-lab-general-border bg-lab-general-bg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-lab-general-text-muted"
    >
      <span class="w-6" />
      <span class="w-6" />
      <span class="flex-1">App</span>
      <span class="w-20 text-center">Visible</span>
      <span class="w-16 text-right">Type</span>
    </div>
    <div ref="listRef" class="app-order-dnd-dropzone relative flex min-h-16 flex-col">
      <TransitionGroup name="app-order-list">
        <AppOrderDnDRow
          v-for="(app, index) in apps"
          :key="app.id"
          :app="app"
          :index="index"
          :items="apps"
          :disabled="disabled"
          @toggle-enabled="(id, enabled) => emit('toggleEnabled', id, enabled)"
        />
      </TransitionGroup>
      <p v-if="apps.length === 0" class="m-0 p-4 text-center text-sm text-lab-general-text-muted">
        No apps registered.
      </p>
    </div>
  </div>
</template>

<style scoped>
.app-order-list-move {
  transition: transform 0.25s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.app-order-list-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}
</style>
