<script setup lang="ts">
import { computed, ref } from 'vue';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import LabIntegrationSurface from './LabIntegrationSurface.vue';

const props = withDefaults(
  defineProps<{
    hostAppId: string;
    surfaceId: string;
    context?: Record<string, unknown>;
    /** @deprecated Prefer `inlineRegionIds` (e.g. `['reports.journal']`). */
    showReportsRegion?: boolean;
    /** Inline manifest regions to render; omit dialogs (those use openSlot). Default: none. */
    inlineRegionIds?: string[];
  }>(),
  {
    context: () => ({}),
    inlineRegionIds: undefined,
  },
);

const platformUrl = computed(() => resolvePlatformBackendUrlForClient());
const integrationContext = computed(() => props.context ?? {});
const resolvedInlineRegionIds = computed(() => {
  if (props.inlineRegionIds !== undefined) {
    return props.inlineRegionIds;
  }
  if (props.showReportsRegion) {
    return ['reports'];
  }
  return [];
});

const surfaceRef = ref<InstanceType<typeof LabIntegrationSurface> | null>(null);

defineEmits<{
  (e: 'integration-success', payload: { slot: string }): void;
}>();

defineExpose({
  openSlot: (slot: string) => surfaceRef.value?.openSlot(slot),
  closeSlot: () => surfaceRef.value?.closeSlot(),
  refresh: () => surfaceRef.value?.refresh(),
  hasEnabledBinding: (slot: string) => surfaceRef.value?.hasEnabledBinding(slot) ?? false,
});
</script>

<template>
  <!-- Dialog-only host: no dev trigger bar; product actions call openSlot() -->
  <LabIntegrationSurface
    ref="surfaceRef"
    class="lab-platform-integration-host"
    :host-app-id="hostAppId"
    :surface-id="surfaceId"
    :server-url="platformUrl"
    :context="integrationContext"
    :inline-region-ids="resolvedInlineRegionIds"
    hide-empty-regions
    @integration-success="$emit('integration-success', $event)"
  >
    <template #dialog-accessory="slotProps">
      <slot name="dialog-accessory" v-bind="slotProps" />
    </template>
  </LabIntegrationSurface>
</template>
