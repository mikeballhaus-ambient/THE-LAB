<script setup lang="ts">
import { ref, watch } from 'vue';

/**
 * SVG gallows — frame is always drawn; body parts appear with each wrong guess (max 6).
 * New parts animate in when strikes increase (wrong letter).
 */
const props = defineProps<{
  strikes: number;
  maxStrikes: number;
}>();

/** Part index (0–5) currently playing its draw-in animation. */
const animatingPart = ref<number | null>(null);
let animClearTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.strikes,
  (next, prev) => {
    const was = prev ?? 0;
    if (next <= was || next > props.maxStrikes) {
      return;
    }
    animatingPart.value = next - 1;
    if (animClearTimer) {
      clearTimeout(animClearTimer);
    }
    animClearTimer = setTimeout(() => {
      animatingPart.value = null;
      animClearTimer = undefined;
    }, 650);
  },
);

function partVisible(index: number): boolean {
  return props.strikes > index;
}

function partClasses(index: number): Record<string, boolean> {
  return {
    'hangman-gallows__figure': true,
    'hangman-gallows__figure--draw': animatingPart.value === index,
    'hangman-gallows__figure--fade': index === 0,
  };
}
</script>

<template>
  <svg
    class="hangman-gallows"
    viewBox="0 0 120 160"
    role="img"
    :aria-label="`Hangman figure, ${strikes} of ${maxStrikes} strikes`"
  >
    <!-- Gallows frame -->
    <line class="hangman-gallows__frame" x1="12" y1="148" x2="108" y2="148" />
    <line class="hangman-gallows__frame" x1="36" y1="148" x2="36" y2="20" />
    <line class="hangman-gallows__frame" x1="36" y1="20" x2="88" y2="20" />
    <line class="hangman-gallows__frame" x1="88" y1="20" x2="88" y2="36" />

    <circle
      v-if="partVisible(0)"
      :class="partClasses(0)"
      cx="88"
      cy="48"
      r="12"
    />
    <line
      v-if="partVisible(1)"
      :class="partClasses(1)"
      pathLength="1"
      x1="88"
      y1="60"
      x2="88"
      y2="98"
    />
    <line
      v-if="partVisible(2)"
      :class="partClasses(2)"
      pathLength="1"
      x1="88"
      y1="72"
      x2="68"
      y2="88"
    />
    <line
      v-if="partVisible(3)"
      :class="partClasses(3)"
      pathLength="1"
      x1="88"
      y1="72"
      x2="108"
      y2="88"
    />
    <line
      v-if="partVisible(4)"
      :class="partClasses(4)"
      pathLength="1"
      x1="88"
      y1="98"
      x2="72"
      y2="132"
    />
    <line
      v-if="partVisible(5)"
      :class="partClasses(5)"
      pathLength="1"
      x1="88"
      y1="98"
      x2="104"
      y2="132"
    />
  </svg>
</template>

<style scoped>
.hangman-gallows {
  width: 100%;
  max-width: 9rem;
  height: auto;
  display: block;
}

.hangman-gallows__frame {
  stroke: var(--lab-general-border, #3d4b5c);
  stroke-width: 4;
  stroke-linecap: round;
}

.hangman-gallows__figure {
  stroke: var(--lab-error, #f87171);
  stroke-width: 3;
  stroke-linecap: round;
  fill: none;
}

.hangman-gallows__figure--draw:not(.hangman-gallows__figure--fade) {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: hangman-gallows-draw 0.55s ease-out forwards;
}

.hangman-gallows__figure--draw.hangman-gallows__figure--fade {
  opacity: 0;
  animation: hangman-gallows-fade 0.45s ease-out forwards;
}

@keyframes hangman-gallows-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes hangman-gallows-fade {
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hangman-gallows__figure--draw {
    animation: none;
    stroke-dashoffset: 0;
    opacity: 1;
  }
}
</style>
