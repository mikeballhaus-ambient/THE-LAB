<script setup lang="ts">
import { computed, inject, ref, unref, useTemplateRef } from 'vue';
import { makeDroppable, type IDragEvent } from '@vue-dnd-kit/core';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import type { FormComponent } from '../../../shared/types';
import { isPaletteDragPayload, resolvePlacedComponent } from './grid-layout-utils';
import { isContainerType } from '../../utils/container-types';
import { FORM_DESIGN_CONTAINER_DROP_KEY } from './design-container-context';
import { FORM_COMPONENTS_KEY } from '@/shared/forms/form-components-context';

const props = defineProps<{
  containerFieldKey: string;
  tabIndex?: number;
}>();

const dropEl = useTemplateRef<HTMLElement>('dropEl');
const onContainerDrop = inject(FORM_DESIGN_CONTAINER_DROP_KEY, null);
const allComponents = computed(
  () =>
    (unref(inject(FORM_COMPONENTS_KEY, ref<IFormRuntimeField[]>([]))) ?? []) as FormComponent[],
);

const dropEnabled = computed(() => typeof onContainerDrop === 'function');

function handleContainerDropEvent(event: IDragEvent): void {
  if (!onContainerDrop) {
    return;
  }
  const dragged = event.draggedItems[0]?.data as FormComponent | undefined;
  if (!dragged) {
    return;
  }

  if (isPaletteDragPayload(dragged)) {
    if (isContainerType(dragged.type)) {
      return;
    }
    onContainerDrop({
      containerFieldKey: props.containerFieldKey,
      tabIndex: props.tabIndex,
      component: dragged,
    });
    return;
  }

  const placed = resolvePlacedComponent(dragged, allComponents.value);
  if (!placed || isContainerType(placed.type)) {
    return;
  }
  if (placed.fieldKey === props.containerFieldKey) {
    return;
  }

  let toMove = placed;
  const removed = event.helpers.suggestRemove();
  if (removed?.removedItems.length) {
    toMove =
      resolvePlacedComponent(removed.removedItems[0] as FormComponent, allComponents.value)
      ?? placed;
  }

  onContainerDrop({
    containerFieldKey: props.containerFieldKey,
    tabIndex: props.tabIndex,
    component: toMove,
  });
}

makeDroppable(
  dropEl,
  {
    disabled: computed(() => !dropEnabled.value),
    events: {
      onDrop: handleContainerDropEvent,
    },
  },
  () => [],
);
</script>

<template>
  <div
    ref="dropEl"
    class="container-drop-zone flex flex-col gap-2 min-h-[4rem] w-full rounded-md border border-dashed border-lab-general-border/80 bg-lab-general-bg-muted/50 p-2 transition-colors box-border"
    :class="{ 'opacity-60 pointer-events-none': !dropEnabled }"
    :data-container-key="containerFieldKey"
    :data-tab-index="tabIndex"
  >
    <slot />
  </div>
</template>
