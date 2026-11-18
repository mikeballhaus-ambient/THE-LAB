<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { makeDroppable, useDnDProvider } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';

const props = defineProps<{
  zoneItems: unknown[];
}>();

const emit = defineEmits<{
  drop: [event: IDragEvent];
  pointermove: [event: PointerEvent];
}>();

defineOptions({ inheritAttrs: false });

const zoneRef = useTemplateRef<HTMLElement>('zoneRef');
const dnd = useDnDProvider();

/** Palette → canvas copy drag (not Vue Flow node moves). */
const isPaletteDrag = computed(() => dnd.state.value === 'dragging');

const { isDragOver } = makeDroppable(
  zoneRef,
  {
    events: {
      onDrop(e: IDragEvent) {
        emit('drop', e);
      },
    },
  },
  () => props.zoneItems,
);

defineExpose({
  getPaneElement(): HTMLElement | null {
    return zoneRef.value;
  },
});
</script>

<template>
  <div
    ref="zoneRef"
    class="lab-workflow-graph-flow-pane lab-workflow-graph-drop-zone"
    :class="{
      'lab-workflow-graph-drop-zone--palette-drag': isPaletteDrag,
      'lab-workflow-graph-drop-zone--over': isPaletteDrag && isDragOver,
    }"
    v-bind="$attrs"
    @pointermove="emit('pointermove', $event)"
  >
    <slot />
  </div>
</template>
