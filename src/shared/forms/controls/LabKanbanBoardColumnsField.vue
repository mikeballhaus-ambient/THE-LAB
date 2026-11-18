<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formInputTextPt } from '@/shared/forms/form-control-pt';
import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import { parseKanbanColumnsJson } from '@/apps/lab-helpdesk/shared/utils/kanban-board-utils';
import type { KanbanBoardColumn } from '@/apps/lab-helpdesk/shared/types/kanban-board.types';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const { generateUniqueId } = useUniqueElementId();
const readOnly = useFormFieldReadOnly();
const jsonModel = useFormFieldModel<string | undefined>(props.field);

function parseColumns(raw: unknown): KanbanBoardColumn[] {
  if (!raw || !String(raw).trim()) {
    return [{ id: crypto.randomUUID(), label: 'Column 1', value: 'new' }];
  }
  try {
    const parsed = parseKanbanColumnsJson(String(raw));
    return parsed.length ? parsed : [{ id: crypto.randomUUID(), label: 'Column 1', value: 'new' }];
  } catch {
    return [{ id: crypto.randomUUID(), label: 'Column 1', value: 'new' }];
  }
}

const columns = ref<KanbanBoardColumn[]>(parseColumns(jsonModel.value));

watch(
  () => jsonModel.value,
  (raw) => {
    columns.value = parseColumns(raw);
  },
);

function syncJson(rows: KanbanBoardColumn[]): void {
  columns.value = rows;
  jsonModel.value = JSON.stringify(rows, null, 2);
}

function addColumn(): void {
  syncJson([...columns.value, { id: crypto.randomUUID(), label: 'New column', value: 'value' }]);
}

function removeColumn(index: number): void {
  const next = columns.value.filter((_, i) => i !== index);
  syncJson(next.length ? next : [{ id: crypto.randomUUID(), label: 'Column 1', value: 'new' }]);
}

function updateColumn(index: number, patch: Partial<KanbanBoardColumn>): void {
  syncJson(columns.value.map((col, i) => (i === index ? { ...col, ...patch } : col)));
}
</script>

<template>
  <FormFieldShell :source="field">
    <p class="m-0 mb-2 text-sm text-lab-general-text-muted">
      Define kanban columns (label + value). Values must match ticket field values for the selected &quot;Group by&quot;
      field — use Help Desk board manager for presets when unsure.
    </p>
    <div class="flex flex-col gap-2">
      <div
        v-for="(col, index) in columns"
        :key="col.id"
        class="grid gap-2 rounded border border-lab-general-border p-2 sm:grid-cols-[1fr_1fr_auto]"
      >
        <InputText
          :model-value="col.label"
          placeholder="Column label"
          :disabled="readOnly"
          class="w-full"
          :pt="formInputTextPt"
          @update:model-value="(v) => updateColumn(index, { label: String(v ?? '') })"
        />
        <InputText
          :model-value="col.value"
          placeholder="Value (e.g. open)"
          :disabled="readOnly"
          class="w-full"
          :pt="formInputTextPt"
          @update:model-value="(v) => updateColumn(index, { value: String(v ?? '') })"
        />
        <Button
          v-if="!readOnly && columns.length > 1"
          type="button"
          icon="pi pi-trash"
          severity="danger"
          text
          :pt="{ root: { attrs: { id: generateUniqueId(`kanban-col-remove-${index}`) } } }"
          @click="removeColumn(index)"
        />
      </div>
      <Button
        v-if="!readOnly"
        type="button"
        label="Add column"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('kanban-col-add') } } }"
        @click="addColumn"
      />
    </div>
  </FormFieldShell>
</template>
