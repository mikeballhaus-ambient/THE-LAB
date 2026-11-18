<script setup lang="ts">
import { computed, toRef } from 'vue';
import LabIntegrationSurface from './LabIntegrationSurface.vue';
import { useCatalogHostDialogs } from '@/shared/integration/useCatalogIntegrationDialogs';

const props = defineProps<{
  hostAppId: string;
  serverUrl?: string;
}>();

const emit = defineEmits<{
  (e: 'integration-success', payload: { slot: string }): void;
}>();

const serverUrlRef = toRef(props, 'serverUrl');

const {
  integrationSurfaceRef,
  integrationContext,
  serverUrlForIntegration,
  meta,
  openPrimaryCreate,
  openPrimaryEdit,
  openPrimaryDelete,
  openEntityCreate,
  openEntityEdit,
  openEntityDelete,
  clearParentContext,
  setPresetValues,
  clearPresetValues,
} = useCatalogHostDialogs(props.hostAppId, serverUrlRef);

const surfaceId = computed(() => meta.value?.surfaceId ?? '');

defineExpose({
  openPrimaryCreate,
  openPrimaryEdit,
  openPrimaryDelete,
  openEntityCreate,
  openEntityEdit,
  openEntityDelete,
  clearParentContext,
  /** Pre-fill form fields by name, then call a matching `open*` method. */
  setPresetValues,
  clearPresetValues,
});
</script>

<template>
  <LabIntegrationSurface
    v-if="meta && serverUrlForIntegration"
    ref="integrationSurfaceRef"
    :host-app-id="hostAppId"
    :surface-id="surfaceId"
    :server-url="serverUrlForIntegration"
    :context="integrationContext"
    class="catalog-integration-host sr-only"
    @integration-success="(payload) => emit('integration-success', payload)"
  />
</template>
