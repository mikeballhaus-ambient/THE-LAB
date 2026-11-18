<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { makeDraggable } from '@vue-dnd-kit/core';
import type { IPlacement } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';

const props = defineProps<{
  tag: PlatformAppTag;
  index: number;
  items: string[];
  canRemove: boolean;
}>();

const emit = defineEmits<{
  remove: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const rowRef = useTemplateRef<HTMLElement>('rowRef');

const { isDragging, isDragOver } = makeDraggable(rowRef, {}, () => [props.index, props.items]);
const placement = computed<IPlacement | undefined>(() => isDragOver.value);
</script>

<template>
  <div
    ref="rowRef"
    class="flex items-center gap-2 py-1 px-1 cursor-grab active:cursor-grabbing touch-none select-none relative"
    :class="{ 'opacity-40': isDragging }"
    :id="generateUniqueId(`app-tag-order-row-${tag.id}`)"
  >
    <div
      v-if="placement?.top"
      class="absolute left-1 right-1 h-0.5 bg-lab-accent-primary rounded pointer-events-none -top-0.5 z-10"
      aria-hidden="true"
    />
    <div
      v-if="placement?.bottom"
      class="absolute left-1 right-1 h-0.5 bg-lab-accent-primary rounded pointer-events-none -bottom-0.5 z-10"
      aria-hidden="true"
    />
    <span class="pi pi-bars text-lab-general-text-muted shrink-0" aria-hidden="true" />
    <span class="text-sm flex-1 truncate">{{ tag.label }}</span>
    <span v-if="index === 0" class="text-xs text-lab-accent-primary shrink-0">Primary</span>
    <Button
      v-if="canRemove"
      type="button"
      icon="pi pi-times"
      text
      rounded
      severity="danger"
      class="h-6 w-6 !p-0"
      @click="emit('remove')"
    />
  </div>
</template>
