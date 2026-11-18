<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { makeDroppable } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  items: unknown[];
  variant?: 'catalog' | 'canvas';
}>();

const emit = defineEmits<{
  drop: [event: IDragEvent];
}>();

const zoneRef = useTemplateRef<HTMLElement>('zoneRef');

const { isDragOver } = makeDroppable(
  zoneRef,
  {
    events: {
      onDrop(e: IDragEvent) {
        emit('drop', e);
      },
    },
  },
  () => props.items,
);
</script>

<template>
  <div
    ref="zoneRef"
    v-bind="$attrs"
    class="lab-rules-event-drop-zone"
    :class="{
      'lab-rules-event-drop-zone--over': isDragOver,
      'lab-rules-event-drop-zone--canvas': variant === 'canvas',
    }"
  >
    <slot />
  </div>
</template>
