<script setup lang="ts">
import ConnectorFormPanel from '@/shared/forms/ConnectorFormPanel.vue';
import { CRM_APP_REGISTRY_ID } from '@/apps/lab-tasklist/shared/constants/app-scope';
import { buildCrmTaskMetadata } from '../../shared/types/crm-task-metadata';

const props = withDefaults(
  defineProps<{
    formsBuilderUrl: string;
    taskListServerUrl: string;
    formKey: string;
    recordId?: number | null;
    presetValues?: Record<string, unknown>;
    entityContext?: {
      entityKey: string;
      recordId: number;
      recordLabel?: string;
      stage?: string;
      workflow?: string;
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
    payload.metadata = buildCrmTaskMetadata({
      entityKey: props.entityContext.entityKey,
      recordId: props.entityContext.recordId,
      recordLabel: props.entityContext.recordLabel,
      stage: props.entityContext.stage,
      workflow: props.entityContext.workflow,
    });
  }
  return payload;
}
</script>

<template>
  <ConnectorFormPanel
    :forms-builder-url="props.formsBuilderUrl"
    :form-key="props.formKey"
    :server-url="props.taskListServerUrl"
    connector-entity-segment="tasks"
    :record-id="props.recordId"
    :preset-values="props.presetValues"
    element-id-prefix="crm-task-form-mounter"
    panel-class="crm-task-form-panel flex flex-col gap-3"
    load-failure-message="Could not load task"
    submit-mode="connector-api"
    :host-app-id="CRM_APP_REGISTRY_ID"
    :prepare-submit-payload="prepareSubmitPayload"
    @success="$emit('success')"
    @cancel="$emit('cancel')"
  />
</template>
