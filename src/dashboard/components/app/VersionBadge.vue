<template>
  <div
    v-if="props.app"
    class="inline-flex items-center gap-2 rounded border border-lab-general-border bg-lab-general-bg px-3 py-1.5 text-sm text-lab-general-text-muted"
    :class="{
      'border-lab-button-border-hover text-lab-general-text': props.app?.isUpdateAvailable,
      'border-green-500': props.app?.version === props.app?.latestVersion && !props.app?.isUpdateAvailable,
    }"
  >
    <span class="font-mono font-medium">{{ currentVersion }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RuntimeApp } from '../../../shared/types';

interface Props {
  app?: RuntimeApp;
}

const props = defineProps<Props>();

const currentVersion = computed(() => props.app?.version || '');
</script>
