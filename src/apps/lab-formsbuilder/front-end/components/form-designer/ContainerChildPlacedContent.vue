<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue';
import { makeDraggable } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { FormComponent } from '../../../shared/types';
import ComponentRenderer from './ComponentRenderer.vue';

import { FORM_DESIGN_CANVAS_ACTIONS_KEY } from './design-container-context';

const props = defineProps<{
  component: FormComponent;
  allComponents?: FormComponent[];
}>();

const canvasActions = inject(FORM_DESIGN_CANVAS_ACTIONS_KEY, null);

const { generateUniqueId } = useUniqueElementId();
const dragRootRef = useTemplateRef<HTMLElement>('dragRootRef');

const componentIndex = computed(
  () => props.allComponents?.findIndex(c => c === props.component) ?? -1,
);

const { isDragging } = makeDraggable(
  dragRootRef,
  {
    data: () => props.component,
    dragHandle: '.container-child-drag-handle',
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
    class="flex gap-2 w-full items-center rounded-md bg-lab-general-bg-muted/80 p-2 border border-lab-general-border"
    :class="{ 'opacity-50': isDragging }"
    @click.stop="canvasActions?.select(component)"
  >
    <Button
      type="button"
      size="small"
      icon="pi pi-arrows-alt"
      severity="secondary"
      text
      class="container-child-drag-handle shrink-0 cursor-grab active:cursor-grabbing"
      aria-label="Drag to move"
      :pt="{ root: { id: generateUniqueId(`container-drag-${component.fieldKey}`) } }"
      @click.stop
    />
    <div class="flex-1 flex w-full min-w-0">
      <ComponentRenderer :component="component" />
    </div>
    <Button
      v-if="canvasActions"
      size="small"
      icon="pi pi-times"
      severity="danger"
      text
      :pt="{ root: { id: generateUniqueId(`container-remove-${component.fieldKey}`) } }"
      @click.stop="canvasActions.remove(component)"
    />
  </div>
</template>
