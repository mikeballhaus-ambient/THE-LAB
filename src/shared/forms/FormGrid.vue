<script setup lang="ts">
import { computed } from 'vue';
import type { IFormGridField, FormGridFieldSlotProps } from './form-layout-types';
import {
  DEFAULT_FORM_GRID_COLUMNS,
  buildFormGridFieldSlotProps,
  getFormFieldsInRow,
  getFormRowIndices,
  getFormCellAlignClasses,
} from './form-layout';

const props = withDefaults(
  defineProps<{
    components?: IFormGridField[];
    columns?: number;
    rootClass?: string;
  }>(),
  {
    components: () => [],
    columns: DEFAULT_FORM_GRID_COLUMNS,
    rootClass: '',
  },
);

defineSlots<{
  field(props: FormGridFieldSlotProps): unknown;
  empty(): unknown;
}>();

const rowIndices = computed(() => getFormRowIndices(props.components));

function fieldsInRow(row: number): IFormGridField[] {
  return getFormFieldsInRow(props.components, row);
}

function fieldSlotProps(field: IFormGridField, rowIndex: number): FormGridFieldSlotProps {
  return buildFormGridFieldSlotProps(field, rowIndex, props.columns);
}
</script>

<template>
  <div
    class="fb-form flex w-full flex-col gap-[var(--fb-row-gap,0.75rem)]"
    :class="rootClass"
  >
    <slot v-if="rowIndices.length === 0" name="empty" />

    <div
      v-for="rowIndex in rowIndices"
      :key="`fb-row-${rowIndex}`"
      class="fb-row grid w-full gap-[var(--fb-cell-gap,0.75rem)]"
      :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
    >
      <div
        v-for="field in fieldsInRow(rowIndex)"
        :key="field.fieldKey"
        class="fb-cell box-border flex min-w-0"
        :class="getFormCellAlignClasses(field)"
        :style="{
          gridColumn: `span ${Math.min(Math.max(field.span ?? 1, 1), columns)}`,
        }"
      >
        <slot name="field" v-bind="fieldSlotProps(field, rowIndex)" />
      </div>
    </div>
  </div>
</template>
