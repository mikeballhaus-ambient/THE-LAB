<script setup lang="ts">
import { computed } from 'vue';
import TileBoardStagedTile from './TileBoardStagedTile.vue';

const props = defineProps<{
  row: number;
  col: number;
  letter: string | null;
  premium: string | null;
  stagedLetter: string | null;
  ghostLetter?: string | null;
  interactable?: boolean;
  dropHover?: boolean;
}>();

const emit = defineEmits<{
  recall: [row: number, col: number];
}>();

const showDropHover = computed(
  () => Boolean(props.dropHover) && props.interactable && !props.letter,
);

const toneClass = computed(() => {
  if (props.letter) {
    return 'tw-board-cell--locked';
  }
  switch (props.premium) {
    case 'TW':
      return 'tw-board-cell--tw';
    case 'DW':
      return 'tw-board-cell--dw';
    case 'TL':
      return 'tw-board-cell--tl';
    case 'DL':
      return 'tw-board-cell--dl';
    default:
      return 'tw-board-cell--plain';
  }
});

const premiumLabel = computed(() => {
  if (!props.premium) {
    return '';
  }
  if (props.premium === 'TW') {
    return '3W';
  }
  if (props.premium === 'DW') {
    return '2W';
  }
  if (props.premium === 'TL') {
    return '3L';
  }
  if (props.premium === 'DL') {
    return '2L';
  }
  return '';
});
</script>

<template>
  <div
    class="tw-board-cell relative flex items-center justify-center font-semibold select-none min-w-0"
    :class="[
      toneClass,
      {
        'tw-board-cell--drop-hover': showDropHover,
        'tw-board-cell--hint-target':
          Boolean(props.ghostLetter) && !props.letter && !props.stagedLetter,
      },
    ]"
    :data-tw-board-row="row"
    :data-tw-board-col="col"
  >
    <span
      v-if="ghostLetter && !letter && !stagedLetter"
      class="tw-board-cell__hint-ring"
      aria-hidden="true"
    />
    <span
      v-if="!letter && !stagedLetter && !ghostLetter && premiumLabel"
      class="tw-board-cell__premium pointer-events-none"
      >{{ premiumLabel }}</span
    >
    <span v-if="letter" class="tw-board-cell__tile tw-board-cell__tile--locked pointer-events-none">{{ letter }}</span>
    <span
      v-else-if="ghostLetter"
      class="tw-board-cell__tile tw-board-cell__tile--ghost pointer-events-none"
      role="img"
      :aria-label="`Hint letter ${ghostLetter}`"
    >
      {{ ghostLetter }}
    </span>
    <TileBoardStagedTile
      v-else-if="stagedLetter"
      :letter="stagedLetter"
      :row="row"
      :col="col"
      :interactable="interactable ?? false"
      @recall="emit('recall', row, col)"
    />
  </div>
</template>

<style scoped>
.tw-board-cell {
  width: 100%;
  aspect-ratio: 1;
  font-size: clamp(0.62rem, 2vmin, 0.9rem);
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  border-radius: 2px;
  isolation: isolate;
}

.tw-board-cell--drop-hover {
  z-index: 1;
  box-shadow:
    inset 0 0 0 2px color-mix(in srgb, var(--lab-accent-primary) 75%, var(--lab-general-border)),
    0 0 0 1px color-mix(in srgb, var(--lab-accent-primary) 35%, transparent);
}

.tw-board-cell span {
  line-height: 1;
}

.tw-board-cell--plain {
  background: color-mix(in srgb, var(--lab-prime-surface-100) 55%, var(--lab-general-bg));
}

