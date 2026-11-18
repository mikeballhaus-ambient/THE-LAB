<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { billiardBallVisual } from '../../shared/billiard-ball-visual';
import {
  BILLIARDS_TRAY_BALL_SIZE_REM,
  billiardsTrayTrackMinWidthPx,
  type CollectedTrayBallView,
} from '../composables/useBilliardsCollectedTray';

const props = withDefaults(
  defineProps<{
    balls: CollectedTrayBallView[];
    surfaceStyle: Record<string, string>;
    borderClass: string;
    title?: string;
    lead?: string;
    /** Fixed slot count sets trough min-width (vs match pocket trays). */
    slotCount?: number;
    compact?: boolean;
    /** When set (e.g. `2/7`), shown instead of raw pocketed count in the title. */
    countLabel?: string | null;
    /** Muted title color (vs match opponent tray). */
    mutedTitle?: boolean;
    /** Eight-ball: player's assigned group beside progress count (e.g. `solids`). */
    countGroupTag?: string | null;
    /** Section title badge (default inbox). Vs Lab Assistant: `lab-assistant-flask-icon`. */
    titleIconClasses?: string;
  }>(),
  {
    title: 'Ball tray',
    lead: 'Pocketed balls roll in from the left and stack against the right end.',
    compact: false,
    mutedTitle: false,
    countGroupTag: null,
    titleIconClasses: 'pi pi-inbox',
  },
);

const emit = defineEmits<{
  /** Measured track width, so the roll can be derived from real arc length. */
  measure: [widthPx: number];
}>();

const { generateUniqueId } = useUniqueElementId();
const trackRef = useTemplateRef<HTMLElement>('trackRef');
const hasBalls = computed(() => props.balls.length > 0);

/** Compact match trays fill the column — a 15-slot min-width forces flex overflow. */
const trackMinWidth = computed(() =>
  !props.compact && props.slotCount != null && props.slotCount > 0
    ? `${billiardsTrayTrackMinWidthPx(props.slotCount)}px`
    : undefined,
);

const trackChromeStyle = computed(() => ({
  '--billiards-tray-ball-size': BILLIARDS_TRAY_BALL_SIZE_REM,
}));

let observer: ResizeObserver | null = null;

function reportWidth(): void {
  const el = trackRef.value;
  if (el) {
    emit('measure', el.clientWidth);
  }
}

