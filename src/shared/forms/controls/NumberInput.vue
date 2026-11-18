<script setup lang="ts">
import { computed } from 'vue';
import InputNumber from 'primevue/inputnumber';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';

import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import { formInputNumberPt } from '@/shared/forms/form-control-pt';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const model = useFormFieldModel<number | null | undefined>(props.field);
const readOnly = useFormFieldReadOnly();

const min = computed(() => props.field.min);
const max = computed(() => props.field.max);
const step = computed(() => {
  if (props.field.numberScale === 'usd-cents') {
    return props.field.step ?? 0.01;
  }
  return props.field.step ?? 1;
});
const minFractionDigits = computed(
  () => props.field.minFractionDigits ?? (props.field.numberScale === 'usd-cents' ? 2 : 0),
);
const maxFractionDigits = computed(
  () => props.field.maxFractionDigits ?? (props.field.numberScale === 'usd-cents' ? 2 : 0),
);
</script>

<template>
  <FormFieldShell :source="field">
    <InputNumber
      v-model="model"
      :disabled="readOnly"
      show-buttons
      button-layout="stacked"
      mode="decimal"
      :min="min"
      :max="max"
      :step="step"
      :min-fraction-digits="minFractionDigits"
      :max-fraction-digits="maxFractionDigits"
      class="w-full"
      input-class="w-full"
      :pt="formInputNumberPt"
    />
  </FormFieldShell>
</template>
