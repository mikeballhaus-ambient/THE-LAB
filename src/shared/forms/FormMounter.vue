<script setup lang="ts">
import { computed, onMounted, provide, ref, shallowRef } from 'vue';
import FormRuntime from './FormRuntime.vue';
import FormActionsBar from './FormActionsBar.vue';
import { loadFormSchema } from './load-form-schema';
import {
  normalizeFormActionsConfig,
  type FormActionsConfig,
} from './form-actions-config';
import type { IFormRuntimeField, LoadedFormSchema } from './form-runtime-types';
import { clampFormGridColumns } from './form-layout';
import {
  FORM_INVALID_FIELD_KEYS_KEY,
  validateFormFields,
} from './form-field-validation';
import { formValidationErrorFromResult } from './form-validation-error';
import { FORM_RUNTIME_VALUES_KEY } from './form-runtime-values';
import { buildFormSubmitPayload } from './form-submit-payload';
import { prepareFormRuntimeFields } from './form-runtime-fields';
import type { FieldValidationRule } from './form-field-validation';
import { filterComponentsForChartBuilderSlot } from '@/shared/lab-integrations/chart-builder-stub-field-filter';
import { filterComponentsForApprovalRequestSlot } from '@/shared/lab-integrations/approval-request-form-stub-filter';

const props = withDefaults(
  defineProps<{
    formsBuilderUrl: string;
    formKey: string;
    /** When set, primary action uses update label and submit includes id */
    recordId?: string | number | null;
    primaryId?: string;
    cancelId?: string;
    /** Host app id for connector lookup fetches during schema load. */
    hostAppId?: string;
    /** Lab integration slot (e.g. chart.designer.metadata) for host-specific field subsets. */
    integrationSlot?: string;
    hideFormActions?: boolean;
  }>(),
  {
    recordId: null,
    primaryId: undefined,
    cancelId: undefined,
    hostAppId: undefined,
    integrationSlot: undefined,
    hideFormActions: false,
  },
);

const emit = defineEmits<{
  (e: 'submit', data: Record<string, unknown>): void;
  (e: 'cancel'): void;
  (e: 'error', error: Error): void;
  (e: 'loaded', schema: LoadedFormSchema): void;
}>();

const loading = ref(true);
const loadError = ref<string | null>(null);
const schema = shallowRef<LoadedFormSchema | null>(null);
const fieldValues = ref<Record<string, unknown>>({});
const invalidFieldKeys = ref<Set<string>>(new Set());

provide(FORM_INVALID_FIELD_KEYS_KEY, invalidFieldKeys);

provide(FORM_RUNTIME_VALUES_KEY, {
  getValue: (fieldKey: string) => fieldValues.value[fieldKey],
  setValue: (fieldKey: string, value: unknown) => {
    fieldValues.value = { ...fieldValues.value, [fieldKey]: value };
  },
});

const isEditMode = computed(() => props.recordId != null && props.recordId !== '');

const gridColumns = computed(() => clampFormGridColumns(schema.value?.columns));

const runtimeFields = computed((): IFormRuntimeField[] => {
  const validationRules = schema.value?.validationRules as
    | Record<string, FieldValidationRule[]>
    | undefined;
  const prepared = prepareFormRuntimeFields(schema.value?.components ?? [], validationRules);
  return prepared.map((field) => ({
    ...field,
    value: fieldValues.value[field.fieldKey] ?? field.value,
  }));
});

const actionsConfig = computed((): FormActionsConfig =>
  normalizeFormActionsConfig(schema.value?.formActions),
);

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    const loaded = await loadFormSchema(props.formsBuilderUrl, props.formKey, {
      hostAppId: props.hostAppId,
    });
    if (props.integrationSlot && loaded.components?.length) {
      let components = loaded.components;
      if (props.hostAppId) {
        components = filterComponentsForChartBuilderSlot(
          props.hostAppId,
          props.integrationSlot,
          components,
        ) as LoadedFormSchema['components'];
      }
      components = filterComponentsForApprovalRequestSlot(
        props.integrationSlot,
        components,
      ) as LoadedFormSchema['components'];
      loaded.components = components;
    }
    schema.value = loaded;
    emit('loaded', loaded);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    loadError.value = error.message;
  } finally {
    loading.value = false;
  }
}

function onPrimary(): boolean {
  const result = validateFormFields(runtimeFields.value, fieldValues.value);
  if (!result.valid) {
    invalidFieldKeys.value = new Set(result.invalidFieldKeys);
    emit('error', formValidationErrorFromResult(result));
    return false;
  }
  invalidFieldKeys.value = new Set();
  const fields = runtimeFields.value;
  const data = buildFormSubmitPayload(fields, fieldValues.value);
  if (isEditMode.value && props.recordId != null) {
    data.id = props.recordId;
  }
  emit('submit', data);
  return true;
}

function setFieldValues(values: Record<string, unknown>): void {
  fieldValues.value = { ...fieldValues.value, ...values };
}

function clearFieldValues(): void {
  fieldValues.value = {};
}

function onCancel(): void {
  emit('cancel');
}

onMounted(() => {
  void load();
});

defineExpose({ reload: load, fieldValues, setFieldValues, clearFieldValues, triggerSubmit: onPrimary });
</script>

<template>
  <div class="form-mounter lab-form-runtime w-full text-lab-general-text">
    <p v-if="loading" class="text-sm text-lab-general-text-muted">Loading form…</p>
    <p v-else-if="loadError" class="text-sm text-red-400">{{ loadError }}</p>
    <template v-else-if="schema">
      <FormRuntime
        :components="runtimeFields"
        :columns="gridColumns"
        root-class="form-mounter-grid"
      />
      <FormActionsBar
        v-if="!hideFormActions"
        :config="actionsConfig"
        :is-edit-mode="isEditMode"
        :primary-id="primaryId"
        :cancel-id="cancelId"
        @primary="onPrimary"
        @cancel="onCancel"
      />
    </template>
  </div>
</template>

