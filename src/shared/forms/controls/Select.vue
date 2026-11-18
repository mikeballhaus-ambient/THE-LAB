<script setup lang="ts">
import Select from 'primevue/select';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';
import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import { formSelectPt } from '@/shared/forms/form-control-pt';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const model = useFormFieldModel(props.field);
const readOnly = useFormFieldReadOnly();
</script>

<template>
  <FormFieldShell :source="field">
    <Select
      v-model="model"
      append-to="body"
      :disabled="readOnly"
      :options="field.options ?? []"
      option-label="label"
      option-value="value"
      class="w-full"
      :pt="formSelectPt"
    />
  </FormFieldShell>
</template>
