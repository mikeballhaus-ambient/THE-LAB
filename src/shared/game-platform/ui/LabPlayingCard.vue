<script setup lang="ts">
import { computed } from 'vue';
import {
  cardAriaLabel,
  isRedSuit,
  parseCardCode,
  rankDisplay,
  suitSymbol,
  type LabCardSuit,
} from './lab-playing-card-code';

const props = defineProps<{
  code?: string;
  faceDown?: boolean;
  size?: 'sm' | 'md';
}>();

const parsed = computed(() => (props.code ? parseCardCode(props.code) : null));
const rank = computed(() => (parsed.value ? rankDisplay(parsed.value.rank) : ''));
const suit = computed(() => parsed.value?.suit as LabCardSuit | undefined);
const symbol = computed(() => (suit.value ? suitSymbol(suit.value) : ''));
const isRed = computed(() => (suit.value ? isRedSuit(suit.value) : false));
const label = computed(() =>
  props.faceDown || !props.code ? 'Face-down card' : cardAriaLabel(props.code),
);
</script>

<template>
  <div
    class="lab-playing-card select-none"
    :class="{
      'lab-playing-card--face-down': faceDown || !parsed,
      'lab-playing-card--face-up': !faceDown && !!parsed,
      'lab-playing-card--red': isRed,
      'lab-playing-card--black': !faceDown && !!parsed && !isRed,
      'lab-playing-card--sm': size === 'sm',
    }"
    role="img"
    :aria-label="label"
  >
    <template v-if="!faceDown && code && parsed">
      <span class="lab-playing-card__corner lab-playing-card__corner--tl" aria-hidden="true">
        <span class="lab-playing-card__rank">{{ rank }}</span>
        <span class="lab-playing-card__suit-sm">{{ symbol }}</span>
      </span>
      <span class="lab-playing-card__pip" aria-hidden="true">{{ symbol }}</span>
      <span class="lab-playing-card__corner lab-playing-card__corner--br" aria-hidden="true">
        <span class="lab-playing-card__rank">{{ rank }}</span>
        <span class="lab-playing-card__suit-sm">{{ symbol }}</span>
      </span>
    </template>
    <span v-else class="lab-playing-card__back" aria-hidden="true" />
  </div>
</template>

<style scoped>
.lab-playing-card {
  width: 4.5rem;
  height: 6.25rem;
  position: relative;
  border-radius: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, var(--lab-prime-surface-950));
  box-sizing: border-box;
  flex-shrink: 0;
}

.lab-playing-card--sm {
  width: 3.35rem;
  height: 4.65rem;
}

.lab-playing-card--sm .lab-playing-card__pip {
  font-size: 1.45rem;
}

.lab-playing-card--face-up {
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--lab-prime-surface-50) 92%, white) 0%,
    color-mix(in srgb, var(--lab-prime-surface-100) 88%, var(--lab-prime-surface-200)) 100%
  );
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.35),
    0 2px 6px rgb(0 0 0 / 0.22),
    0 0 0 1px color-mix(in srgb, var(--lab-prime-surface-300) 35%, transparent);
}

.lab-playing-card--red {
  color: color-mix(in srgb, #c62828 88%, var(--lab-chat-log-error, #dc2626));
}

.lab-playing-card--black {
  color: #0f172a;
}

.lab-playing-card__corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  pointer-events: none;
  font-weight: 700;
}

.lab-playing-card__corner--tl {
  top: 0.28rem;
  left: 0.32rem;
}

.lab-playing-card__corner--br {
  bottom: 0.28rem;
  right: 0.32rem;
  transform: rotate(180deg);
}

.lab-playing-card__rank {
  font-size: 0.72rem;
  letter-spacing: -0.03em;
}

.lab-playing-card--sm .lab-playing-card__rank {
  font-size: 0.62rem;
}

.lab-playing-card__suit-sm {
  font-size: 0.62rem;
  margin-top: 0.05rem;
}

.lab-playing-card__pip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  line-height: 1;
  opacity: 0.92;
  pointer-events: none;
}

.lab-playing-card--face-down {
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--lab-button-bg) 70%, var(--lab-prime-surface-800)),
    color-mix(in srgb, var(--lab-prime-surface-900) 55%, var(--lab-general-bg))
  );
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--lab-accent-primary) 25%, var(--lab-card-border)),
    0 2px 6px rgb(0 0 0 / 0.25);
}

.lab-playing-card__back {
  position: absolute;
  inset: 0.35rem;
  border-radius: 0.3rem;
  border: 1px solid color-mix(in srgb, var(--lab-accent-primary) 35%, var(--lab-card-border));
  background:
    radial-gradient(
      circle at 30% 25%,
      color-mix(in srgb, var(--lab-accent-primary) 22%, transparent),
      transparent 55%
    ),
    repeating-linear-gradient(
      45deg,
      color-mix(in srgb, var(--lab-prime-surface-700) 40%, transparent) 0 3px,
      color-mix(in srgb, var(--lab-prime-surface-900) 30%, transparent) 3px 6px
    );
}
</style>
