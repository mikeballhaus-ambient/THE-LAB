<script setup lang="ts">
import Checkbox from 'primevue/checkbox';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';

import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const model = useFormFieldModel(props.field);
const readOnly = useFormFieldReadOnly();
</script>

<template>
  <div
    class="flex items-center gap-2 w-full"
    :class="readOnly && 'fb-field--readonly'"
  >
    <Checkbox v-model="model" :binary="true" :disabled="readOnly" />
    <div class="flex-1 text-lab-general-text">{{ field.checkboxLabel ?? field.label }}</div>
  </div>
</template>
