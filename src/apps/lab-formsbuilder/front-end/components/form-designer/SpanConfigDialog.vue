<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { FormComponent } from '../../../shared/types';
import { isColSpanValidForComponent, isRowSpanValidForComponent } from '../../utils/grid-occupancy';
import { isContainerType } from '../../utils/container-types';
import { clampFormGridColumns, DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';
import { maxSpanAtCol } from './grid-layout-utils';

export interface GridSpanConfig {
  colSpan: number;
  rowSpan: number;
}

interface Props {
  component: FormComponent | undefined;
  components: FormComponent[] | undefined;
  visible: boolean;
  gridColumns?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'config', component: FormComponent, config: GridSpanConfig): void;
  (e: 'cancel'): void;
  (e: 'update:visible', value: boolean): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const selectedSpan = ref(1);
const selectedRowSpan = ref(1);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const showRowSpan = computed(() => isContainerType(props.component?.type));

const gridCols = computed(() => clampFormGridColumns(props.gridColumns ?? DEFAULT_FORM_GRID_COLUMNS));

const spanOptions = computed(() => {
  const maxAtCol = props.component
    ? maxSpanAtCol(props.component.col, gridCols.value)
    : gridCols.value;
  const maxSpan = Math.min(gridCols.value, maxAtCol);
  const options: Array<{ value: number; label: string }> = [];
  for (let n = 1; n <= maxSpan; n += 1) {
    const pct = Math.round((n / gridCols.value) * 100);
    options.push({
      value: n,
      label: n === gridCols.value
        ? `${n} Column${n > 1 ? 's' : ''} (${pct}% — full width)`
        : `${n} Column${n > 1 ? 's' : ''} (${pct}%)`,
    });
  }
  return options;
});

watch(
  () => [props.visible, props.component?.fieldKey, props.component?.span, props.component?.rowSpan] as const,
  ([visible, , span, rowSpan]) => {
    if (visible) {
      selectedSpan.value = span ?? 1;
      selectedRowSpan.value = rowSpan ?? 1;
      isValid.value = true;
      invalidMsg.value = '';
    }
  },
);

const rowSpanOptions = [
  { value: 1, label: '1 Row' },
  { value: 2, label: '2 Rows' },
  { value: 3, label: '3 Rows' },
  { value: 4, label: '4 Rows' },
];

const isValid = ref<boolean>(true);
const invalidMsg = ref<string>('');

function validate(): boolean {
  if (!props.component) {
    return false;
  }
  if (!isColSpanValidForComponent(props.component, selectedSpan.value, props.components, gridCols.value)) {
    invalidMsg.value = 'Column span overlaps another component in the grid';
    return false;
  }
  if (
    showRowSpan.value
    && !isRowSpanValidForComponent(
      { ...props.component, span: selectedSpan.value },
      selectedRowSpan.value,
      props.components,
      gridCols.value,
    )
  ) {
    invalidMsg.value = 'Row span overlaps another component in the grid';
    return false;
  }
  return true;
}

function handleConfirm(): void {
  if (!props.component) {
    return;
  }
  if (validate()) {
    emit('config', props.component, {
      colSpan: selectedSpan.value,
      rowSpan: showRowSpan.value ? selectedRowSpan.value : 1,
    });
    isValid.value = true;
    invalidMsg.value = '';
    return;
  }
  isValid.value = false;
}

function handleCancel(): void {
  emit('cancel');
  emit('update:visible', false);
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="showRowSpan ? 'Configure grid span' : 'Configure column span'"
    :style="{ width: '420px' }"
    :breakpoints="{ '1500px': '45vw', '576px': '90vw' }"
    :close-on-escape="false"
    :pt="{ root: { id: generateUniqueId('span-config-dialog') } }"
  >
    <div class="flex flex-col gap-3">
      <div class="p-3! flex flex-col gap-2" :class="{ 'border border-red-600 rounded-lg': !isValid }">
        <p class="m-0 text-sm text-lab-general-text">
          Choose how many columns{{ showRowSpan ? ' and rows' : '' }} this item occupies.
        </p>
        <div class="text-xs font-semibold text-lab-general-text-muted uppercase">Columns</div>
        <div class="flex flex-col gap-2">
          <Button
            v-for="option in spanOptions"
            :key="option.value"
            :label="option.label"
            :class="
              selectedSpan === option.value
                ? '!border-lab-button-border-hover !bg-lab-button-bg-hover !text-lab-button-text'
                : ''
            "
            :disabled="!isColSpanValidForComponent(component!, option.value, components, gridCols)"
            :pt="{ root: { id: generateUniqueId(`span-option-${option.value}`) } }"
            @click="selectedSpan = option.value"
          />
        </div>
        <template v-if="showRowSpan">
          <div class="text-xs font-semibold text-lab-general-text-muted uppercase mt-2">Rows</div>
          <div class="flex flex-col gap-2">
            <Button
              v-for="option in rowSpanOptions"
              :key="option.value"
              :label="option.label"
              :class="
                selectedRowSpan === option.value
                  ? '!border-lab-button-border-hover !bg-lab-button-bg-hover !text-lab-button-text'
                  : ''
              "
              :disabled="!isRowSpanValidForComponent(
                { ...(component as FormComponent), span: selectedSpan },
                option.value,
                components,
                gridCols,
              )"
              :pt="{ root: { id: generateUniqueId(`row-span-option-${option.value}`) } }"
              @click="selectedRowSpan = option.value"
            />
          </div>
        </template>
      </div>
      <div v-if="!isValid" class="text-red-400 w-full text-center">{{ invalidMsg }}</div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        :pt="{ root: { id: generateUniqueId('span-config-cancel') } }"
        @click="handleCancel"
      />
      <Button
        label="Apply"
        :pt="{ root: { id: generateUniqueId('span-config-apply') } }"
        @click="handleConfirm"
      />
    </template>
  </Dialog>
</template>
