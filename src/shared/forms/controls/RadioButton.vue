<script setup lang="ts">
import RadioButton from 'primevue/radiobutton';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';
import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import { formRadioButtonPt } from '@/shared/forms/form-control-pt';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const groupValue = useFormFieldModel(props.field);
const readOnly = useFormFieldReadOnly();

function onGroupValueChange(next: unknown): void {
  groupValue.value = next;
}
</script>

<template>
  <FormFieldShell :source="field">
    <div v-if="field.options?.length" class="flex flex-col gap-2 w-full" role="radiogroup">
      <div
        v-for="opt in field.options"
        :key="String(opt.value)"
        class="flex items-center gap-2.5 min-h-[1.75rem]"
      >
        <RadioButton
          :model-value="groupValue"
          :input-id="`${field.fieldKey}-${opt.value}`"
          :value="opt.value"
          :name="field.fieldKey"
          :disabled="readOnly"
          :pt="formRadioButtonPt"
          @update:model-value="onGroupValueChange"
        />
        <label
          class="text-sm text-lab-general-text cursor-pointer select-none"
          :for="`${field.fieldKey}-${opt.value}`"
        >{{ opt.label }}</label>
      </div>
    </div>
    <RadioButton
      v-else
      :model-value="groupValue"
      :name="field.fieldKey"
      :disabled="readOnly"
      :pt="formRadioButtonPt"
      @update:model-value="onGroupValueChange"
    />
  </FormFieldShell>
</template>
