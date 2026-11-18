<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { makeDraggable } from '@vue-dnd-kit/core';
import type { IPlacement } from '@vue-dnd-kit/core';
import ToggleSwitch from 'primevue/toggleswitch';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { RuntimeApp } from '@/shared/types';

const props = defineProps<{
  app: RuntimeApp;
  index: number;
  items: RuntimeApp[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  toggleEnabled: [appId: string, enabled: boolean];
}>();

const { generateUniqueId } = useUniqueElementId();
const rowRef = useTemplateRef<HTMLElement>('rowRef');

const { isDragging, isDragOver } = makeDraggable(rowRef, {}, () => [props.index, props.items]);

const placement = computed<IPlacement | undefined>(() => isDragOver.value);

const isVisible = computed({
  get: () => props.app.isEnabled !== false,
  set: (value: boolean) => emit('toggleEnabled', props.app.id, value),
});

const visibilityLocked = computed(() => props.app.isSystem === true);
</script>

<template>
  <div
    ref="rowRef"
    class="app-order-dnd-row flex items-center gap-3 px-3 py-2.5 border-b border-lab-general-border/50 bg-lab-general-bg-muted/30 cursor-grab active:cursor-grabbing touch-none select-none relative"
    :class="{ 'opacity-40': isDragging, 'opacity-70': !isVisible && !isDragging }"
    :id="generateUniqueId(`app-order-dnd-row-${app.id}`)"
  >
    <div
      v-if="placement?.top"
      class="absolute left-2 right-2 h-0.5 bg-cyan-400 rounded pointer-events-none -top-0.5 z-10"
      aria-hidden="true"
    />
    <div
      v-if="placement?.bottom"
      class="absolute left-2 right-2 h-0.5 bg-cyan-400 rounded pointer-events-none -bottom-0.5 z-10"
      aria-hidden="true"
    />
    <span class="text-xs font-mono text-cyan-400 w-6 shrink-0 tabular-nums">
      {{ (index + 1).toString().padStart(2, '0') }}
    </span>
    <span class="text-lab-general-text-muted pi pi-bars shrink-0" aria-hidden="true" />
    <i v-if="app.faIcon" :class="`${app.faIcon} text-cyan-400 shrink-0`" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p class="m-0 text-sm font-medium text-lab-general-text truncate">{{ app.name }}</p>
      <p class="m-0 text-xs text-lab-general-text-muted font-mono truncate">{{ app.id }}</p>
    </div>
  <div
      class="flex w-20 shrink-0 justify-center"
      @pointerdown.stop
      @mousedown.stop
    >
      <ToggleSwitch
        v-model="isVisible"
        :disabled="props.disabled || visibilityLocked"
        :input-id="generateUniqueId(`app-visible-${app.id}`)"
        :title="visibilityLocked ? 'System apps stay visible' : 'Show in app catalog'"
      />
    </div>
    <span class="text-xs text-lab-general-text-muted capitalize shrink-0 w-16 text-right">{{ app.type }}</span>
  </div>
</template>
