<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue';
import Message from 'primevue/message';
import Button from 'primevue/button';
import {
  loadFormSchema,
  mapRecordToFieldValues,
  type IFormRuntimeField,
  type LoadedFormSchema,
} from '@/shared/forms';
import FormLayoutPreview from '@/shared/forms/FormLayoutPreview.vue';
import { labAppFetch } from '@/shared/composables/useLabUserHeaders';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  formsBuilderUrl: string;
  formKey: string;
  serverUrl: string;
  entityKey: string;
  recordId: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { generateUniqueId } = useUniqueElementId();

const loading = ref(true);
const loadError = ref<string | null>(null);
const schema = shallowRef<LoadedFormSchema | null>(null);
const fieldValues = ref<Record<string, unknown> | null>(null);

function connectorRecordUrl(id: number): string {
  const base = props.serverUrl.replace(/\/$/, '');
  return `${base}/api/connector/${props.entityKey}/${id}`;
}

async function loadPreview(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  schema.value = null;
  fieldValues.value = null;
  try {
    const loaded = await loadFormSchema(props.formsBuilderUrl, props.formKey);
    const response = await labAppFetch(connectorRecordUrl(props.recordId));
    if (!response.ok) {
      throw new Error(`Could not load record (${response.status})`);
    }
    const record = (await response.json()) as Record<string, unknown>;
    const components = (loaded.components ?? []) as IFormRuntimeField[];
    schema.value = loaded;
    fieldValues.value = mapRecordToFieldValues(components, record);
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load preview';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadPreview();
});

watch(
  () => [props.formKey, props.recordId] as const,
  () => {
    void loadPreview();
  },
);
</script>

<template>
  <section
    class="lab-form-section crm-entity-record-preview mb-0 flex min-w-0 flex-col gap-3"
    :id="generateUniqueId('crm-record-preview-section')"
  >
    <h4
      class="lab-form-section__title m-0"
      :id="generateUniqueId('crm-record-preview-title')"
    >
      <span class="lab-form-section__icon" aria-hidden="true">
        <i class="pi pi-eye" />
      </span>
      Form preview
    </h4>
    <p class="lab-form-section__lead">Read-only layout from the bound edit form.</p>
    <p v-if="loading" class="text-sm text-lab-general-text-muted">Loading preview…</p>
    <Message v-else-if="loadError" severity="error" :closable="false">
      {{ loadError }}
    </Message>
    <FormLayoutPreview
      v-else-if="schema && fieldValues"
      :key="`${formKey}-${recordId}`"
      :components="schema.components"
      :columns="schema.columns"
      :form-actions="schema.formActions"
      :validation-rules="schema.validationRules"
      :field-values="fieldValues"
      preview-edit-mode
      :show-designer-hint="false"
      :show-actions-bar="false"
      compact
    />
    <div class="flex justify-end">
      <Button
        label="Close"
        size="small"
        severity="secondary"
        outlined
        :pt="{ root: { attrs: { id: generateUniqueId('crm-record-preview-close') } } }"
        @click="emit('close')"
      />
    </div>
  </section>
</template>
