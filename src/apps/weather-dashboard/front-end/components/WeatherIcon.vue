<script setup lang="ts">
import type { ConditionKind } from '../../shared/types';

/**
 * Inline SVG condition icon.
 *
 * Drawn rather than emoji so the shapes stay crisp at any size and can be coloured from theme
 * tokens. Colours are passed in via `currentColor` + the `sun`/`cloud`/`precip` CSS variables so
 * a forecast tile can invert them (light-on-dark vs dark-on-light) without a second icon set.
 *
 * Deliberately no `id` attributes on the SVG internals: SVG ids are document-global, so two
 * copies of the same icon on one page would collide. Everything is plain paths instead.
 */
withDefaults(
  defineProps<{
    condition: ConditionKind;
    /** Rendered size in px (square). */
    size?: number;
    /** Decorative by default — the day label already names the condition. */
    title?: string;
  }>(),
  { size: 40, title: '' },
);

const viewBox = '0 0 64 64';
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="viewBox"
    class="weather-icon"
    :class="`weather-icon--${condition}`"
    role="img"
    :aria-hidden="title ? undefined : 'true'"
    :aria-label="title || undefined"
    focusable="false"
  >
    <title v-if="title">{{ title }}</title>

    <!-- clear -->
    <g v-if="condition === 'clear'" class="weather-icon__sun">
      <circle cx="32" cy="32" r="11" class="weather-icon__sun-core" />
      <g class="weather-icon__sun-rays">
        <rect x="30.5" y="6" width="3" height="9" rx="1.5" />
        <rect x="30.5" y="49" width="3" height="9" rx="1.5" />
        <rect x="6" y="30.5" width="9" height="3" rx="1.5" />
        <rect x="49" y="30.5" width="9" height="3" rx="1.5" />
        <rect x="30.5" y="6" width="3" height="9" rx="1.5" transform="rotate(45 32 32)" />
        <rect x="30.5" y="6" width="3" height="9" rx="1.5" transform="rotate(-45 32 32)" />
        <rect x="30.5" y="6" width="3" height="9" rx="1.5" transform="rotate(135 32 32)" />
        <rect x="30.5" y="6" width="3" height="9" rx="1.5" transform="rotate(-135 32 32)" />
      </g>
    </g>

    <!-- partly-cloudy -->
    <g v-else-if="condition === 'partly-cloudy'">
      <g class="weather-icon__sun weather-icon__sun--offset">
        <circle cx="24" cy="24" r="9" class="weather-icon__sun-core" />
        <g class="weather-icon__sun-rays">
          <rect x="22.6" y="4" width="2.8" height="7" rx="1.4" />
          <rect x="22.6" y="37" width="2.8" height="7" rx="1.4" />
          <rect x="4" y="22.6" width="7" height="2.8" rx="1.4" />
          <rect x="37" y="22.6" width="7" height="2.8" rx="1.4" />
          <rect x="22.6" y="4" width="2.8" height="7" rx="1.4" transform="rotate(45 24 24)" />
          <rect x="22.6" y="4" width="2.8" height="7" rx="1.4" transform="rotate(-45 24 24)" />
        </g>
      </g>
      <path
        class="weather-icon__cloud"
        d="M20 48a9 9 0 0 1 .6-17.9 13 13 0 0 1 24.6 2.1A8.5 8.5 0 0 1 46 48Z"
      />
    </g>

    <!-- cloudy -->
    <path
      v-else-if="condition === 'cloudy'"
      class="weather-icon__cloud"
      d="M18 48a10 10 0 0 1 .7-19.9 14 14 0 0 1 26.5 2.3A9.5 9.5 0 0 1 46 48Z"
    />

    <!-- rain -->
    <g v-else-if="condition === 'rain'">
      <path
        class="weather-icon__cloud"
        d="M18 40a9 9 0 0 1 .6-17.9 13 13 0 0 1 24.6 2.1A8.5 8.5 0 0 1 46 40Z"
      />
      <g class="weather-icon__precip">
        <rect x="22" y="45" width="3" height="9" rx="1.5" transform="rotate(12 23.5 49.5)" />
        <rect x="31" y="45" width="3" height="9" rx="1.5" transform="rotate(12 32.5 49.5)" />
        <rect x="40" y="45" width="3" height="9" rx="1.5" transform="rotate(12 41.5 49.5)" />
      </g>
    </g>

    <!-- snow -->
    <g v-else-if="condition === 'snow'">
      <path
        class="weather-icon__cloud"
        d="M18 40a9 9 0 0 1 .6-17.9 13 13 0 0 1 24.6 2.1A8.5 8.5 0 0 1 46 40Z"
      />
      <g class="weather-icon__precip">
        <circle cx="23" cy="48" r="2.6" />
        <circle cx="32" cy="52" r="2.6" />
        <circle cx="41" cy="48" r="2.6" />
      </g>
    </g>

    <!-- storm -->
    <g v-else-if="condition === 'storm'">
      <path
        class="weather-icon__cloud"
        d="M18 38a9 9 0 0 1 .6-17.9 13 13 0 0 1 24.6 2.1A8.5 8.5 0 0 1 46 38Z"
      />
      <path class="weather-icon__bolt" d="M33 38 24 52h7l-2 10 10-15h-7l3-9Z" />
    </g>

    <!-- fog -->
    <g v-else-if="condition === 'fog'">
      <path
        class="weather-icon__cloud weather-icon__cloud--faded"
        d="M18 34a9 9 0 0 1 .6-17.9 13 13 0 0 1 24.6 2.1A8.5 8.5 0 0 1 46 34Z"
      />
      <g class="weather-icon__precip">
        <rect x="14" y="42" width="36" height="3" rx="1.5" />
        <rect x="20" y="49" width="26" height="3" rx="1.5" />
        <rect x="16" y="56" width="32" height="3" rx="1.5" />
      </g>
    </g>

    <!-- wind -->
    <g v-else-if="condition === 'wind'" class="weather-icon__wind">
      <path d="M10 24h26a6 6 0 1 0-6-6" fill="none" stroke-linecap="round" stroke-width="4" />
      <path d="M10 34h34a6 6 0 1 1-6 6" fill="none" stroke-linecap="round" stroke-width="4" />
      <path d="M10 44h20" fill="none" stroke-linecap="round" stroke-width="4" />
    </g>
  </svg>
</template>

<style scoped>
/*
 * Colours come from the caller via CSS variables, defaulting to theme tokens. That lets the same
 * icon sit on a light sun-yellow fill or a dark tile without a second set of paths.
 */
.weather-icon {
  display: block;
  color: var(--weather-icon-color, var(--lab-general-text));
  --weather-icon-sun: var(--weather-icon-sun-color, #f5c542);
  --weather-icon-cloud: var(--weather-icon-cloud-color, currentColor);
  --weather-icon-precip: var(--weather-icon-precip-color, #6cb8ff);
}

.weather-icon__sun-core {
  fill: var(--weather-icon-sun);
}

.weather-icon__sun-rays rect {
  fill: var(--weather-icon-sun);
}

.weather-icon__sun--offset {
  transform: translate(-3px, -3px);
}

.weather-icon__cloud {
  fill: var(--weather-icon-cloud);
}

.weather-icon__cloud--faded {
  opacity: 0.45;
}

.weather-icon__precip,
.weather-icon__bolt {
  fill: var(--weather-icon-precip);
}

.weather-icon__wind path {
  stroke: var(--weather-icon-cloud);
}
</style>