onMounted(() => {
  reportWidth();
  observer = new ResizeObserver(() => reportWidth());
  if (trackRef.value) {
    observer.observe(trackRef.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <section
    :id="generateUniqueId('billiards-collected-tray-section')"
    class="lab-form-section billiards-collected-tray w-full max-w-full min-w-0 shrink-0 overflow-hidden"
    :class="{
      'billiards-collected-tray--compact': compact,
      'billiards-collected-tray--muted-title': mutedTitle,
    }"
  >
    <h4 :id="generateUniqueId('billiards-collected-tray-title')" class="lab-form-section__title">
      <span class="lab-form-section__icon"><i :class="titleIconClasses" aria-hidden="true" /></span>
      {{ title }}
      <span
        v-if="countGroupTag || countLabel != null || hasBalls"
        class="billiards-collected-tray__count-meta"
      >
        <span v-if="countGroupTag" class="billiards-collected-tray__count-group">{{ countGroupTag }}</span>
        <span v-if="countLabel != null" class="billiards-collected-tray__count">{{ countLabel }}</span>
        <span v-else-if="hasBalls" class="billiards-collected-tray__count">{{ balls.length }}</span>
      </span>
    </h4>
    <p v-if="!compact && lead" class="lab-form-section__lead">
      {{ lead }}
    </p>
    <div class="lab-form-section__children" :class="compact ? 'pt-[0.35rem]' : 'pt-[0.65rem]'">
      <!--
        Ball-return rail. Only as tall as a ball plus the channel walls — the previous
        3.5rem trough read as an empty box because most of its height was never used.
      -->
      <div class="billiards-collected-tray__frame" :class="borderClass" :style="trackChromeStyle">
        <div
          ref="trackRef"
          class="billiards-collected-tray__track relative w-full max-w-full min-w-0 overflow-hidden"
          :style="{
            ...surfaceStyle,
            ...trackChromeStyle,
            ...(trackMinWidth ? { minWidth: trackMinWidth } : {}),
          }"
          :id="generateUniqueId('billiards-collected-tray-track')"
          role="list"
          :aria-label="hasBalls ? `${balls.length} pocketed balls` : 'No pocketed balls yet'"
        >
          <!-- Channel floor: a soft groove the balls sit in. -->
          <div class="billiards-collected-tray__floor" aria-hidden="true" />

          <div
            v-for="(ball, ballIndex) in balls"
            :key="ball.id"
            class="billiards-collected-tray__ball billiard-ball-shell"
            :class="{ 'billiards-collected-tray__ball--rolling': ball.rolling }"
            role="listitem"
            :style="{
              left: `${ball.positionPct}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: ballIndex + 1,
            }"
            :aria-label="`ball ${ball.number}`"
          >
            <!-- No-slip roll: same Δθ/Δs as the table, markings rotate with the shell. -->
            <div
              class="billiards-collected-tray__roll-body"
              :style="{ transform: `rotateZ(${ball.rollAngleDeg}deg)` }"
            >
              <span
                class="billiard-ball-shell__sphere"
                :class="`billiards-ball__sphere--${billiardBallVisual(ball.number).kind}`"
                :style="{ background: billiardBallVisual(ball.number).background }"
              />
              <span
                v-if="billiardBallVisual(ball.number).label"
                class="billiards-collected-tray__number"
                :class="billiardBallVisual(ball.number).numberClass"
              >{{ billiardBallVisual(ball.number).label }}</span>
            </div>
          </div>

          <p
            v-if="!hasBalls"
            class="billiards-collected-tray__empty m-0 text-center text-xs text-lab-general-text-muted"
          >
            No balls pocketed yet.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="../styles/billiard-ball-shell.css"></style>

<style scoped>
.billiards-collected-tray--compact .lab-form-section__title {
  font-size: 0.8rem;
}

.billiards-collected-tray--muted-title .lab-form-section__title {
  color: var(--lab-general-text-muted);
}

.billiards-collected-tray--compact.lab-form-section {
  padding-block: 0.7rem 0.8rem;
}

.billiards-collected-tray__count-meta {
  margin-inline-start: auto;
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
}

.billiards-collected-tray__count-group {
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1;
  text-transform: lowercase;
  color: var(--lab-general-text-muted);
}

.billiards-collected-tray__count {
  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--lab-general-text-muted);
}

/** Outer casing — the wooden/metal rail the return channel is cut into. */
.billiards-collected-tray__frame {
  max-width: 100%;
  overflow: hidden;
  padding: 3px;
  border-radius: 999px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--lab-general-text) 22%, var(--lab-general-border)) 0%,
    color-mix(in srgb, var(--lab-general-text) 10%, var(--lab-general-border)) 55%,
    color-mix(in srgb, var(--lab-general-text) 26%, var(--lab-general-border)) 100%
  );
  box-shadow: 0 1px 3px color-mix(in srgb, #000 32%, transparent);
}

/**
 * The channel. Height tracks `--billiards-tray-ball-size` (see useBilliardsCollectedTray).
 */
.billiards-collected-tray__track {
  height: calc(var(--billiards-tray-ball-size, 1.625rem) + 0.35rem);
  border-radius: 999px;
  box-shadow:
    inset 0 2px 5px color-mix(in srgb, #000 45%, transparent),
    inset 0 -1px 0 color-mix(in srgb, #fff 9%, transparent),
    inset 20px 0 24px -16px color-mix(in srgb, #000 55%, transparent);
}

/** Recessed floor with a lengthwise gradient — reads as depth, not a flat panel. */
.billiards-collected-tray__floor {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, #000 30%, transparent) 0%,
    transparent 38%,
    color-mix(in srgb, #fff 5%, transparent) 78%,
    color-mix(in srgb, #000 18%, transparent) 100%
  );
  pointer-events: none;
  z-index: 0;
}

.billiards-collected-tray__ball {
  position: absolute;
  top: 50%;
  width: var(--billiards-tray-ball-size, 1.625rem);
  height: var(--billiards-tray-ball-size, 1.625rem);
  z-index: 1;
  pointer-events: none;
}

.billiards-collected-tray__ball--rolling {
  transition: none;
  will-change: left;
}

.billiards-collected-tray__roll-body {
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.billiards-collected-tray__ball--rolling .billiards-collected-tray__roll-body {
  will-change: transform;
}

.billiards-collected-tray__number {
  position: relative;
  z-index: 2;
  font-weight: 800;
  line-height: 1;
  pointer-events: none;
  font-family: system-ui, sans-serif;
  letter-spacing: -0.02em;
}

.billiards-collected-tray__number.billiards-ball__number--solid,
.billiards-collected-tray__number.billiards-ball__number--stripe {
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f7f7f7;
  color: #111827;
  font-size: 0.55rem;
  box-shadow: 0 0 0 1px color-mix(in srgb, #111827 20%, transparent);
}

.billiards-collected-tray__number.billiards-ball__number--eight {
  color: #ffffff;
  font-size: 0.58rem;
  text-shadow: 0 0 1px #000, 0 1px 2px #000;
}

.billiards-collected-tray__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 0;
}
</style>
