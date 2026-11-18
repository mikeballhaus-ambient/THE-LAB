<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { BilliardsBall } from '../../shared/billiards-types';
import {
  CUE_AIM_GUTTER_PX,
  CUE_AIM_VIEW_BOX,
  tablePointToCueOverlayPercent,
} from '../../shared/table-stage-layout';
import {
  BALL_RADIUS,
  CUE_VISUAL_LENGTH_PX,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from '../../shared/billiards-types';
import { powerGripPoint } from '../../shared/cue-geometry';

const props = defineProps<{
  cueBall: BilliardsBall;
  angleRad: number;
  pullPower: number;
  disabled?: boolean;
  /** Show cue stick during scripted replay (opponent shot). */
  forceVisible?: boolean;
}>();

const emit = defineEmits<{
  powerRelease: [];
  pointerPosition: [point: { x: number; y: number }];
  dragStart: [mode: 'aim' | 'power'];
  dragEnd: [];
}>();

/**
 * Cue input uses **plain pointer events**, not the drag-and-drop library.
 *
 * The DnD handles deliberately suppress their drag ghost, which also stops the preview
 * position from updating, and they capture the pointer — so neither the preview-based nor
 * the stage-level listener ever saw a live position. Power therefore stayed pinned at its
 * default no matter how far the cue was pulled.
 *
 * Handling the pointer directly makes the input deterministic: the overlay owns the
 * geometry, so it can convert the raw position into a pull distance itself.
 */
const { generateUniqueId } = useUniqueElementId();
const cueStickGradientId = generateUniqueId('billiards-cue-stick-grad');
const cueStickShadeId = generateUniqueId('billiards-cue-stick-shade');
const cueStickSheenId = generateUniqueId('billiards-cue-stick-sheen');
const cueWrapGradientId = generateUniqueId('billiards-cue-wrap-grad');
const overlayRef = useTemplateRef<HTMLElement>('overlayRef');
const aimRef = useTemplateRef<HTMLElement>('aimRef');
const pullRef = useTemplateRef<HTMLElement>('pullRef');

const cueHovered = ref(false);
const isAimDragging = ref(false);
const isPowerDragging = ref(false);
const pressStarted = ref(false);

const showAimControls = computed(
  () => props.forceVisible || cueHovered.value || isAimDragging.value || isPowerDragging.value,
);

/** Table coordinates of a client point, using the cue overlay's own mapping. */
function tablePointFromClient(clientX: number, clientY: number): { x: number; y: number } | null {
  const el = overlayRef.value;
  if (!el) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const overlayW = TABLE_WIDTH + 2 * CUE_AIM_GUTTER_PX;
  const overlayH = TABLE_HEIGHT + 2 * CUE_AIM_GUTTER_PX;
  const nx = ((clientX - rect.left) / rect.width) * overlayW - CUE_AIM_GUTTER_PX;
  const ny = ((clientY - rect.top) / rect.height) * overlayH - CUE_AIM_GUTTER_PX;
  return { x: nx, y: ny };
}

function beginDrag(mode: 'aim' | 'power', event: PointerEvent): void {
  if (props.disabled) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  pressStarted.value = true;
  if (mode === 'aim') {
    isAimDragging.value = true;
  } else {
    isPowerDragging.value = true;
  }
  emit('dragStart', mode);
  const point = tablePointFromClient(event.clientX, event.clientY);
  if (point) {
    emit('pointerPosition', point);
  }
  window.addEventListener('pointermove', onWindowPointerMove);
  window.addEventListener('pointerup', onWindowPointerUp, { once: true });
  window.addEventListener('pointercancel', onWindowPointerCancel, { once: true });
}

function onWindowPointerMove(event: PointerEvent): void {
  if (!isAimDragging.value && !isPowerDragging.value) {
    return;
  }
  const point = tablePointFromClient(event.clientX, event.clientY);
  if (point) {
    emit('pointerPosition', point);
  }
}

function releaseWindowListeners(): void {
  window.removeEventListener('pointermove', onWindowPointerMove);
  window.removeEventListener('pointerup', onWindowPointerUp);
  window.removeEventListener('pointercancel', onWindowPointerCancel);
}

function onWindowPointerUp(): void {
  releaseWindowListeners();
  const wasPower = isPowerDragging.value;
  isAimDragging.value = false;
  isPowerDragging.value = false;
  pressStarted.value = false;
  emit('dragEnd');
  if (wasPower) {
    emit('powerRelease');
  }
}

function onWindowPointerCancel(): void {
  releaseWindowListeners();
  isAimDragging.value = false;
  isPowerDragging.value = false;
  pressStarted.value = false;
  emit('dragEnd');
}

onBeforeUnmount(() => {
  releaseWindowListeners();
});

function onCueStickPointerEnter(): void {
  cueHovered.value = true;
}

function onAimSurfacePointerEnter(): void {
  cueHovered.value = true;
}

function onOverlayPointerLeave(event: PointerEvent): void {
  if (isAimDragging.value || isPowerDragging.value) {
    return;
  }
  const next = event.relatedTarget as Node | null;
  if (next && overlayRef.value?.contains(next)) {
    return;
  }
  cueHovered.value = false;
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      onWindowPointerCancel();
    }
  },
);