.tw-board-cell--tw {
  background: color-mix(in srgb, #f59e0b 42%, var(--lab-prime-surface-200));
  color: color-mix(in srgb, #92400e 70%, var(--lab-general-text));
}

.tw-board-cell--dw {
  background: color-mix(in srgb, #f43f5e 38%, var(--lab-prime-surface-200));
  color: color-mix(in srgb, #9f1239 65%, var(--lab-general-text));
}

.tw-board-cell--tl {
  background: color-mix(in srgb, #0ea5e9 40%, var(--lab-prime-surface-200));
  color: color-mix(in srgb, #075985 70%, var(--lab-general-text));
}

.tw-board-cell--dl {
  background: color-mix(in srgb, #6366f1 38%, var(--lab-prime-surface-200));
  color: color-mix(in srgb, #3730a3 65%, var(--lab-general-text));
}

.tw-board-cell__premium {
  position: relative;
  z-index: 1;
  font-weight: 700;
  opacity: 0.95;
}

.tw-board-cell--locked {
  background: color-mix(
    in srgb,
    var(--lab-prime-surface-100) 78%,
    var(--lab-prime-surface-300)
  );
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--lab-general-border) 35%, transparent);
}

.tw-board-cell__tile {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92%;
  height: 92%;
  border-radius: 3px;
  border: 1px solid var(--tw-tile-face-border, color-mix(in srgb, var(--lab-general-border) 70%, transparent));
  font-weight: 800;
  line-height: 1;
  box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--lab-general-border) 25%, transparent);
  background: var(
    --tw-tile-face,
    color-mix(in srgb, var(--lab-prime-surface-100) 75%, var(--lab-prime-surface-300))
  );
  color: var(--tw-tile-ink, var(--lab-prime-content-primary, var(--lab-general-text)));
  -webkit-text-fill-color: var(--tw-tile-ink, var(--lab-prime-content-primary, var(--lab-general-text)));
}

.tw-board-cell__tile--locked {
  pointer-events: none;
}

.tw-board-cell.tw-board-cell--hint-target {
  z-index: 2;
  overflow: visible;
  /* Wash premium/plain squares so hints read as preview, not committed tiles */
  background: color-mix(
    in srgb,
    var(--lab-section-accent, var(--lab-button-border-hover)) 22%,
    var(--lab-general-bg-muted, var(--lab-general-bg)) 78%
  );
}

.tw-board-cell__hint-ring {
  position: absolute;
  inset: -1px;
  z-index: 0;
  border-radius: 3px;
  pointer-events: none;
  border: 2px solid var(--lab-section-accent, var(--lab-button-border-hover));
  box-sizing: border-box;
  transform-origin: center center;
  animation: tw-board-hint-ring 2.2s ease-in-out infinite;
}

@keyframes tw-board-hint-ring {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.9);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 0%, transparent);
  }
  50% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 10px 1px color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 45%, transparent);
  }
}

/* Preview tile: dashed accent frame + stripe fill — not the same chrome as locked letters. */
.tw-board-cell__tile--ghost {
  position: relative;
  z-index: 1;
  width: 94%;
  height: 94%;
  border: 2px dashed color-mix(
    in srgb,
    var(--lab-section-accent, var(--lab-button-border-hover)) 88%,
    var(--lab-general-text)
  );
  background-color: color-mix(
    in srgb,
    var(--tw-tile-face, var(--lab-form-control-bg, var(--lab-general-bg))) 88%,
    var(--lab-section-accent, var(--lab-button-border-hover)) 12%
  );
  background-image: repeating-linear-gradient(
    -48deg,
    color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 14%, transparent) 0 5px,
    color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 32%, transparent) 5px 10px
  );
  background-size: 14px 14px;
  color: var(--tw-tile-ink, var(--lab-prime-content-primary, var(--lab-general-text)));
  -webkit-text-fill-color: var(--tw-tile-ink, var(--lab-prime-content-primary, var(--lab-general-text)));
  font-weight: 900;
  text-shadow:
    0 0 1px color-mix(in srgb, var(--lab-general-bg) 92%, transparent),
    0 1px 0 color-mix(in srgb, var(--lab-general-text) 18%, transparent);
  animation:
    tw-ghost-tile-border 2.2s ease-in-out infinite,
    tw-ghost-stripe-drift 3.5s linear infinite;
}

@keyframes tw-ghost-tile-border {
  0%,
  100% {
    opacity: 0.88;
    transform: scale(0.94);
    filter: brightness(0.96);
  }
  50% {
    opacity: 1;
    transform: scale(1);
    filter: brightness(1.04);
  }
}

@keyframes tw-ghost-stripe-drift {
  to {
    background-position: 14px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tw-board-cell__hint-ring,
  .tw-board-cell__tile--ghost {
    animation: none;
    transform: none;
    opacity: 1;
    filter: none;
  }
}
</style>
