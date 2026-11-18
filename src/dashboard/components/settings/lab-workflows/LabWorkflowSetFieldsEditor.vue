<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formInputTextPt, formSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';
import type { CapturedPayloadField } from '@/shared/utils/lab-workflow-captured-payload-fields';
import LabWorkflowPayloadTemplateInput from './LabWorkflowPayloadTemplateInput.vue';

/**
 * Row editor for the `set_fields` step — shaping, not mutation.
 *
 * ## Why rows and not JSON
 *
 * `set_fields` is the node a business user reaches for to turn an incoming payload into the shape the
 * rest of the workflow expects. A JSON textarea makes that user remember four key names and their
 * nesting, and every typo is a save-time schema error with a path nobody can point at. Rows state the
 * same information in the order the author thinks it: *this* field gets *that* value.
 *
 * ## The three sources, and what they mean
 *
 * | Source | `value` is | Reads the destination? |
 * |---|---|---|
 * | `literal` | the value itself | no |
 * | `from_payload` | a path on the incoming item | no |
 * | `template` | text with `{{payload.x}}` references | no |
 *
 * None reads `path` before writing it. That is the property that makes this node predictable, and it
 * is why arithmetic lives in the `code` node instead: an author mapping a payload should never have
 * to reason about what happened to be there already.
 */

type Source = 'literal' | 'from_payload' | 'template';

interface FieldRow {
  path: string;
  source: Source;
  value: string | number | boolean | null;
}

const props = defineProps<{
  fields: FieldRow[];
  /** Paths observed on the incoming payload, offered as suggestions for `from_payload`. */
  payloadPathOptions?: { label: string; value: string }[];
  capturedPayloadFields?: CapturedPayloadField[];
  blockKey: string;
}>();

const emit = defineEmits<{
  'update:fields': [fields: FieldRow[]];
}>();

const { generateUniqueId } = useUniqueElementId();

const SOURCE_OPTIONS: { label: string; value: Source; hint: string }[] = [
  { label: 'Value', value: 'literal', hint: 'Write this value' },
  { label: 'From payload', value: 'from_payload', hint: 'Copy an incoming field' },
  { label: 'Template', value: 'template', hint: 'Text with {{payload.x}} references' },
];

/** Path suggestions are static-ish data; free typing stays available (editable select). */
const pathOptions = computed(() => props.payloadPathOptions ?? []);

function patch(index: number, change: Partial<FieldRow>): void {
  emit(
    'update:fields',
    props.fields.map((row, i) => (i === index ? { ...row, ...change } : row)),
  );
}

/**
 * Switch source, converting the value so the row keeps meaning.
 *
 * Landing on `from_payload` with a literal string would silently turn `"open"` into a lookup for a
 * field called `open` — a 0-row result with no error. Clearing the value forces the author to say
 * which path they meant. The reverse (path → literal) keeps the text, which is almost always what was
 * intended when someone decides to hard-code a value.
 */
function changeSource(index: number, next: Source | null | undefined): void {
  if (!next) {
    return;
  }
  const row = props.fields[index];
  if (!row || row.source === next) {
    return;
  }
  const value = next === 'from_payload' ? '' : row.value;
  patch(index, { source: next, value });
}

function addRow(): void {
  emit('update:fields', [...props.fields, { path: '', source: 'literal', value: '' }]);
}

function removeRow(index: number): void {
  emit(
    'update:fields',
    props.fields.filter((_, i) => i !== index),
  );
}

/** Keep the stored type when the author is editing an obvious non-string literal. */
function coerceLiteral(raw: string, previous: FieldRow['value']): FieldRow['value'] {
  if (typeof previous === 'boolean') {
    return raw === 'true';
  }
  if (typeof previous === 'number') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : raw;
  }
  return raw;
}
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <p class="m-0 text-xs text-lab-general-text-muted">
      Build the output shape: each row writes a field on every item. The originals are kept, so this
      adds to the payload rather than replacing it.
    </p>

    <div v-if="fields.length === 0" class="text-xs text-lab-danger">
      Add at least one field — a Set fields node with no rows does nothing.
    </div>

    <div
      v-for="(row, index) in fields"
      :key="`set-${blockKey}-${index}`"
      class="flex flex-wrap items-start gap-1"
    >
      <InputText
        :model-value="row.path"
        placeholder="output field, e.g. taskId"
        class="min-w-[11rem] flex-1 font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-set-path-${blockKey}-${index}`))"
        @update:model-value="(v) => patch(index, { path: String(v ?? '') })"
      />

      <Select
        :model-value="row.source"
        :options="SOURCE_OPTIONS"
        option-label="label"
        option-value="value"
        class="w-[9.5rem]"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-set-source-${blockKey}-${index}`))"
        @update:model-value="(v) => changeSource(index, v)"
      />

      <!-- from_payload: suggest the paths actually observed, but allow a path not seen yet. -->
      <Select
        v-if="row.source === 'from_payload'"
        :model-value="String(row.value ?? '')"
        :options="pathOptions"
        option-label="label"
        option-value="value"
        editable
        placeholder="incoming path"
        class="min-w-[11rem] flex-1 font-mono"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-set-from-${blockKey}-${index}`))"
        @update:model-value="(v) => patch(index, { value: String(v ?? '') })"
      />
      <Select
        v-else-if="typeof row.value === 'boolean'"
        :model-value="row.value"
        :options="[
          { label: 'true', value: true },
          { label: 'false', value: false },
        ]"
        option-label="label"
        option-value="value"
        class="min-w-[8rem] flex-1"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-set-bool-${blockKey}-${index}`))"
        @update:model-value="(v) => patch(index, { value: v ?? false })"
      />
      <LabWorkflowPayloadTemplateInput
        v-else-if="row.source === 'template'"
        :model-value="String(row.value ?? '')"
        placeholder="Hello — use Insert field for payload values"
        :id-prefix="`wf-set-tpl-${blockKey}-${index}`"
        :captured-payload-fields="capturedPayloadFields ?? []"
        :payload-path-options="pathOptions"
        input-class="min-w-[11rem] flex-1 font-mono"
        @update:model-value="(v) => patch(index, { value: String(v ?? '') })"
      />
      <InputText
        v-else
        :model-value="String(row.value ?? '')"
        :placeholder="row.source === 'literal' ? 'value' : ''"
        class="min-w-[11rem] flex-1"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-set-value-${blockKey}-${index}`))"
        @update:model-value="(v) => patch(index, { value: coerceLiteral(String(v ?? ''), row.value) })"
      />

      <Button
        :id="generateUniqueId(`wf-set-remove-${blockKey}-${index}`)"
        icon="pi pi-times"
        size="small"
        text
        severity="danger"
        aria-label="Remove field"
        @click="removeRow(index)"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Button
        :id="generateUniqueId(`wf-set-add-${blockKey}`)"
        label="Add field"
        icon="pi pi-plus"
        size="small"
        text
        @click="addRow"
      />
      <span class="text-[0.7rem] text-lab-general-text-muted">
        Need arithmetic or string surgery? Use a Code node — this one only maps values.
      </span>
    </div>
  </div>
</template>