const powerPercent = computed(() => Math.round(props.pullPower * 100));

const angleDeg = computed(() => (props.angleRad * 180) / Math.PI);

/** Pivot all cue shaft geometry on the cue-ball center (table space). */
const cuePivotTransform = computed(
  () => `translate(${props.cueBall.x}, ${props.cueBall.y}) rotate(${angleDeg.value})`,
);

/** Shooter-side tip in pivot-local space (+X = shot direction). */
const tipLocalX = -(BALL_RADIUS + 3);
const buttLocalX = tipLocalX - CUE_VISUAL_LENGTH_PX;

const powerGrip = computed(() => powerGripPoint(props.cueBall, props.angleRad, props.pullPower));

const cueOverlayInsetLeft = `${(-CUE_AIM_GUTTER_PX / TABLE_WIDTH) * 100}%`;
const cueOverlayInsetTop = `${(-CUE_AIM_GUTTER_PX / TABLE_HEIGHT) * 100}%`;
const cueOverlayWidth = `${((TABLE_WIDTH + 2 * CUE_AIM_GUTTER_PX) / TABLE_WIDTH) * 100}%`;
const cueOverlayHeight = `${((TABLE_HEIGHT + 2 * CUE_AIM_GUTTER_PX) / TABLE_HEIGHT) * 100}%`;

const gripStyle = computed(() => tablePointToCueOverlayPercent(powerGrip.value));

const powerReadoutStyle = computed(() => {
  const base = tablePointToCueOverlayPercent(powerGrip.value);
  return {
    ...base,
    transform: 'translate(-50%, calc(-50% - 1.35rem))',
  };
});

/** Table units from cue center to aim-handle center — must match offset below. */
const AIM_HANDLE_DISTANCE_TABLE = 90;
/**
 * Dashed aim guide in pivot space (+X = shot): cue-ball leading edge → just inside the handle
 * so the line does not read as extending through the directional dot.
 */
const AIM_GUIDE_LINE_START_X = BALL_RADIUS;
const AIM_GUIDE_LINE_END_X = AIM_HANDLE_DISTANCE_TABLE - 9;

const aimHandleStyle = computed(() =>
  tablePointToCueOverlayPercent({
    x: props.cueBall.x + Math.cos(props.angleRad) * AIM_HANDLE_DISTANCE_TABLE,
    y: props.cueBall.y + Math.sin(props.angleRad) * AIM_HANDLE_DISTANCE_TABLE,
  }),
);

const CUE_LENGTH_LOCAL = Math.abs(buttLocalX - tipLocalX);

/** Local x for a normalised position along the cue (0 = tip, 1 = butt). */
function cueXAt(t: number): number {
  return tipLocalX - t * CUE_LENGTH_LOCAL;
}

