<script setup lang="ts">
import { computed, ref } from 'vue';
import ConnectorFormPanel from '@/shared/forms/ConnectorFormPanel.vue';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';
import { resolveFormBindingRuntime, resolveServiceIdForBinding } from '../resolve-form-binding-runtime';
import { usePeerAppServerUrl } from '@/shared/composables/usePeerAppServerUrl';
import { appIdsMatch, toRegistryAppId } from '@/shared/lab-integrations/normalize-app-id';
import { isLabIntegrationDeleteSlot } from '@/shared/lab-integrations/delete-confirm-stub';
import {
  resolveIntegrationConnectorServerUrl,
  type PeerUrlInput,
} from '@/shared/lab-integrations/resolve-integration-connector-server-url';
import { isPlatformHostedIntegrationServiceId } from '@/shared/lab-integrations/platform-integration-service-ids';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { resolveCrmIntegrationPrepareSubmitPayload } from '../crm-integration-submit-payload';
import { resolveApprovalRequestPrepareSubmitPayload } from '../approval-request-submit-payload';
import { CRM_APP_REGISTRY_ID } from '@/apps/lab-crm/shared/constants/app-scope';

const props = defineProps<{
  hostAppId: string;
  serverUrl: string;
  peerConnectorUrls?: PeerUrlInput;
  binding: LabIntegrationBindingRecord;
  manifest: AppLabIntegrationManifestV1 | null;
  context: Record<string, unknown>;
  elementIdPrefix?: string;
  hideFormActions?: boolean;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();

const runtime = computed(() =>
  resolveFormBindingRuntime(props.manifest, props.binding, props.context),
);

const connectorServerUrl = computed(() => {
  const serviceId = resolveServiceIdForBinding(props.manifest, props.binding);
  const resolved = resolveIntegrationConnectorServerUrl(
    serviceId,
    props.serverUrl,
    props.peerConnectorUrls,
  );
  if (isPlatformHostedIntegrationServiceId(serviceId) && resolved === props.serverUrl.replace(/\/$/, '')) {
    return resolvePlatformBackendUrlForClient().replace(/\/$/, '');
  }
  return resolved;
});

const prepareSubmitPayload = computed(() => {
  const approvalPrepare = resolveApprovalRequestPrepareSubmitPayload(
    props.binding.slot,
    props.context,
  );
  const crmPrepare = appIdsMatch(props.hostAppId, CRM_APP_REGISTRY_ID)
    ? resolveCrmIntegrationPrepareSubmitPayload(props.binding.slot, props.context)
    : undefined;
  if (!approvalPrepare && !crmPrepare) {
    return undefined;
  }
  return (data: Record<string, unknown>) => {
    let payload = { ...data };
    if (approvalPrepare) {
      payload = approvalPrepare(payload);
    }
    if (crmPrepare) {
      payload = crmPrepare(payload);
    }
    return payload;
  };
});

const formsBuilder = usePeerAppServerUrl(
  props.binding.providerAppId.startsWith('app-')
    ? props.binding.providerAppId
    : toRegistryAppId('forms-builder'),
);

const formsBuilderUrl = computed(() => formsBuilder.url.value ?? '');

const submitMode = computed(() =>
  isLabIntegrationDeleteSlot(props.binding.slot) ? 'connector-delete' : 'connector-api',
);

const panelRef = ref<InstanceType<typeof ConnectorFormPanel> | null>(null);

async function submit(): Promise<void> {
  await panelRef.value?.submit();
}

defineExpose({ submit });
</script>

<template>
  <div
    v-if="runtime && formsBuilderUrl"
    class="lab-integration-form-surface"
    :data-lab-integration-slot="binding.slot"
  >
    <ConnectorFormPanel
      ref="panelRef"
      :forms-builder-url="formsBuilderUrl"
      :form-key="runtime.formKey"
      :server-url="connectorServerUrl"
      :connector-entity-segment="runtime.connectorEntitySegment"
      :record-id="runtime.recordId"
      :preset-values="runtime.presetValues"
      :submit-mode="submitMode"
      :host-app-id="hostAppId"
      :prepare-submit-payload="prepareSubmitPayload"
      :integration-slot="binding.slot"
      :hide-form-actions="hideFormActions"
      :element-id-prefix="elementIdPrefix ?? `lab-int-form-${binding.slot}`"
      panel-class="lab-integration-form-surface-panel lab-form-runtime flex flex-col gap-3 text-lab-general-text"
      @success="emit('success')"
      @cancel="emit('cancel')"
    />
  </div>
  <p
    v-else
    class="text-sm text-lab-general-text-muted"
    :data-lab-integration-slot="binding.slot"
  >
    Form integration is not ready (missing connector segment or Forms Builder URL).
  </p>
</template>
