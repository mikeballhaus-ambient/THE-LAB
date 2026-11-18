<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { makeDroppable } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';

const emit = defineEmits<{
  drop: [event: IDragEvent];
}>();

const bodyRef = useTemplateRef<HTMLElement>('bodyRef');

const { isDragOver } = makeDroppable(bodyRef, {
  events: {
    onDrop: (event) => {
      emit('drop', event);
    },
  },
});
</script>

<template>
  <div
    ref="bodyRef"
    class="lab-app-kanban-dropzone applicant-kanban-dropzone flex flex-col gap-2 flex-1 min-h-0"
    :class="{ 'lab-app-kanban-dropzone--active': isDragOver }"
  >
    <slot />
  </div>
</template>