/**
 * Half-width of the cue at `t`, in table units.
 *
 * A real cue is **not** a wedge: the shaft stays close to constant through its whole
 * length, the joint is a discrete step, and the butt swells over the forearm before
 * easing back at the cap. The old single taper from 3.2 → 10.5 over the entire shaft is
 * what made it read as an elongated triangle.
 */
const CUE_WIDTH_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 2.4],
  [0.06, 2.7],
  [0.3, 3.05],
  [0.52, 3.45],
  [0.575, 4.1],
  [0.62, 4.7],
  [0.8, 6.9],
  [0.9, 7.8],
  [0.955, 8.2],
  [0.985, 7.9],
  [1, 7.0],
];

function cueHalfWidthAt(t: number): number {
  const first = CUE_WIDTH_STOPS[0];
  const last = CUE_WIDTH_STOPS[CUE_WIDTH_STOPS.length - 1];
  if (!first || !last) {
    return 3;
  }
  if (t <= first[0]) {
    return first[1];
  }
  for (let i = 1; i < CUE_WIDTH_STOPS.length; i += 1) {
    const curr = CUE_WIDTH_STOPS[i];
    const prev = CUE_WIDTH_STOPS[i - 1];
    if (!curr || !prev) {
      continue;
    }
    if (t <= curr[0]) {
      const span = curr[0] - prev[0];
      const k = span > 1e-6 ? (t - prev[0]) / span : 0;
      return prev[1] + (curr[1] - prev[1]) * k;
    }
  }
  return last[1];
}

const CUE_SAMPLES = 56;

function cueProfilePolygon(fromT: number, toT: number, shrink: number): string {
  const upper: string[] = [];
  const lower: string[] = [];
  for (let i = 0; i <= CUE_SAMPLES; i += 1) {
    const t = fromT + ((toT - fromT) * i) / CUE_SAMPLES;
    const x = cueXAt(t).toFixed(2);
    const hw = cueHalfWidthAt(t) * shrink;
    upper.push(`${x},${hw.toFixed(2)}`);
    lower.push(`${x},${(-hw).toFixed(2)}`);
  }
  lower.reverse();
  return [...upper, ...lower].join(' ');
}

/** Full cue silhouette, sampled so the butt swell is smooth rather than a straight edge. */
const cueStickPoints = computed(() => cueProfilePolygon(0, 1, 1));

/**
 * Specular band along the upper half of the shaft. Without it a gradient-filled shape
 * still reads as flat card; the highlight is what implies a cylinder.
 */
const cueSheenPoints = computed(() => cueProfilePolygon(0.05, 0.96, 0.42));
</script>

