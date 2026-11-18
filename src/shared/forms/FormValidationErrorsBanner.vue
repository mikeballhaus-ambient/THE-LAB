<script setup lang="ts">
import type { FormFieldValidationError } from './form-field-validation';
import { formatFieldValidationErrorLine } from './form-validation-error';

defineProps<{
  errors: FormFieldValidationError[];
}>();
</script>

<template>
  <div
    v-if="errors.length > 0"
    role="alert"
    class="form-validation-errors-banner flex flex-col gap-1 rounded-md border px-3 py-2 text-sm"
  >
    <div
      v-for="err in errors"
      :key="err.fieldKey"
      class="form-validation-error-item flex items-start gap-2"
    >
      <i
        class="pi pi-exclamation-circle text-red-400 shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <span>{{ formatFieldValidationErrorLine(err) }}</span>
    </div>
  </div>
</template>
