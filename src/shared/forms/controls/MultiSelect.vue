<script setup lang="ts">
import { ref, watch } from 'vue';
import MultiSelect from 'primevue/multiselect';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';

import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import { formMultiSelectPt } from '@/shared/forms/form-control-pt';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const storeModel = useFormFieldModel(props.field);
const readOnly = useFormFieldReadOnly();

function normalizeValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(v => String(v));
  }
  return [];
}

const selected = ref<string[]>(normalizeValue(storeModel.value));

watch(storeModel, (next) => {
  selected.value = normalizeValue(next);
});

function onSelectedChange(next: string[]): void {
  selected.value = next;
  storeModel.value = next;
}
</script>
<template>
  <FormFieldShell :source="field">
    <MultiSelect
      :model-value="selected"
      append-to="body"
      :disabled="readOnly"
      :options="field.options ?? []"
      option-label="label"
      option-value="value"
      display="chip"
      filter
      placeholder="Select one or more"
      class="w-full"
      :pt="formMultiSelectPt"
      @update:model-value="onSelectedChange"
    />
  </FormFieldShell>
</template>
