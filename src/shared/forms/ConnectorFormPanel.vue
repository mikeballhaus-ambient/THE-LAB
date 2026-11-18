<script setup lang="ts">
import { computed, toRef } from 'vue';
import Message from 'primevue/message';
import {
  FormMounter,
  FormValidationErrorsBanner,
} from '@/shared/forms';
import { useConnectorFormPanel } from '@/shared/forms/useConnectorFormPanel';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = withDefaults(
  defineProps<{
    formsBuilderUrl: string;
    formKey: string;
    serverUrl: string;
    /** Connector API segment, e.g. `tasks`, `tickets`, `task-lists` */
    connectorEntitySegment: string;
    recordId?: string | number | null;
    presetValues?: Record<string, unknown>;
    /** Prefix for `generateUniqueId` on FormMounter buttons */
    elementIdPrefix?: string;
    panelClass?: string;
    loadFailureMessage?: string;
    useAuthenticatedConnectorFetch?: boolean;
    /** Default `forms-builder`; `connector-api` POST save; `connector-delete` DELETE by record id. */
    submitMode?: 'forms-builder' | 'connector-api' | 'connector-delete';
    submittingLabel?: string;
    hostAppId?: string;
    integrationSlot?: string;
    hideFormActions?: boolean;
    prepareSubmitPayload?: (data: Record<string, unknown>) => Record<string, unknown>;
  }>(),
  {
    recordId: null,
    presetValues: undefined,
    elementIdPrefix: 'connector-form-panel',
    panelClass: 'connector-form-panel lab-form-runtime flex flex-col gap-3 text-lab-general-text',
    loadFailureMessage: undefined,
    useAuthenticatedConnectorFetch: true,
    submitMode: 'forms-builder',
    hostAppId: undefined,
    hideFormActions: false,
    submittingLabel: undefined,
  },
);

const busyLabel = computed(() => {
  if (props.submittingLabel) {
    return props.submittingLabel;
  }
  return props.submitMode === 'connector-delete' ? 'Deleting…' : 'Saving…';
});

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const primaryBtnId = generateUniqueId(`${props.elementIdPrefix}-primary`);
const cancelBtnId = generateUniqueId(`${props.elementIdPrefix}-cancel`);

let submitCompletion: {
  resolve: () => void;
  reject: (error: Error) => void;
} | null = null;

const {
  mounterRef,
  submitting,
  statusMessage,
  fieldValidationErrors,
  onFormLoaded,
  handleMounterError,
  handleSubmit,
  handleCancel,
} = useConnectorFormPanel({
  formsBuilderUrl: toRef(props, 'formsBuilderUrl'),
  formKey: toRef(props, 'formKey'),
  serverUrl: toRef(props, 'serverUrl'),
  connectorEntitySegment: toRef(props, 'connectorEntitySegment'),
  recordId: computed(() => props.recordId),
  presetValues: computed(() => props.presetValues),
  loadFailureMessage: props.loadFailureMessage,
  useAuthenticatedConnectorFetch: props.useAuthenticatedConnectorFetch,
  submitMode: props.submitMode,
  hostAppId: computed(() => props.hostAppId),
  integrationSlot: computed(() => props.integrationSlot),
  prepareSubmitPayload: props.prepareSubmitPayload,
  onSuccess: () => {
    emit('success');
    submitCompletion?.resolve();
    submitCompletion = null;
  },
  onCancel: () => emit('cancel'),
});

async function onPanelSubmit(data: Record<string, unknown>): Promise<void> {
  await handleSubmit(data);
  if (statusMessage.value?.severity === 'error') {
    const message = statusMessage.value.text ?? 'Save failed';
    submitCompletion?.reject(new Error(message));
    submitCompletion = null;
  }
}

function onMounterError(err: Error): void {
  submitCompletion?.reject(err);
  submitCompletion = null;
  handleMounterError(err);
}

function submit(): Promise<void> {
  return new Promise((resolve, reject) => {
    submitCompletion = { resolve, reject };
    const ok = mounterRef.value?.triggerSubmit();
    if (!ok) {
      submitCompletion = null;
      reject(new Error('Fix validation errors and try again.'));
    }
  });
}

defineExpose({ submit });
</script>

<template>
  <div :class="panelClass">
    <FormValidationErrorsBanner :errors="fieldValidationErrors" />
    <Message
      v-if="statusMessage"
      :severity="statusMessage.severity"
      :closable="false"
    >
      {{ statusMessage.text }}
    </Message>
    <p v-if="submitting" class="text-sm text-lab-general-text-muted">{{ busyLabel }}</p>
    <FormMounter
      :key="`${formKey}-${recordId ?? 'new'}`"
      ref="mounterRef"
      :forms-builder-url="formsBuilderUrl"
      :form-key="formKey"
      :record-id="recordId ?? undefined"
      :primary-id="primaryBtnId"
      :cancel-id="cancelBtnId"
      :host-app-id="hostAppId"
      :integration-slot="integrationSlot"
      :hide-form-actions="hideFormActions"
      @loaded="onFormLoaded"
      @submit="onPanelSubmit"
      @cancel="handleCancel"
      @error="onMounterError"
    />
  </div>
</template>
