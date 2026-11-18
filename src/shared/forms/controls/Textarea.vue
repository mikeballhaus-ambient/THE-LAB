<script setup lang="ts">
import Textarea from 'primevue/textarea';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';

import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import { formTextareaPt } from '@/shared/forms/form-control-pt';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const model = useFormFieldModel<string | null | undefined>(props.field);
const readOnly = useFormFieldReadOnly();
</script>

<template>
  <FormFieldShell :source="field">
    <Textarea
      v-model="model"
      :readonly="readOnly"
      :disabled="false"
      :placeholder="field.placeholder || field.label || 'Enter text'"
      :rows="3"
      class="w-full"
      :pt="formTextareaPt"
    />
  </FormFieldShell>
</template>
