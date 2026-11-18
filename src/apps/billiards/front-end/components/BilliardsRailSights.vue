<script setup lang="ts">
import { computed } from 'vue';
import { TABLE_HEIGHT, TABLE_WIDTH } from '../../shared/billiards-types';
import { tableRailSightPoints } from '../../shared/table-pocket-visual';

const sights = computed(() => tableRailSightPoints());

function sightStyle(cx: number, cy: number): Record<string, string> {
  return {
    left: `${(cx / TABLE_WIDTH) * 100}%`,
    top: `${(cy / TABLE_HEIGHT) * 100}%`,
  };
}
</script>

<template>
  <div class="billiards-rail-sights" aria-hidden="true">
    <span
      v-for="(s, i) in sights"
      :key="`sight-${i}`"
      class="billiards-rail-sight"
      :style="sightStyle(s.cx, s.cy)"
    />
  </div>
</template>

<style scoped>
.billiards-rail-sights {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: visible;
}

.billiards-rail-sight {
  position: absolute;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: color-mix(in srgb, var(--lab-general-text-muted) 55%, var(--billiards-wood-highlight));
  border: 1px solid color-mix(in srgb, var(--lab-general-text) 35%, var(--billiards-wood-grain-dark));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lab-general-bg) 40%, transparent);
}
</style>
