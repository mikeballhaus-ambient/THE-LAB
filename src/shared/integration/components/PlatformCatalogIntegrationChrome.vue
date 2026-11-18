<script setup lang="ts">
/**
 * @deprecated Use PlatformCatalogIntegrationHost (no dev trigger bar).
 * Kept as alias for older imports.
 */
import PlatformCatalogIntegrationHost from './PlatformCatalogIntegrationHost.vue';

defineProps<{
  hostAppId: string;
  surfaceId: string;
  showReportsRegion?: boolean;
  context?: Record<string, unknown>;
}>();

defineEmits<{
  (e: 'integration-success', payload: { slot: string }): void;
}>();
</script>

<template>
  <PlatformCatalogIntegrationHost
    v-bind="$props"
    @integration-success="$emit('integration-success', $event)"
  />
</template>
