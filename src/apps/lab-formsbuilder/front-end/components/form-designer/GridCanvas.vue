<script setup lang="ts">
import { computed, inject } from 'vue';
import GridCell from './GridCell.vue';
import type { FormComponent } from '../../../shared/types';
import {
  findComponentAtAnchor,
  isCellCoveredByNonAnchor,
} from '../../utils/grid-occupancy';
import { resolveGridColumns } from './grid-layout-utils';
import { FORM_DESIGN_GRID_COLUMNS_KEY } from './design-grid-context';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';

const props = defineProps<{
  components: FormComponent[] | undefined;
  gridColumns?: number;
  selectedFieldKey?: string | null;
}>();

const injectedGridColumns = inject(FORM_DESIGN_GRID_COLUMNS_KEY, null);

const gridCols = computed(() => {
  if (props.gridColumns != null) {
    return resolveGridColumns(props.gridColumns);
  }
  if (injectedGridColumns?.value != null) {
    return injectedGridColumns.value;
  }
  return DEFAULT_FORM_GRID_COLUMNS;
});

const topLevelComponents = computed(
  () => (props.components ?? []).filter(c => c.parentContainerKey == null),
);

function shouldRenderCell(row: number, col: number): boolean {
  if (isCellCoveredByNonAnchor(topLevelComponents.value, row, col)) {
    return false;
  }
  return true;
}

const getGridDimensions = computed(() => {
  const components = topLevelComponents.value;
  if (components.length === 0) {
    return { rows: 1, cols: gridCols.value };
  }
  let maxRow = 0;
  for (const c of components) {
    const row = c.row ?? 0;
    const rowSpan = c.rowSpan ?? 1;
    maxRow = Math.max(maxRow, row + rowSpan - 1);
  }
  return {
    rows: maxRow + 2,
    cols: gridCols.value,
  };
});
</script>

<template>
  <div class="flex flex-col gap-2 p-2 bg-lab-general-bg-muted w-full rounded-lg border border-lab-general-border">
    <div v-for="(row, rowIndex) in getGridDimensions.rows" :key="`row-${rowIndex}`" class="flex gap-2 w-full">
      <GridCell
        v-for="col in getGridDimensions.cols"
        :key="`cell-${rowIndex}-${col - 1}`"
        :row="rowIndex"
        :col="col - 1"
        :grid-columns="gridCols"
        :component="findComponentAtAnchor(topLevelComponents, rowIndex, col - 1)"
        :should-render="shouldRenderCell(rowIndex, col - 1)"
        :all-components="props.components"
        :selected-field-key="props.selectedFieldKey"
        @drop="$emit('drop', $event)"
        @remove="$emit('remove', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>
