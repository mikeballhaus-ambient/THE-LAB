<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  turnRemainingMs: number;
}>();

const { generateUniqueId } = useUniqueElementId();
const displayMs = ref(props.turnRemainingMs);
let timer: ReturnType<typeof setInterval> | null = null;

function syncTimer(): void {
  displayMs.value = props.turnRemainingMs;
  if (timer) {
    clearInterval(timer);
  }
  const started = Date.now();
  const initial = props.turnRemainingMs;
  timer = setInterval(() => {
    const left = Math.max(0, initial - (Date.now() - started));
    displayMs.value = left;
    if (left <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 250);
}

watch(() => props.turnRemainingMs, syncTimer, { immediate: true });

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});

const label = computed(() => {
  const totalSec = Math.ceil(displayMs.value / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
});
</script>

<template>
  <div
    class="flex items-baseline gap-1 text-sm tabular-nums"
    :id="generateUniqueId('tw-turn-timer')"
    aria-live="polite"
  >
    <span class="text-lab-general-text-muted font-normal">Turn</span>
    <span class="font-mono text-lab-general-text">{{ label }}</span>
  </div>
</template>
