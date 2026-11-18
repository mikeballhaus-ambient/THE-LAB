<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { makeDraggable } from '@vue-dnd-kit/core';
import type { IPlacement } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { RuleEventDragBlock } from './rule-event-drag-block';
import { paletteCardSubtext } from '@/shared/utils/palette-display-text';

const props = defineProps<{
  index: number;
  items: RuleEventDragBlock[];
  block: RuleEventDragBlock;
  copyOnly?: boolean;
  showRemove?: boolean;
}>();

const emit = defineEmits<{
  remove: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const cardRef = useTemplateRef<HTMLElement>('cardRef');

const { isDragging, isDragOver } = makeDraggable(cardRef, {}, () => [props.index, props.items]);

const placement = computed((): IPlacement | undefined =>
  props.copyOnly ? undefined : isDragOver.value,
);

const helperSubtext = computed(() => paletteCardSubtext(props.block.label, props.block.description));
</script>

<template>
  <div
    ref="cardRef"
    class="lab-rules-event-palette-item"
    :class="{ 'lab-rules-event-palette-item--dragging': isDragging }"
  >
    <div v-if="placement?.top" class="lab-rules-event-palette-item__indicator lab-rules-event-palette-item__indicator--top" />
    <div
      v-if="placement?.bottom"
      class="lab-rules-event-palette-item__indicator lab-rules-event-palette-item__indicator--bottom"
    />
    <i class="pi pi-bars lab-rules-event-palette-item__grip" aria-hidden="true" />
    <div class="lab-rules-event-palette-item__body">
      <div class="lab-rules-event-palette-item__label">{{ block.label }}</div>
      <p v-if="helperSubtext" class="lab-rules-event-palette-item__helper">{{ helperSubtext }}</p>
    </div>
    <Button
      v-if="showRemove"
      :id="generateUniqueId(`rule-event-remove-${block.dragId}`)"
      icon="pi pi-times"
      text
      rounded
      severity="secondary"
      size="small"
      class="shrink-0!"
      :aria-label="`Remove ${block.label}`"
      @click.stop="emit('remove')"
    />
  </div>
</template>
