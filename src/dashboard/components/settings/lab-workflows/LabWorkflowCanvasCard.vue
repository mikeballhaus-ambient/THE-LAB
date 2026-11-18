<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { makeDraggable } from '@vue-dnd-kit/core';
import type { IPlacement } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  index: number;
  items: unknown[];
  dragId: string;
  title: string;
  hint?: string;
  icon: string;
  copyOnly?: boolean;
  showRemove?: boolean;
  selectable?: boolean;
  selected?: boolean;
  tone?: 'event' | 'rule' | 'action' | 'flow';
  /**
   * Short status word rendered next to the title, e.g. `Not seen yet` for a declared event with no
   * publisher. Text rather than colour alone, so the distinction survives a greyscale screen.
   */
  badge?: string;
}>();

const emit = defineEmits<{
  remove: [];
  select: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const cardRef = useTemplateRef<HTMLElement>('cardRef');

const { isDragging, isDragOver } = makeDraggable(cardRef, {}, () => [props.index, props.items]);

const placement = computed((): IPlacement | undefined =>
  props.copyOnly ? undefined : isDragOver.value,
);

const toneClass = computed(() =>
  props.tone ? `lab-workflow-canvas-card--${props.tone}` : 'lab-workflow-canvas-card--flow',
);
</script>

<template>
  <div
    ref="cardRef"
    class="lab-workflow-canvas-card lab-rules-event-palette-item"
    :class="[
      toneClass,
      {
        'lab-rules-event-palette-item--dragging': isDragging,
        'lab-workflow-canvas-card--selected': selectable && selected,
      },
    ]"
    :role="selectable ? 'button' : undefined"
    :tabindex="selectable ? 0 : undefined"
    @click="selectable ? emit('select') : undefined"
    @keydown.enter.prevent="selectable ? emit('select') : undefined"
  >
    <div v-if="placement?.top" class="lab-rules-event-palette-item__indicator lab-rules-event-palette-item__indicator--top" />
    <div
      v-if="placement?.bottom"
      class="lab-rules-event-palette-item__indicator lab-rules-event-palette-item__indicator--bottom"
    />
    <i :class="['lab-workflow-canvas-card__icon', icon]" aria-hidden="true" />
    <i v-if="!copyOnly" class="pi pi-bars lab-rules-event-palette-item__grip" aria-hidden="true" />
    <div class="lab-rules-event-palette-item__body">
      <div class="lab-rules-event-palette-item__label">
        {{ title }}
        <span
          v-if="badge"
          class="lab-workflow-canvas-card__badge ml-1 rounded bg-lab-general-bg-subtle px-1 text-[10px] font-normal uppercase tracking-wide text-lab-general-text-muted"
        >{{ badge }}</span>
      </div>
      <p v-if="hint?.trim()" class="lab-rules-event-palette-item__helper">{{ hint }}</p>
    </div>
    <Button
      v-if="showRemove"
      :id="generateUniqueId(`wf-canvas-remove-${dragId}`)"
      icon="pi pi-times"
      text
      rounded
      severity="secondary"
      size="small"
      class="shrink-0!"
      :aria-label="`Remove ${title}`"
      @click.stop="emit('remove')"
    />
  </div>
</template>
