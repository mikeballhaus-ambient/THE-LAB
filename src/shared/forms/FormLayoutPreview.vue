<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import type { FormActionsConfig } from '@/shared/forms/form-actions-config';
import FormRuntime from '@/shared/forms/FormRuntime.vue';
import FormActionsBar from '@/shared/forms/FormActionsBar.vue';
import { normalizeFormActionsConfig } from '@/shared/forms/form-actions-config';
import { prepareFormRuntimeFields } from '@/shared/forms/form-runtime-fields';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import type { FieldValidationRule } from '@/shared/forms/form-field-validation';
import { clampFormGridColumns } from '@/shared/forms/form-layout';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  FORM_INVALID_FIELD_KEYS_KEY,
  validateFormFields,
} from '@/shared/forms/form-field-validation';
import { FORM_RUNTIME_VALUES_KEY } from '@/shared/forms/form-runtime-values';
import { FORM_RUNTIME_READ_ONLY_KEY } from '@/shared/forms/form-runtime-readonly';

const { generateUniqueId } = useUniqueElementId();
const previewPrimaryId = generateUniqueId('layout-preview-actions-primary');
const previewCancelId = generateUniqueId('layout-preview-actions-cancel');

const props = withDefaults(
  defineProps<{
    components?: IFormRuntimeField[];
    columns?: number;
    formActions?: FormActionsConfig | null;
    previewEditMode?: boolean;
    validationRules?: Record<string, FieldValidationRule[]>;
    /** When set, fields show these values (e.g. CRM record view). Enables read-only by default. */
    fieldValues?: Record<string, unknown> | null;
    readOnly?: boolean;
    showDesignerHint?: boolean;
    showActionsBar?: boolean;
    compact?: boolean;
  }>(),
  {
    components: () => [],
    showDesignerHint: true,
    showActionsBar: true,
    compact: false,
  },
);

const gridColumns = computed(() => clampFormGridColumns(props.columns));

const isReadOnly = computed(() => props.readOnly === true || props.fieldValues != null);

provide(FORM_RUNTIME_READ_ONLY_KEY, isReadOnly);

if (props.fieldValues != null) {
  provide(FORM_RUNTIME_VALUES_KEY, {
    getValue: (fieldKey: string) => props.fieldValues?.[fieldKey],
    setValue: () => {},
  });
}

const runtimeFields = computed(() => {
  const prepared = prepareFormRuntimeFields(props.components ?? [], props.validationRules);
  if (props.fieldValues == null) {
    return prepared;
  }
  return prepared.map((field) => ({
    ...field,
    value: props.fieldValues?.[field.fieldKey] ?? field.value,
  }));
});

const actionsConfig = computed(() => normalizeFormActionsConfig(props.formActions));

const invalidFieldKeys = ref<Set<string>>(new Set());

provide(FORM_INVALID_FIELD_KEYS_KEY, invalidFieldKeys);

function runPreviewValidation(): void {
  if (props.fieldValues != null) {
    invalidFieldKeys.value = new Set();
    return;
  }
  const result = validateFormFields(runtimeFields.value, {});
  invalidFieldKeys.value = new Set(result.invalidFieldKeys);
}

watch(
  runtimeFields,
  () => {
    runPreviewValidation();
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <div
    class="form-layout-preview lab-form-runtime w-full bg-transparent p-4 text-lab-general-text [--fb-cell-gap:1rem] [--fb-row-gap:1rem]"
    :class="compact ? 'min-h-0' : 'min-h-[400px]'"
    data-preview-mode="true"
  >
    <p v-if="showDesignerHint" class="text-xs text-lab-general-text-muted m-0 mb-3">
      Preview mode validates required fields as empty. Required labels show a red asterisk (*).
      Save/update and cancel appear below the grid (non-functional in preview).
    </p>
    <FormRuntime
      :components="runtimeFields"
      :columns="gridColumns"
      root-class=""
    >
      <template #empty>
        <p class="text-sm text-center text-lab-general-text-muted m-0 py-12">
          Add fields to the canvas to preview the form layout.
        </p>
      </template>
    </FormRuntime>

    <FormActionsBar
      v-if="showActionsBar"
      :config="actionsConfig"
      :is-edit-mode="previewEditMode === true"
      preview-mode
      :primary-id="previewPrimaryId"
      :cancel-id="previewCancelId"
    />
  </div>
</template>
