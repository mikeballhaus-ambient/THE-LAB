<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { makeDraggable, useDnDProvider } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { billiardBallVisual } from '../../shared/billiard-ball-visual';

const props = defineProps<{
  number: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  pick: [number: number];
}>();

const { generateUniqueId } = useUniqueElementId();
const el = useTemplateRef<HTMLElement>('el');
const provider = useDnDProvider();

const visual = computed(() => billiardBallVisual(props.number));

makeDraggable(el, {
  disabled: Boolean(props.disabled),
  data: () => ({ ballId: `ball-${props.number}`, number: props.number, role: 'tray-ball' }),
});

watch(
  () => props.disabled,
  (disabled) => {
    const node = el.value;
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
  <button
    ref="el"
    type="button"
    class="tray-ball billiard-ball-shell"
    :class="`tray-ball--${visual.kind}`"
    :id="generateUniqueId(`billiards-tray-${number}`)"
    @click="emit('pick', number)"
  >
    <span class="billiard-ball-shell__felt-shadow" aria-hidden="true" />
    <span
      class="billiard-ball-shell__sphere"
      :style="{ background: visual.background }"
    />
    <span class="tray-ball__number" :class="visual.numberClass">{{ visual.label }}</span>
  </button>
</template>

<style scoped src="../styles/billiard-ball-shell.css"></style>

<style scoped>
.tray-ball {
  width: 2rem;
  height: 2rem;
  border: none;
  font-size: 0.65rem;
  font-weight: 800;
  cursor: grab;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
}

.tray-ball__number {
  position: relative;
  z-index: 2;
  pointer-events: none;
}

.tray-ball__number.billiards-ball__number--solid,
.tray-ball__number.billiards-ball__number--stripe {
  width: 1.05rem;
  height: 1.05rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f7f7f7;
  color: #111827;
  font-size: 0.58rem;
  box-shadow: 0 0 0 1px color-mix(in srgb, #111827 20%, transparent);
}

.tray-ball__number.billiards-ball__number--eight {
  color: #ffffff;
  font-size: 0.65rem;
  text-shadow: 0 0 1px #000, 0 1px 2px #000;
}

.tray-ball:active {
  cursor: grabbing;
}
</style>
