<script setup lang="ts">
import InputText from 'primevue/inputtext';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';
import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import { formInputTextPt } from '@/shared/forms/form-control-pt';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const model = useFormFieldModel<string | null | undefined>(props.field);
const readOnly = useFormFieldReadOnly();
</script>

<template>
  <FormFieldShell :source="field">
    <InputText
      v-model="model"
      :readonly="readOnly"
      :disabled="false"
      :placeholder="field.placeholder || field.label || 'Enter text'"
      class="w-full"
      :pt="formInputTextPt"
    />
  </FormFieldShell>
</template>
