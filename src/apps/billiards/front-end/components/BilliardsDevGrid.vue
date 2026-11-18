<script setup lang="ts">
/**
 * TEMPORARY development overlay — a 10-unit reference grid in **table coordinates**.
 *
 * The playfield SVG uses `viewBox="0 0 1000 500"`, so one SVG unit is one table unit: a gridline at
 * `x = 30` is drawn exactly where `x = 30` sits in `billiards-types.ts`, the felt geometry and the Rapier
 * world. Use it to read off the coordinates of anything drawn on the table.
 *
 * **Click anywhere to log that point.** The click is mapped through `getScreenCTM()` — the same transform
 * the browser used to paint the viewBox — so the logged numbers match the gridlines precisely even though
 * the SVG is scaled by CSS. Clicked points are kept on screen as numbered dots.
 *
 * Remove this component (and its use in `BilliardsTable.vue`) once the cushion points are pinned down.
 */
import { computed, ref, useTemplateRef } from 'vue';
import { TABLE_HEIGHT, TABLE_WIDTH } from '../../shared/billiards-types';

const props = withDefaults(
  defineProps<{
    /** Grid spacing in table units. */
    step?: number;
    /** Highlight the nose lines (38 / 462 / 36.3 / 963.8) and pocket centres. */
    showLandmarks?: boolean;
    /** Log clicked table coordinates to the console. */
    clickable?: boolean;
  }>(),
  { step: 10, showLandmarks: true, clickable: true },
);

const svgRef = useTemplateRef<SVGSVGElement>('svgRef');

/** Points the user has clicked, in table coordinates. */
const picked = ref<Array<{ x: number; y: number }>>([]);

/**
 * Convert a pointer event to table coordinates.
 *
 * `getScreenCTM()` returns the matrix that maps the SVG's user space (our 0…1000 / 0…500 table space) to
 * screen pixels, so its inverse maps the click back exactly. Doing the arithmetic from `getBoundingClientRect`
 * instead would drift, because `preserveAspectRatio` letterboxes the viewBox inside the element.
 */
function pointFromEvent(event: PointerEvent): { x: number; y: number } | null {
  const svg = svgRef.value;
  if (!svg) {
    return null;
  }
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
  return { x: pt.x, y: pt.y };
}

function onClick(event: PointerEvent): void {
  if (!props.clickable) {
    return;
  }
  const point = pointFromEvent(event);
  if (!point) {
    return;
  }
  /** Round to one decimal — enough to place a collider, and it keeps the log readable. */
  const x = Math.round(point.x * 10) / 10;
  const y = Math.round(point.y * 10) / 10;
  picked.value = [...picked.value, { x, y }];
  console.log(`billiards point: [${x}, ${y}]`);

  const all = picked.value.map((p) => `[${p.x}, ${p.y}]`);
  console.log(`billiards points (${all.length}): ${all.join(', ')}`);
}

interface GridLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'fine' | 'major' | 'mid';
}

const lines = computed<GridLine[]>(() => {
  const step = Math.max(1, props.step);
  const out: GridLine[] = [];
  for (let x = 0; x <= TABLE_WIDTH; x += step) {
    const isMajor = x % 100 === 0;
    const isMid = !isMajor && x % 50 === 0;
    out.push({
      key: `v-${x}`,
      x1: x,
      y1: 0,
      x2: x,
      y2: TABLE_HEIGHT,
      kind: isMajor ? 'major' : isMid ? 'mid' : 'fine',
    });
  }
  for (let y = 0; y <= TABLE_HEIGHT; y += step) {
    const isMajor = y % 100 === 0;
    const isMid = !isMajor && y % 50 === 0;
    out.push({
      key: `h-${y}`,
      x1: 0,
      y1: y,
      x2: TABLE_WIDTH,
      y2: y,
      kind: isMajor ? 'major' : isMid ? 'mid' : 'fine',
    });
  }
  return out;
});

/** Labelled gridlines — every 100 units on both axes. */
const labels = computed(() => {
  const out: Array<{ key: string; x: number; y: number; text: string; anchor: 'start' | 'middle' }> = [];
  for (let x = 0; x <= TABLE_WIDTH; x += 100) {
    out.push({ key: `lx-${x}`, x, y: 14, text: String(x), anchor: 'middle' });
  }
  for (let y = 100; y <= TABLE_HEIGHT; y += 100) {
    out.push({ key: `ly-${y}`, x: 4, y: y - 4, text: String(y), anchor: 'start' });
  }
  return out;
});

