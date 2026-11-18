<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { makeDraggable, useDnDProvider } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { billiardBallVisual } from '../../shared/billiard-ball-visual';

const props = defineProps<{
  disabled?: boolean;
  /** Stage rail — ball only, no helper sentence on the chip. */
  showLabel?: boolean;
  /** Tighter chip for embedding in the stage rail. */
  bare?: boolean;
  /** Match compact english pad size (2.5rem) on stage stack. */
  stagePad?: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();
const dragHandleRef = useTemplateRef<HTMLElement>('dragHandleRef');
const provider = useDnDProvider();

const visual = computed(() => billiardBallVisual(0));

makeDraggable(dragHandleRef, {
  disabled: Boolean(props.disabled),
  data: () => ({ ballId: 'cue', number: 0, role: 'spare-cue' }),
});

watch(
  () => props.disabled,
  (disabled) => {
    const node = dragHandleRef.value;
    if (!node) {
      return;
    }
    const entry = provider.entities.draggableMap.get(node);
    if (entry) {
      entry.disabled = Boolean(disabled);
    }
  },
);
</script>

<template>
  <div
    class="billiards-spare-cue"
    :class="{
      'billiards-spare-cue--bare': bare,
      'billiards-spare-cue--stage-pad': stagePad,
    }"
    :id="generateUniqueId('billiards-spare-cue')"
  >
    <span
      ref="dragHandleRef"
      class="billiards-spare-cue__ball billiard-ball-shell"
      aria-hidden="true"
      title="Drag the cue ball onto the table"
    >
      <span class="billiard-ball-shell__felt-shadow" />
      <span
        class="billiard-ball-shell__sphere"
        :style="{ background: visual.background }"
      />
    </span>
    <span
      v-if="showLabel !== false"
      class="billiards-spare-cue__label text-sm text-lab-general-text-muted"
    >
      Drag onto the table, or click the felt to place
    </span>
  </div>
</template>

<style scoped src="../styles/billiard-ball-shell.css"></style>

<style scoped>
.billiards-spare-cue {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.85rem 0.45rem 0.55rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 72%, var(--lab-general-text-muted));
  background: color-mix(in srgb, var(--lab-general-bg) 92%, var(--lab-general-border));
}

.billiards-spare-cue__ball {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  display: block;
  position: relative;
  cursor: grab;
  touch-action: none;
}

.billiards-spare-cue__label {
  pointer-events: none;
  user-select: none;
}

.billiards-spare-cue__ball:active {
  cursor: grabbing;
}

.billiards-spare-cue--bare {
  padding: 0.25rem 0.4rem;
  gap: 0;
}

.billiards-spare-cue--stage-pad {
  padding: 0;
  gap: 0;
  border: none;
  background: transparent;
  border-radius: 0;
}

.billiards-spare-cue--stage-pad .billiards-spare-cue__ball {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 1px solid var(--lab-general-border);
  background: radial-gradient(circle at 30% 30%, #fff, #e8e8e8 55%, #bbb);
  box-sizing: border-box;
}

.billiards-spare-cue--stage-pad .billiard-ball-shell__felt-shadow,
.billiards-spare-cue--stage-pad .billiard-ball-shell__sphere {
  border-radius: 50%;
}
</style>
