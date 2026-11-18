<script setup lang="ts">

import { computed, useTemplateRef, watch } from 'vue';

import { makeDraggable, useDnDProvider } from '@vue-dnd-kit/core';

import type { RackTileDrag } from './tile-grid-dnd';
import { centerTileDragPreview, TW_TILE_DND_GROUP } from './tile-grid-dnd';



const props = defineProps<{

  letter: string;

  rackIndex: number;

  score: number;

  disabled?: boolean;

}>();



const tileRef = useTemplateRef<HTMLElement>('tileRef');

const provider = useDnDProvider();



const dragDisabled = computed(() => Boolean(props.disabled));



const { isDragging } = makeDraggable(

  tileRef,

  {

    disabled: dragDisabled.value,
    groups: [TW_TILE_DND_GROUP],
    events: {
      onSelfDragStart() {
        centerTileDragPreview(provider);
      },
    },

    data: (): RackTileDrag => ({

      kind: 'rack',

      letter: props.letter,

      rackIndex: props.rackIndex,

    }),

  },

);



watch(dragDisabled, (disabled) => {

  const el = tileRef.value;

  if (!el) {

    return;

  }

  const entry = provider.entities.draggableMap.get(el);

  if (entry) {

    entry.disabled = disabled;

  }

});

</script>



<template>

  <div

    ref="tileRef"

    class="tw-rack-tile flex flex-col items-center justify-center rounded border select-none touch-none"

    :class="{

      'opacity-40': isDragging,

      'cursor-grab': !dragDisabled,

      'cursor-not-allowed opacity-60': dragDisabled,

    }"

  >

    <span class="tw-rack-tile__glyph text-sm font-bold pointer-events-none">{{ letter }}</span>

    <span class="tw-rack-tile__score text-[9px] leading-none pointer-events-none">{{ score }}</span>

  </div>

</template>

<style scoped>
.tw-rack-tile {
  width: clamp(2.5rem, 6.75vmin, 3.2rem);
  height: clamp(2.5rem, 6.75vmin, 3.2rem);
  border: 1px solid var(--tw-tile-face-border, color-mix(in srgb, var(--lab-general-border) 70%, transparent));
  background: var(
    --tw-tile-face,
    color-mix(in srgb, var(--lab-prime-surface-100) 75%, var(--lab-prime-surface-300))
  );
  box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--lab-general-border) 25%, transparent);
}

.tw-rack-tile__glyph {
  color: var(--tw-tile-ink, var(--lab-prime-content-primary, var(--lab-general-text)));
}

.tw-rack-tile__score {
  color: var(--tw-tile-ink-muted, var(--lab-general-text-muted));
}
</style>
