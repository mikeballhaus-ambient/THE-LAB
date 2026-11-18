<script setup lang="ts">
import { useTemplateRef, ref } from 'vue';
import { makeDraggable } from '@vue-dnd-kit/core';
import type { FormComponent } from '../../../shared/types';
import { createPaletteDragPayload } from './grid-layout-utils';

const props = defineProps<{
  component: FormComponent;
}>();

const emit = defineEmits<{
  (e: 'drag-start', payload: FormComponent): void;
  (e: 'drag-end'): void;
}>();

const el = useTemplateRef<HTMLElement>('el');
const isDragging = ref(false);

// vue-dnd-kit makeDraggable returns an object with isDragging property
makeDraggable(
  el,
  {
    data: () => createPaletteDragPayload(props.component),
    events: {
      onSelfDragStart() {
        emit('drag-start', props.component);
        isDragging.value = true;
      },
      onSelfDragEnd() {
        emit('drag-end');
        isDragging.value = false;
      },
    },
  }
);
</script>

<template>
  <div ref="el" class="bg-lab-general-bg-muted border border-lab-general-border text-lab-general-text flex items-center gap-2 p-2 whitespace-nowrap rounded cursor-grab" :class="{ 'opacity-50': isDragging }" :data-component-type="component.type">
    <i :class="[component.icon]" class=""></i>
    <span class="">{{ component.label }}</span>
  </div>
</template>
