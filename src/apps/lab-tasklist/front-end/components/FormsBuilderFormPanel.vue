<script setup lang="ts">
import ConnectorFormPanel from '@/shared/forms/ConnectorFormPanel.vue';

export type ConnectorEntitySegment = 'tasks' | 'task-lists';

const props = withDefaults(
  defineProps<{
    formsBuilderUrl: string;
    formKey: string;
    serverUrl: string;
    connectorEntity: ConnectorEntitySegment;
    recordId?: number | null;
    presetValues?: Record<string, unknown>;
  }>(),
  {
    recordId: null,
    presetValues: undefined,
  },
);

defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <ConnectorFormPanel
    :forms-builder-url="props.formsBuilderUrl"
    :form-key="props.formKey"
    :server-url="props.serverUrl"
    :connector-entity-segment="props.connectorEntity"
    :record-id="props.recordId"
    :preset-values="props.presetValues"
    element-id-prefix="task-form-mounter"
    panel-class="forms-builder-form-panel flex flex-col gap-3"
    @success="$emit('success')"
    @cancel="$emit('cancel')"
  />
</template>