<template>
  <div
    ref="overlayRef"
    class="cue-aim-overlay"
    :class="{
      'cue-aim-overlay--aiming': showAimControls,
      'cue-aim-overlay--power-pull': isPowerDragging,
    }"
    @pointerleave="onOverlayPointerLeave"
  >
    <svg class="cue-aim-svg" :viewBox="CUE_AIM_VIEW_BOX" preserveAspectRatio="xMidYMid meet">
      <g :transform="cuePivotTransform">
        <defs>
          <!-- Along-shaft grain. The butt now eases to a warm honey maple instead of
               collapsing to near-black, which is what made it look like a shadow. -->
          <linearGradient
            :id="cueStickGradientId"
            gradientUnits="userSpaceOnUse"
            :x1="tipLocalX"
            y1="0"
            :x2="buttLocalX"
            y2="0"
          >
            <stop offset="0%" stop-color="#fdfbf6" />
            <stop offset="6%" stop-color="#efe7d6" />
            <stop offset="24%" stop-color="#dcc79c" />
            <stop offset="52%" stop-color="#c9a86c" />
            <stop offset="74%" stop-color="#a8834a" />
            <stop offset="100%" stop-color="#6f5227" />
          </linearGradient>
          <!-- Across-shaft shading: light above, dark below, so it reads as a cylinder. -->
          <linearGradient :id="cueStickShadeId" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.30)" />
            <stop offset="32%" stop-color="rgba(255,255,255,0.06)" />
            <stop offset="62%" stop-color="rgba(0,0,0,0.10)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.30)" />
          </linearGradient>
          <linearGradient :id="cueStickSheenId" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(255,255,255,0)" />
            <stop offset="45%" stop-color="rgba(255,255,255,0.48)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient
            :id="cueWrapGradientId"
            gradientUnits="userSpaceOnUse"
            :x1="cueXAt(0.6)"
            y1="0"
            :x2="buttLocalX"
            y2="0"
          >
            <stop offset="0%" stop-color="#3f342c" />
            <stop offset="100%" stop-color="#26201a" />
          </linearGradient>
        </defs>
        <line
          v-if="showAimControls && cueStickPoints"
          class="cue-aim-line cue-aim-line--visible"
          :x1="AIM_GUIDE_LINE_START_X"
          y1="0"
          :x2="AIM_GUIDE_LINE_END_X"
          y2="0"
        />
        <line
          v-if="showAimControls && cueStickPoints"
          class="cue-aim-line-hit"
          :x1="AIM_GUIDE_LINE_START_X"
          y1="0"
          :x2="AIM_GUIDE_LINE_END_X"
          y2="0"
          @pointerenter="onAimSurfacePointerEnter"
        />
        <polygon
          v-if="cueStickPoints"
          class="cue-stick__hit"
          :points="cueStickPoints"
          @pointerenter="onCueStickPointerEnter"
          @pointerdown="onCueStickPointerEnter"
        />
        <polygon
          v-if="cueStickPoints"
          class="cue-stick__shaft"
          :points="cueStickPoints"
          :fill="`url(#${cueStickGradientId})`"
          pointer-events="none"
        />
        <!-- Linen wrap on the forearm — breaks up the wood and sells the scale. -->
        <polygon
          class="cue-stick__wrap"
          :points="cueProfilePolygon(0.6, 0.965, 1.012)"
          :fill="`url(#${cueWrapGradientId})`"
          pointer-events="none"
        />
        <!-- Brass joint ring at the customary ~57% mark. -->
        <polygon
          class="cue-stick__joint"
          :points="cueProfilePolygon(0.565, 0.588, 1.03)"
          pointer-events="none"
        />
        <!-- White ferrule, then the blue tip itself. -->
        <polygon
          class="cue-stick__ferrule"
          :points="cueProfilePolygon(0.012, 0.075, 1.02)"
          pointer-events="none"
        />
        <polygon
          class="cue-stick__tip"
          :points="cueProfilePolygon(0, 0.014, 1.02)"
          pointer-events="none"
        />
        <polygon
          class="cue-stick__shade"
          :points="cueStickPoints"
          :fill="`url(#${cueStickShadeId})`"
          pointer-events="none"
        />
        <polygon
          class="cue-stick__sheen"
          :points="cueSheenPoints"
          :fill="`url(#${cueStickSheenId})`"
          pointer-events="none"
        />
      </g>
      <circle
        v-if="showAimControls && cueStickPoints"
        class="cue-stick__grip-ring"
        :class="{ 'cue-stick__grip-ring--active': isPowerDragging }"
        :cx="powerGrip.x"
        :cy="powerGrip.y"
        r="16"
      />
    </svg>
    <div
      v-show="showAimControls"
      ref="aimRef"
      class="cue-handle cue-handle--aim pointer-events-auto"
      :style="aimHandleStyle"
      :id="generateUniqueId('billiards-aim-handle')"
      title="Drag toward the target (aim line follows)"
      @pointerenter="onAimSurfacePointerEnter"
      @pointerdown="beginDrag('aim', $event)"
    />
    <!-- Invisible hit target — power is shown by the grip ring on the cue shaft. -->
    <div
      v-show="showAimControls"
      ref="pullRef"
      class="cue-handle cue-handle--pull pointer-events-auto"
      :class="{ 'cue-handle--pull-active': isPowerDragging }"
      :style="gripStyle"
      :id="generateUniqueId('billiards-pull-handle')"
      title="Drag along the cue to set power (0% = cancel). Release on the table to shoot or cancel"
      @pointerdown="beginDrag('power', $event)"
    />
    <div
      v-show="isPowerDragging"
      class="cue-power-readout pointer-events-none"
      :class="{ 'cue-power-readout--active': isPowerDragging }"
      :style="powerReadoutStyle"
      aria-live="polite"
    >
      {{ powerPercent }}%
    </div>
  </div>
