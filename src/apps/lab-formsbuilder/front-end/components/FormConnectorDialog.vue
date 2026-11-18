<template>
  <Dialog
    :visible="visible"
    modal
    header="Connect Form to Data Connector"
    :style="{ width: '32rem' }"
    :pt="{ root: { id: generateUniqueId('form-connector-dialog') } }"
    @update:visible="onVisibleChange"
  >
    <div class="flex flex-col gap-4 text-lab-general-text">
      <p class="text-sm text-lab-general-text-muted m-0 leading-relaxed">
        Link this form to a connector to use its entity model and lookups in the designer.
        <strong class="text-lab-general-text font-medium">Refresh model</strong> re-fetches the schema from the connector
        discovery URL and updates the form's stored model (after the form is saved).
      </p>

      <div
        v-if="connector"
        class="rounded-lg border border-lab-general-border bg-lab-general-bg-muted/50 p-3"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-lab-general-text-muted m-0 mb-1">Connector</p>
        <p class="text-sm font-medium text-lab-general-text m-0">{{ formatConnectorDisplayName(connector) }}</p>
        <p class="text-xs text-lab-general-text-muted m-0 mt-1">Entity: {{ connector.entityName }}</p>
      </div>

      <div
        v-if="isLinkedToOther"
        class="rounded-lg border border-amber-600/50 bg-amber-950/30 p-3 text-sm text-amber-100"
      >
        This form is linked to <strong>{{ linkedConnector ? formatConnectorDisplayName(linkedConnector) : '' }}</strong>. Linking
        <strong>{{ connector ? formatConnectorDisplayName(connector) : '' }}</strong> will replace that association when you save the form.
      </div>

      <div
        v-if="isLinkedToTarget"
        class="rounded-lg border border-green-600/50 bg-green-950/30 p-3 text-sm text-green-100"
      >
        This form is linked to this connector.
      </div>

      <div v-if="!isLinkedToTarget" class="flex items-center gap-2">
        <Checkbox
          v-model="autopopulateOnLink"
          binary
          :pt="{ root: { id: generateUniqueId('autopopulate-on-link-check') } }"
        />
        <label
          :id="generateUniqueId('autopopulate-on-link-label')"
          class="text-sm text-lab-general-text cursor-pointer"
          :for="generateUniqueId('autopopulate-on-link-check')"
        >
          After linking, add fields to the canvas from the connector model
        </label>
      </div>

      <div v-if="loading" class="flex items-center gap-3 py-2 text-sm text-lab-general-text-muted">
        <i class="pi pi-spin pi-spinner text-lg" aria-hidden="true"></i>
        <span>Refreshing model from connector…</span>
      </div>

      <p v-if="error" class="text-sm text-red-300 m-0">{{ error }}</p>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        icon="pi pi-times"
        severity="secondary"
        @click="close"
        :pt="{ root: { id: generateUniqueId('cancel-form-connector-btn') } }"
      />
      <Button
        v-if="isLinkedToTarget"
        label="Unlink"
        icon="pi pi-link-slash"
        severity="danger"
        outlined
        :disabled="loading"
        @click="handleUnlink"
        :pt="{ root: { id: generateUniqueId('unlink-connector-btn') } }"
      />
      <Button
        v-if="isLinkedToTarget"
        label="Autopopulate canvas"
        icon="pi pi-table"
        severity="secondary"
        :disabled="loading"
        @click="handleAutopopulate"
        :pt="{ root: { id: generateUniqueId('autopopulate-connector-btn') } }"
      />
      <Button
        v-if="isLinkedToTarget"
        label="Refresh model"
        icon="pi pi-sync"
        severity="info"
        :loading="loading"
        :disabled="!formKey"
        @click="handleRefresh"
        :pt="{ root: { id: generateUniqueId('refresh-model-btn') } }"
      />
      <Button
        v-if="!isLinkedToTarget && connector"
        label="Link connector"
        icon="pi pi-link"
        severity="success"
        :disabled="loading"
        @click="handleLink"
        :pt="{ root: { id: generateUniqueId('link-connector-btn') } }"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { DataConnector, FormSchema } from '../../shared/types';
import { API_V1_PREFIX, apiUrl, apiFetch, parseJsonResponse } from '../utils/api-client';
import { formatConnectorDisplayName } from '../utils/connector-display';

const props = defineProps<{
  visible: boolean;
  serverUrl: string;
  formKey?: string;
  formId?: number;
  connector: DataConnector | null;
  linkedConnector: DataConnector | null | undefined;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'link', payload: { connector: DataConnector; autopopulate: boolean }): void;
  (e: 'unlink'): void;
  (e: 'autopopulate'): void;
  (e: 'refresh-complete', form: FormSchema): void;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const autopopulateOnLink = ref(true);

const { generateUniqueId } = useUniqueElementId();

const isLinkedToTarget = computed(() => {
  if (!props.connector?.id || !props.linkedConnector?.id) {
    return false;
  }
  return props.connector.id === props.linkedConnector.id;
});

const isLinkedToOther = computed(() => {
  if (!props.connector?.id || !props.linkedConnector?.id) {
    return false;
  }
  return props.connector.id !== props.linkedConnector.id;
});

function onVisibleChange(value: boolean): void {
  emit('update:visible', value);
  if (!value) {
    error.value = null;
    loading.value = false;
  }
}

function close(): void {
  emit('update:visible', false);
}

function handleLink(): void {
  if (!props.connector) {
    return;
  }
  emit('link', { connector: props.connector, autopopulate: autopopulateOnLink.value });
  emit('update:visible', false);
}

function handleUnlink(): void {
  emit('unlink');
  emit('update:visible', false);
}

function handleAutopopulate(): void {
  emit('autopopulate');
  emit('update:visible', false);
}

async function handleRefresh(): Promise<void> {
  if (!props.connector) {
    return;
  }

  error.value = null;

  if (!props.formId) {
    emit('refresh-complete', {
      model: props.connector.entityModel,
    } as FormSchema);
    return;
  }

  if (!props.formKey) {
    error.value = 'Form key is required to refresh a saved form.';
    return;
  }

  loading.value = true;
  try {
    const response = await apiFetch(
      apiUrl(props.serverUrl, `${API_V1_PREFIX}/forms/${encodeURIComponent(props.formKey)}/refresh`),
      { method: 'POST' },
    );
    const form = await parseJsonResponse<FormSchema>(response);
    emit('refresh-complete', form);
    emit('update:visible', false);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to refresh model';
  } finally {
    loading.value = false;
  }
}
</script>
