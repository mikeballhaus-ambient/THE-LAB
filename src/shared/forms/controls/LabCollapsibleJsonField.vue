<script setup lang="ts">
import { computed, ref } from 'vue';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';
import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import { formTextareaPt } from '@/shared/forms/form-control-pt';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const { generateUniqueId } = useUniqueElementId();
const model = useFormFieldModel<string | undefined>(props.field);
const readOnly = useFormFieldReadOnly();
const showAdvanced = ref(false);

const summary = computed(() => {
  const raw = model.value;
  if (raw == null || String(raw).trim() === '') {
    return 'No technical definition set yet.';
  }
  const text = String(raw).trim();
  const lines = text.split('\n').length;
  return `Technical JSON definition (${lines} line${lines === 1 ? '' : 's'}).`;
});
</script>

<template>
  <FormFieldShell :source="field">
    <p class="m-0 mb-2 text-sm text-lab-general-text-muted">
      This setting is normally edited in the dedicated Lab screen (rules, workflows, etc.). You do not need to write
      JSON unless an administrator asked you to paste an export.
    </p>
    <p class="m-0 mb-2 text-sm text-lab-general-text">{{ summary }}</p>
    <Button
      v-if="!readOnly"
      type="button"
      :label="showAdvanced ? 'Hide advanced JSON' : 'Show advanced JSON'"
      severity="secondary"
      size="small"
      text
      :pt="{ root: { attrs: { id: generateUniqueId('lab-json-toggle') } } }"
      @click="showAdvanced = !showAdvanced"
    />
    <Textarea
      v-if="showAdvanced || readOnly"
      v-model="model"
      :disabled="readOnly"
      rows="8"
      class="mt-2 w-full font-mono text-xs"
      placeholder="{ }"
      :pt="formTextareaPt"
    />
  </FormFieldShell>
</template>
