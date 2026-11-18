<script setup lang="ts">
import { ref } from 'vue';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';
import LabIntegrationChartSurfaceAdapter from './LabIntegrationChartSurfaceAdapter.vue';
import LabIntegrationFormSurfaceAdapter from './LabIntegrationFormSurfaceAdapter.vue';

import type { PeerUrlInput } from '@/shared/lab-integrations/resolve-integration-connector-server-url';

defineProps<{
  hostAppId: string;
  serverUrl: string;
  peerConnectorUrls?: PeerUrlInput;
  binding: LabIntegrationBindingRecord;
  manifest: AppLabIntegrationManifestV1 | null;
  context: Record<string, unknown>;
  hideFormActions?: boolean;
}>();

const formAdapterRef = ref<InstanceType<typeof LabIntegrationFormSurfaceAdapter> | null>(null);

async function submit(): Promise<void> {
  await formAdapterRef.value?.submit();
}

defineExpose({ submit });

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <LabIntegrationFormSurfaceAdapter
    v-if="binding.kind === 'form.surface'"
    ref="formAdapterRef"
    :host-app-id="hostAppId"
    :server-url="serverUrl"
    :peer-connector-urls="peerConnectorUrls"
    :binding="binding"
    :manifest="manifest"
    :context="context"
    :hide-form-actions="hideFormActions"
    @success="emit('success')"
    @cancel="emit('cancel')"
  />
  <LabIntegrationChartSurfaceAdapter
    v-else-if="binding.kind === 'chart.surface'"
    :host-app-id="hostAppId"
    :binding="binding"
    :manifest="manifest"
    :context="context"
  />
  <p v-else class="text-xs text-lab-general-text-muted" :data-lab-integration-slot="binding.slot">
    Unsupported integration kind: {{ binding.kind }}
  </p>
</template>
