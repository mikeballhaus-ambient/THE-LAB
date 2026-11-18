<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { makeDraggable } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { FormComponent } from '../../../shared/types';
import ComponentRenderer from './ComponentRenderer.vue';

const props = defineProps<{
  component: FormComponent;
  allComponents?: FormComponent[];
  row: number;
  col: number;
}>();

const emit = defineEmits<{
  (e: 'select', component: FormComponent): void;
  (e: 'remove', component: FormComponent): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const dragRootRef = useTemplateRef<HTMLElement>('dragRootRef');

const componentIndex = computed(
  () => props.allComponents?.findIndex(c => c === props.component) ?? -1,
);

const { isDragging } = makeDraggable(
  dragRootRef,
  {
    data: () => props.component,
    dragHandle: '.canvas-drag-handle',
  },
  () => {
    const list = props.allComponents;
    if (!list || componentIndex.value < 0) {
      return [0, []] as [number, FormComponent[]];
    }
    return [componentIndex.value, list] as [number, FormComponent[]];
  },
);
</script>

<template>
  <div
    ref="dragRootRef"
    class="flex gap-2 w-full h-full items-center"
    :class="{ 'opacity-50': isDragging }"
    @click.stop="emit('select', component)"
  >
    <Button
      type="button"
      size="small"
      icon="pi pi-arrows-alt"
      severity="secondary"
      text
      class="canvas-drag-handle shrink-0 cursor-grab active:cursor-grabbing"
      aria-label="Drag to move"
      :pt="{ root: { id: generateUniqueId(`canvas-drag-${row}-${col}`) } }"
      @click.stop
    />
    <div class="flex-1 flex w-full h-full min-w-0 self-stretch">
      <ComponentRenderer :component="component" />
    </div>
    <div class="flex justify-center items-start h-full shrink-0">
      <Button
        size="small"
        icon="pi pi-times"
        :pt="{ root: { id: generateUniqueId(`canvas-remove-${row}-${col}`) } }"
        @click.stop="emit('remove', component)"
      />
    </div>
  </div>
</template>
