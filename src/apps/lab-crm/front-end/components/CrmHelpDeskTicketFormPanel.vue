<script setup lang="ts">
import ConnectorFormPanel from '@/shared/forms/ConnectorFormPanel.vue';
import { CRM_APP_REGISTRY_ID } from '@/apps/lab-helpdesk/shared/constants/app-scope';
import { buildHelpDeskCrmMetadata } from '@/apps/lab-helpdesk/shared/types/help-desk-crm-metadata';

const props = withDefaults(
  defineProps<{
    formsBuilderUrl: string;
    helpDeskServerUrl: string;
    formKey: string;
    recordId?: number | null;
    presetValues?: Record<string, unknown>;
    entityContext?: {
      entityKey: string;
      recordId: number;
      recordLabel?: string;
    };
  }>(),
  {
    recordId: null,
    presetValues: undefined,
    entityContext: undefined,
  },
);

defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();

function prepareSubmitPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload = { ...data };
  if (props.recordId != null || !props.entityContext) {
    return payload;
  }
  if (payload.metadata == null || String(payload.metadata).trim() === '') {
    payload.metadata = buildHelpDeskCrmMetadata({
      entityKey: props.entityContext.entityKey,
      recordId: props.entityContext.recordId,
      recordLabel: props.entityContext.recordLabel,
    });
  }
  return payload;
}
</script>

<template>
  <ConnectorFormPanel
    :forms-builder-url="props.formsBuilderUrl"
    :form-key="props.formKey"
    :server-url="props.helpDeskServerUrl"
    connector-entity-segment="tickets"
    :record-id="props.recordId"
    :preset-values="props.presetValues"
    element-id-prefix="crm-hd-ticket-form-mounter"
    panel-class="crm-helpdesk-ticket-form-panel flex flex-col gap-3"
    load-failure-message="Could not load ticket"
    submit-mode="connector-api"
    :host-app-id="CRM_APP_REGISTRY_ID"
    :prepare-submit-payload="prepareSubmitPayload"
    @success="$emit('success')"
    @cancel="$emit('cancel')"
  />
</template>
