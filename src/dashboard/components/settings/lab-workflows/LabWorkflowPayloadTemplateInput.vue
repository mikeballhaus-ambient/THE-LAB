<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formInputTextPt, formSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';
import type { CapturedPayloadField } from '@/shared/utils/lab-workflow-captured-payload-fields';
import {
  buildPayloadTemplateInsertOptions,
  insertPayloadTemplateSnippet,
} from '@/shared/utils/lab-workflow-payload-template-insert';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    /** Prefix for stable automation ids (passed from parent block key). */
    idPrefix: string;
    capturedPayloadFields?: CapturedPayloadField[];
    payloadPathOptions?: { label: string; value: string }[];
    multiline?: boolean;
    rows?: number;
    inputClass?: string;
  }>(),
  {
    capturedPayloadFields: () => [],
    payloadPathOptions: () => [],
    multiline: false,
    rows: 3,
    inputClass: 'min-w-[12rem] flex-1',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { generateUniqueId } = useUniqueElementId();
const controlRef = ref<{ $el?: HTMLElement } | null>(null);

const insertOptions = computed(() =>
  buildPayloadTemplateInsertOptions(props.capturedPayloadFields, props.payloadPathOptions),
);

const hasInsertOptions = computed(() => insertOptions.value.length > 0);

function nativeInput(): HTMLInputElement | HTMLTextAreaElement | null {
  const root = controlRef.value?.$el;
  if (!root) {
    return null;
  }
  return root.querySelector('input, textarea');
}

function emitInsert(path: string): void {
  const el = nativeInput();
  const start = el?.selectionStart ?? props.modelValue.length;
  const end = el?.selectionEnd ?? start;
  const { text, cursor } = insertPayloadTemplateSnippet(props.modelValue, path, start, end);
  emit('update:modelValue', text);
  void nextTick(() => {
    const input = nativeInput();
    if (!input) {
      return;
    }
    input.focus();
    input.setSelectionRange(cursor, cursor);
  });
}

function onSelectInsert(path: string | null | undefined): void {
  if (!path?.trim()) {
    return;
  }
  emitInsert(path);
}
</script>

<template>
  <div class="flex w-full flex-col gap-1.5">
    <component
      :is="multiline ? Textarea : InputText"
      ref="controlRef"
      :model-value="modelValue"
      :placeholder="placeholder"
      :rows="multiline ? rows : undefined"
      :class="inputClass"
      :auto-resize="multiline ? true : undefined"
      :pt="
        withFormControlRootId(
          formInputTextPt,
          generateUniqueId(`${idPrefix}-payload-template-input`),
        )
      "
      @update:model-value="(value: string | undefined) => emit('update:modelValue', value ?? '')"
    />
    <div v-if="hasInsertOptions" class="flex flex-wrap items-center gap-1">
      <Select
        :model-value="null"
        :options="insertOptions"
        option-label="label"
        option-value="path"
        placeholder="Insert field…"
        class="min-w-[10rem] max-w-full"
        :pt="
          withFormControlRootId(formSelectPt, generateUniqueId(`${idPrefix}-payload-template-select`))
        "
        @update:model-value="onSelectInsert"
      />
      <Button
        v-for="field in insertOptions.slice(0, 8)"
        :key="`${idPrefix}-tpl-${field.path}`"
        :id="generateUniqueId(`${idPrefix}-tpl-chip-${field.path}`)"
        :label="field.path"
        size="small"
        text
        class="font-mono text-[0.7rem]"
        :title="field.type ? `${field.path} (${field.type})` : field.path"
        @click="emitInsert(field.path)"
      />
    </div>
    <p v-else class="m-0 text-[0.7rem] text-lab-general-text-muted">
      Capture a sample payload (run once or use the test URL) to insert fields without typing
      <code v-pre>{{payload.field}}</code>.
    </p>
  </div>
</template>
