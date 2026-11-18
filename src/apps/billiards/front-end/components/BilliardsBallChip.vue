<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { makeDraggable, useDnDProvider } from '@vue-dnd-kit/core';
import type { BilliardsBall } from '../../shared/billiards-types';
import { BALL_RADIUS, TABLE_HEIGHT, TABLE_WIDTH } from '../../shared/billiards-types';
import { billiardRollDegreesFromTableDistance } from '../../shared/billiard-roll-visual';
import { billiardBallVisual } from '../../shared/billiard-ball-visual';

const props = defineProps<{
  ball: BilliardsBall;
  canDrag: boolean;
  rolling?: boolean;
  /** Invisible hit target while 3D canvas renders the ball. */
  dragProxy?: boolean;
}>();

const el = useTemplateRef<HTMLElement>('el');
const provider = useDnDProvider();

const { isDragging } = makeDraggable(el, {
  disabled: !props.canDrag,
  data: () => ({ ballId: props.ball.id, number: props.ball.number }),
});

watch(
  () => props.canDrag,
  (enabled) => {
    const node = el.value;
    if (!node) {
      return;
    }
    const entry = provider.entities.draggableMap.get(node);
    if (entry) {
      entry.disabled = !enabled;
    }
  },
);

const visual = computed(() => billiardBallVisual(props.ball.number));

const rollDeg = ref(0);
let lastX = props.ball.x;
let lastY = props.ball.y;

watch(
  () => props.rolling,
  (rolling) => {
    if (rolling) {
      rollDeg.value = 0;
      lastX = props.ball.x;
      lastY = props.ball.y;
    }
  },
);

watch(
  () => [props.ball.x, props.ball.y, props.rolling] as const,
  ([x, y, rolling]) => {
    if (!rolling) {
      lastX = x;
      lastY = y;
      return;
    }
    const dx = x - lastX;
    const dy = y - lastY;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.02) {
      rollDeg.value += billiardRollDegreesFromTableDistance(dist);
    }
    lastX = x;
    lastY = y;
  },
);

const positionStyle = computed(() => {
  const wPct = ((BALL_RADIUS * 2) / TABLE_WIDTH) * 100;
  const hPct = ((BALL_RADIUS * 2) / TABLE_HEIGHT) * 100;
  const cx = (props.ball.x / TABLE_WIDTH) * 100;
  const cy = (props.ball.y / TABLE_HEIGHT) * 100;
  return {
    left: `${cx}%`,
    top: `${cy}%`,
    width: `${wPct}%`,
    height: `${hPct}%`,
    transform: 'translate(-50%, -50%)',
  };
});

const rollStyle = computed(() => {
  if (!props.rolling) {
    return undefined;
  }
  return { transform: `rotate(${rollDeg.value}deg)` };
});

const sphereStyle = computed(() => ({
  background: visual.value.background,
}));
</script>

<template>
  <div
    ref="el"
    class="billiards-ball billiard-ball-shell"
    :class="{
      'billiard-ball-shell--ghost': isDragging,
      'billiards-ball--rolling': rolling,
      'billiards-ball--drag-proxy': dragProxy,
    }"
    :style="positionStyle"
  >
    <template v-if="!dragProxy">
    <div
      class="billiard-ball-shell__felt-shadow"
      aria-hidden="true"
    />
    <div class="billiards-ball__body" :style="rollStyle">
      <div
        class="billiard-ball-shell__sphere"
        :class="`billiards-ball__sphere--${visual.kind}`"
        :style="sphereStyle"
      />
      <span
        v-if="rolling"
        class="billiards-ball__roll-mark"
        aria-hidden="true"
      />
    </div>
    <span
      v-if="visual.label"
      class="billiards-ball__number"
      :class="visual.numberClass"
    >{{ visual.label }}</span>
    </template>
  </div>
</template>

<style scoped src="../styles/billiard-ball-shell.css"></style>

<style scoped>
.billiards-ball--drag-proxy {
  opacity: 0;
  z-index: 5;
}

.billiards-ball--drag-proxy.billiard-ball-shell--ghost {
  opacity: 0.35;
  outline: 2px dashed var(--lab-button-border-hover);
}

.billiards-ball {
  position: absolute;
  z-index: 2;
  cursor: grab;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.billiards-ball__body {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.billiards-ball--rolling {
  transition: none;
  will-change: left, top;
}

.billiards-ball--rolling .billiards-ball__body {
  will-change: transform;
}

.billiards-ball__roll-mark {
  position: absolute;
  z-index: 2;
  top: 18%;
  left: 62%;
  width: 14%;
  height: 14%;
  border-radius: 50%;
  pointer-events: none;
  background: color-mix(in srgb, var(--billiards-cloth-shadow, #0f172a) 55%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, black 25%, transparent);
}

.billiards-ball__number {
  position: relative;
  z-index: 3;
  font-weight: 800;
  line-height: 1;
  pointer-events: none;
  font-family: system-ui, sans-serif;
  letter-spacing: -0.02em;
}

.billiards-ball__number--solid,
.billiards-ball__number--stripe {
  width: 50cqmin;
  height: 50cqmin;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f7f7f7;
  color: #111827;
  font-size: 28cqmin;
  box-shadow:
    0 0 0 1px color-mix(in srgb, #111827 22%, transparent),
    0 1px 2px color-mix(in srgb, #111827 18%, transparent);
}

.billiards-ball__number--eight {
  font-size: 30cqmin;
  color: #ffffff;
  text-shadow:
    0 0 1px #000,
    0 1px 2px #000,
    0 0 6px color-mix(in srgb, black 55%, transparent);
}

.billiards-ball__number--stripe {
  font-size: 26cqmin;
}
</style>