</template>

<style scoped>
.cue-aim-overlay {
  position: absolute;
  left: v-bind(cueOverlayInsetLeft);
  top: v-bind(cueOverlayInsetTop);
  width: v-bind(cueOverlayWidth);
  height: v-bind(cueOverlayHeight);
  z-index: 8;
  pointer-events: none;
  overflow: visible;
}

.cue-aim-overlay--power-pull {
  z-index: 40;
}

/** Capture pointer over empty overlay while aiming so the felt/ball does not steal hover. */
.cue-aim-overlay--aiming {
  z-index: 24;
  pointer-events: auto;
}

.cue-aim-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.cue-stick__hit {
  fill: transparent;
  stroke: transparent;
  stroke-width: 32;
  pointer-events: stroke;
  cursor: pointer;
}

.cue-stick__wrap,
.cue-stick__joint,
.cue-stick__ferrule,
.cue-stick__tip,
.cue-stick__shade,
.cue-stick__sheen {
  stroke: none;
}

.cue-stick__joint {
  fill: #b9a06a;
}

.cue-stick__ferrule {
  fill: #f6f4ee;
}

.cue-stick__tip {
  fill: #4c6f93;
}

.cue-stick__shaft {
  stroke: color-mix(in srgb, var(--lab-general-text) 45%, #221a13);
  stroke-width: 0.9;
  opacity: 0.98;
  filter: drop-shadow(0 1px 1.5px color-mix(in srgb, var(--billiards-piece-shadow-near) 85%, transparent))
    drop-shadow(0 2.5px 5px color-mix(in srgb, var(--billiards-piece-shadow-far) 80%, transparent));
}

.cue-aim-line--visible {
  stroke: color-mix(in srgb, var(--lab-general-text) 75%, white);
  stroke-width: 2;
  stroke-dasharray: 6 4;
  opacity: 0.85;
  pointer-events: none;
}

.cue-aim-line-hit {
  stroke: transparent;
  stroke-width: 32;
  pointer-events: stroke;
  cursor: crosshair;
}

.cue-stick__grip-ring {
  fill: color-mix(in srgb, var(--lab-general-bg) 35%, transparent);
  stroke: color-mix(in srgb, var(--lab-button-border-hover) 75%, white);
  stroke-width: 2;
  stroke-dasharray: 4 3;
  pointer-events: none;
  opacity: 0.9;
}

.cue-stick__grip-ring--active {
  fill: color-mix(in srgb, var(--lab-button-border-hover) 18%, var(--lab-general-bg));
  stroke-width: 2.5;
  opacity: 1;
}

.cue-handle {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  touch-action: none;
  cursor: grab;
  z-index: 5;
  pointer-events: auto;
}

.cue-handle--aim {
  width: 18px;
  height: 18px;
  background: color-mix(in srgb, var(--lab-accent-primary, cyan) 70%, white);
  border: 2px solid var(--lab-general-bg);
}

.cue-handle--pull {
  width: 36px;
  height: 36px;
  opacity: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.cue-handle--pull-active {
  cursor: grabbing;
}

.cue-power-readout {
  position: absolute;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--lab-general-text);
  background: color-mix(in srgb, var(--lab-general-bg) 92%, transparent);
  border: 1px solid var(--lab-general-border);
  z-index: 7;
  min-width: 2.75rem;
  text-align: center;
}

.cue-power-readout--active {
  background: color-mix(in srgb, var(--lab-button-border-hover) 25%, var(--lab-general-bg));
  border-color: color-mix(in srgb, var(--lab-button-border-hover) 65%, var(--lab-general-border));
}
</style>
