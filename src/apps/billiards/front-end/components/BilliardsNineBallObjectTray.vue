<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { billiardBallVisual } from '../../shared/billiard-ball-visual';
import type { BilliardsBall } from '../../shared/billiards-types';
import { lowestLiveBallNumber } from '../../shared/billiards-rules';
import {
  BILLIARDS_NINE_BALL_TRAY_SLOTS,
  billiardsTrayTrackMinWidthPx,
} from '../composables/useBilliardsCollectedTray';

const props = defineProps<{
  balls: BilliardsBall[];
  surfaceStyle: Record<string, string>;
  borderClass: string;
}>();

const { generateUniqueId } = useUniqueElementId();

const objectBallNumber = computed(() => lowestLiveBallNumber(props.balls));

const trackMinWidth = computed(() => `${billiardsTrayTrackMinWidthPx(BILLIARDS_NINE_BALL_TRAY_SLOTS)}px`);

function isPocketed(number: number): boolean {
  return props.balls.some((b) => b.number === number && b.pocketed);
}

function isObjectBall(number: number): boolean {
  return objectBallNumber.value === number;
}
</script>

<template>
  <section
    :id="generateUniqueId('billiards-nine-object-tray-section')"
    class="lab-form-section billiards-nine-object-tray w-full max-w-full min-w-0 shrink-0"
  >
    <h4 :id="generateUniqueId('billiards-nine-object-tray-title')" class="lab-form-section__title">
      <span class="lab-form-section__icon"><i class="pi pi-circle" aria-hidden="true" /></span>
      Object balls
      <span v-if="objectBallNumber != null" class="billiards-nine-object-tray__object-hint">
        Hit <strong>{{ objectBallNumber }}</strong> first
      </span>
    </h4>
    <p class="lab-form-section__lead">
      Lowest ball still on the table is the legal object ball. Pocketed balls are dimmed.
    </p>
    <div class="lab-form-section__children pt-[0.65rem]">
      <div class="billiards-nine-object-tray__frame" :class="borderClass">
        <div
          class="billiards-nine-object-tray__track flex w-full max-w-full items-center justify-between gap-1 overflow-x-auto px-2 py-1.5"
          :style="{ ...surfaceStyle, minWidth: trackMinWidth }"
          :id="generateUniqueId('billiards-nine-object-tray-track')"
          role="list"
          aria-label="Nine-ball object ball sequence"
        >
          <div
            v-for="n in 9"
            :key="n"
            role="listitem"
            class="billiards-nine-object-tray__chip billiard-ball-shell"
            :class="{
              'billiards-nine-object-tray__chip--pocketed': isPocketed(n),
              'billiards-nine-object-tray__chip--object': isObjectBall(n),
              'billiards-nine-object-tray__chip--illegal':
                !isPocketed(n) && !isObjectBall(n) && objectBallNumber != null,
            }"
            :aria-label="
              isPocketed(n)
                ? `Ball ${n} pocketed`
                : isObjectBall(n)
                  ? `Ball ${n}, object ball — hit first`
                  : !isPocketed(n) && objectBallNumber != null
                    ? `Ball ${n} on table — not the object ball`
                    : `Ball ${n} on table`
            "
          >
            <span
              class="billiard-ball-shell__sphere"
              :class="`billiards-ball__sphere--${billiardBallVisual(n).kind}`"
              :style="{ background: billiardBallVisual(n).background }"
            />
            <span
              class="billiards-nine-object-tray__number"
              :class="billiardBallVisual(n).numberClass"
            >{{ billiardBallVisual(n).label }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="../styles/billiard-ball-shell.css"></style>

<style scoped>
.billiards-nine-object-tray__object-hint {
  margin-inline-start: auto;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--lab-general-text-muted);
}

.billiards-nine-object-tray__object-hint strong {
  color: var(--lab-accent-primary);
  font-weight: 700;
}

.billiards-nine-object-tray__frame {
  max-width: 100%;
  overflow: hidden;
  padding: 3px;
  border-radius: 0.5rem;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--lab-general-text) 22%, var(--lab-general-border)) 0%,
    color-mix(in srgb, var(--lab-general-text) 10%, var(--lab-general-border)) 55%,
    color-mix(in srgb, var(--lab-general-text) 26%, var(--lab-general-border)) 100%
  );
  box-shadow: 0 1px 3px color-mix(in srgb, #000 32%, transparent);
}

.billiards-nine-object-tray__track {
  border-radius: 0.4rem;
  box-shadow:
    inset 0 2px 5px color-mix(in srgb, #000 45%, transparent),
    inset 0 -1px 0 color-mix(in srgb, #fff 9%, transparent);
}

.billiards-nine-object-tray__chip {
  position: relative;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: opacity 0.2s ease, box-shadow 0.2s ease;
}

.billiards-nine-object-tray__chip--pocketed {
  opacity: 0.38;
}

.billiards-nine-object-tray__chip--object {
  box-shadow:
    0 0 0 2px var(--lab-accent-primary),
    0 0 0 4px color-mix(in srgb, var(--lab-accent-primary) 28%, transparent);
}

.billiards-nine-object-tray__chip--illegal {
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--lab-chat-log-error) 72%, var(--lab-general-border)),
    0 0 0 4px color-mix(in srgb, var(--lab-chat-log-error) 22%, transparent);
}

.billiards-nine-object-tray__number {
  position: relative;
  z-index: 2;
  font-weight: 800;
  line-height: 1;
  font-size: 0.58rem;
  pointer-events: none;
}

.billiards-nine-object-tray__number.billiards-ball__number--solid,
.billiards-nine-object-tray__number.billiards-ball__number--stripe {
  width: 0.95rem;
  height: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f7f7f7;
  color: #111827;
  font-size: 0.52rem;
  box-shadow: 0 0 0 1px color-mix(in srgb, #111827 20%, transparent);
}

.billiards-nine-object-tray__chip--pocketed .billiards-nine-object-tray__number {
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
}
</style>
