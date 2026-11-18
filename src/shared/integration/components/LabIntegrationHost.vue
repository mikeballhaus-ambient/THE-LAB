<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';
import { fetchLabIntegrationManifest } from '../fetch-lab-integration-manifest';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import LabIntegrationSurface from './LabIntegrationSurface.vue';

const props = withDefaults(
  defineProps<{
    hostAppId: string;
    serverUrl: string;
    context?: Record<string, unknown>;
    /** When omitted, renders every manifest surface below host content. */
    surfaceId?: string;
    showDialogTriggers?: boolean;
  }>(),
  {
    context: () => ({}),
    showDialogTriggers: false,
  },
);

const manifest = shallowRef<AppLabIntegrationManifestV1 | null>(null);

const surfaceIds = computed(() => {
  if (props.surfaceId) {
    return [props.surfaceId];
  }
  return manifest.value?.integrationSurfaces?.map((row) => row.surfaceId) ?? [];
});

async function refresh(): Promise<void> {
  manifest.value = await fetchLabIntegrationManifest(props.hostAppId);
}

onMounted(() => {
  void refresh();
});

defineExpose({ refresh, manifest });
</script>

<template>
  <div class="lab-integration-host flex flex-col gap-4" :data-lab-integration-host="hostAppId">
    <slot />
    <LabIntegrationSurface
      v-for="id in surfaceIds"
      :key="id"
      :host-app-id="hostAppId"
      :surface-id="id"
      :server-url="serverUrl"
      :context="context"
      :show-dialog-triggers="showDialogTriggers"
    />
  </div>
</template>
