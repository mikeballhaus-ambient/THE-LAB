<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  englishX: number;
  englishY: number;
  disabled?: boolean;
  /** Vs-match aside — half-size ball (2.5rem). */
  compact?: boolean;
}>();

const emit = defineEmits<{
  'update:englishX': [value: number];
  'update:englishY': [value: number];
}>();

const { generateUniqueId } = useUniqueElementId();
const padRef = useTemplateRef<HTMLElement>('padRef');

function clampEnglish(n: number): number {
  return Math.max(-1, Math.min(1, n));
}

function emitFromClientPoint(clientX: number, clientY: number): void {
  const pad = padRef.value;
  if (!pad) {
    return;
  }
  const rect = pad.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return;
  }
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
  emit('update:englishX', clampEnglish(nx));
  emit('update:englishY', clampEnglish(ny));
}

function onPadPointerDown(event: PointerEvent): void {
  if (props.disabled) {
    return;
  }
  const pad = padRef.value;
  if (!pad) {
    return;
  }
  const target = event.target as HTMLElement | null;
  if (target?.classList.contains('english-dot')) {
    return;
  }
  event.preventDefault();
  emitFromClientPoint(event.clientX, event.clientY);
}

function onDotPointerDown(event: PointerEvent): void {
  if (props.disabled) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const dot = event.currentTarget as HTMLElement;
  const pad = padRef.value;
  if (!pad) {
    return;
  }
  dot.setPointerCapture(event.pointerId);
  let dragging = true;

  const onMove = (ev: PointerEvent): void => {
    if (!dragging || ev.pointerId !== event.pointerId) {
      return;
    }
    emitFromClientPoint(ev.clientX, ev.clientY);
  };

  const onEnd = (ev: PointerEvent): void => {
    if (ev.pointerId !== event.pointerId) {
      return;
    }
    dragging = false;
    dot.removeEventListener('pointermove', onMove);
    dot.removeEventListener('pointerup', onEnd);
    dot.removeEventListener('pointercancel', onEnd);
    try {
      dot.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  dot.addEventListener('pointermove', onMove);
  dot.addEventListener('pointerup', onEnd);
  dot.addEventListener('pointercancel', onEnd);
}
</script>

<template>
  <div class="english-pad-wrap relative z-[1] flex flex-col">
    <div
      ref="padRef"
      class="english-pad"
      :class="{
        'english-pad--disabled': disabled,
        'english-pad--compact': compact,
      }"
      :id="generateUniqueId('billiards-english-pad')"
      role="application"
      :aria-disabled="disabled || undefined"
      aria-label="Cue ball english — drag the dot or tap the ball"
      @pointerdown="onPadPointerDown"
    >
      <div
        class="english-dot"
        :id="generateUniqueId('billiards-english-dot')"
        :style="{
          left: `${((englishX + 1) / 2) * 100}%`,
          top: `${((englishY + 1) / 2) * 100}%`,
        }"
        @pointerdown="onDotPointerDown"
      />
    </div>
  </div>
</template>

<style scoped>
.english-pad {
  position: relative;
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, #e8e8e8 55%, #bbb);
  border: 1px solid var(--lab-general-border);
  touch-action: none;
  cursor: crosshair;
  user-select: none;
}

.english-pad--compact {
  width: 2.5rem;
  height: 2.5rem;
}

.english-pad--disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

.english-pad--compact .english-dot {
  width: 8px;
  height: 8px;
}

.english-pad--compact .english-dot::before {
  width: 1.25rem;
  height: 1.25rem;
}

.english-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--lab-accent-primary, var(--lab-button-border-hover));
  transform: translate(-50%, -50%);
  cursor: grab;
  touch-action: none;
  user-select: none;
  box-shadow: 0 1px 3px color-mix(in srgb, var(--lab-general-text) 30%, transparent);
}

.english-dot::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2rem;
  height: 2rem;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}

.english-dot:active {
  cursor: grabbing;
}
</style>
