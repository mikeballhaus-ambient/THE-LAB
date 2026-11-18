<script setup lang="ts">
import { computed, toRef } from 'vue';
import LabIntegrationSurface from './LabIntegrationSurface.vue';
import { getCatalogIntegrationMeta } from '@/shared/integration/catalog-integration-meta';

const props = defineProps<{
  hostAppId: string;
  serverUrl?: string;
  context?: Record<string, unknown>;
}>();

const serverUrlRef = toRef(props, 'serverUrl');
const surfaceId = computed(() => getCatalogIntegrationMeta(props.hostAppId)?.surfaceId ?? '');
const serverUrlForIntegration = computed(() => serverUrlRef.value?.trim() ?? '');
</script>

<template>
  <LabIntegrationSurface
    v-if="surfaceId && serverUrlForIntegration"
    :host-app-id="hostAppId"
    :surface-id="surfaceId"
    :server-url="serverUrlForIntegration"
    :context="context ?? {}"
    :inline-region-ids="['reports.grid']"
    class="catalog-reports-panel w-full"
  />
</template>