/** Nose lines and pocket centres, so the grid can be read against the real table landmarks. */
const NOSE = { top: 38, bottom: 462, left: 36.3, right: 963.8 };
const POCKETS: ReadonlyArray<{ x: number; y: number; r: number }> = [
  { x: 36, y: 36, r: 25 },
  { x: 500, y: 32, r: 23 },
  { x: 964, y: 36, r: 25 },
  { x: 36, y: 464, r: 25 },
  { x: 500, y: 468, r: 23 },
  { x: 964, y: 464, r: 25 },
];
</script>

<template>
  <svg
    ref="svgRef"
    class="billiards-dev-grid-root absolute inset-0 z-[20] h-full w-full"
    :class="clickable ? 'cursor-crosshair' : 'pointer-events-none'"
    :viewBox="`0 0 ${TABLE_WIDTH} ${TABLE_HEIGHT}`"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
    @pointerdown="onClick"
  >
    <g class="billiards-dev-grid">
      <line
        v-for="l in lines"
        :key="l.key"
        :x1="l.x1"
        :y1="l.y1"
        :x2="l.x2"
        :y2="l.y2"
        :class="`billiards-dev-grid__line billiards-dev-grid__line--${l.kind}`"
      />
    </g>

    <g v-if="showLandmarks" class="billiards-dev-grid__landmarks">
      <line :x1="NOSE.left" y1="0" :x2="NOSE.left" :y2="TABLE_HEIGHT" />
      <line :x1="NOSE.right" y1="0" :x2="NOSE.right" :y2="TABLE_HEIGHT" />
      <line x1="0" :y1="NOSE.top" :x2="TABLE_WIDTH" :y2="NOSE.top" />
      <line x1="0" :y1="NOSE.bottom" :x2="TABLE_WIDTH" :y2="NOSE.bottom" />
      <circle v-for="(p, i) in POCKETS" :key="`p-${i}`" :cx="p.x" :cy="p.y" :r="p.r" />
    </g>

    <g v-if="showLandmarks" class="billiards-dev-grid__labels">
      <text
        v-for="l in labels"
        :key="l.key"
        :x="l.x"
        :y="l.y"
        :text-anchor="l.anchor"
      >{{ l.text }}</text>
    </g>

    <!-- Clicked points, numbered in click order so the log can be matched back to the table. -->
    <g class="billiards-dev-grid__picks">
      <g v-for="(p, i) in picked" :key="`pick-${i}`">
        <circle :cx="p.x" :cy="p.y" r="4" />
        <text :x="p.x + 6" :y="p.y - 6">{{ i + 1 }}: {{ p.x }},{{ p.y }}</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.billiards-dev-grid__line {
  stroke: color-mix(in srgb, var(--lab-general-text) 22%, transparent);
  stroke-width: 0.5;
  vector-effect: non-scaling-stroke;
}

.billiards-dev-grid__line--mid {
  stroke: color-mix(in srgb, var(--lab-general-text) 34%, transparent);
  stroke-width: 0.75;
}

.billiards-dev-grid__line--major {
  stroke: color-mix(in srgb, var(--lab-accent-primary) 55%, transparent);
  stroke-width: 1;
}

.billiards-dev-grid__landmarks line {
  stroke: color-mix(in srgb, var(--lab-chat-log-error) 85%, transparent);
  stroke-width: 1.25;
  stroke-dasharray: 6 4;
  vector-effect: non-scaling-stroke;
}

.billiards-dev-grid__landmarks circle {
  fill: none;
  stroke: color-mix(in srgb, var(--lab-chat-log-error) 85%, transparent);
  stroke-width: 1.25;
  vector-effect: non-scaling-stroke;
}

.billiards-dev-grid__labels text {
  fill: var(--lab-general-text);
  font-size: 11px;
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--lab-general-bg);
  stroke-width: 3;
  stroke-linejoin: round;
}

.billiards-dev-grid__picks circle {
  fill: color-mix(in srgb, var(--lab-accent-primary) 70%, transparent);
  stroke: var(--lab-accent-primary);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.billiards-dev-grid__picks text {
  fill: var(--lab-accent-primary);
  font-size: 12px;
  font-weight: 700;
  paint-order: stroke;
  stroke: var(--lab-general-bg);
  stroke-width: 3;
  stroke-linejoin: round;
}
</style>
