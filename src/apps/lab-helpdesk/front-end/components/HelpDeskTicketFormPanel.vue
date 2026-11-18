<script setup lang="ts">
import ConnectorFormPanel from '@/shared/forms/ConnectorFormPanel.vue';

const props = withDefaults(
  defineProps<{
    formsBuilderUrl: string;
    formKey: string;
    serverUrl: string;
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
    connector-entity-segment="tickets"
    :record-id="props.recordId"
    :preset-values="props.presetValues"
    element-id-prefix="help-desk-ticket-form"
    panel-class="help-desk-ticket-form-panel flex flex-col gap-3"
    load-failure-message="Could not load ticket"
    @success="$emit('success')"
    @cancel="$emit('cancel')"
  />
</template>
