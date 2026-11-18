<script setup lang="ts">
import { computed, provide } from 'vue';
import FormGrid from './FormGrid.vue';
import FormField from './FormField.vue';
import type { FormGridFieldSlotProps } from './form-layout-types';
import type { IFormRuntimeField } from './form-runtime-types';
import { FORM_COMPONENTS_KEY } from './form-components-context';
import { clampFormGridColumns, DEFAULT_FORM_GRID_COLUMNS } from './form-layout';

const props = withDefaults(
  defineProps<{
    components?: IFormRuntimeField[];
    columns?: number;
    rootClass?: string;
  }>(),
  {
    components: () => [],
    columns: DEFAULT_FORM_GRID_COLUMNS,
    rootClass: '',
  },
);

const gridColumns = computed(() => clampFormGridColumns(props.columns));

const allComponents = computed(() => props.components ?? []);
const topLevelComponents = computed(() =>
  allComponents.value.filter(
    c => !(c as IFormRuntimeField & { parentContainerKey?: string }).parentContainerKey,
  ),
);

provide(FORM_COMPONENTS_KEY, allComponents);

defineSlots<{
  field(props: FormGridFieldSlotProps): unknown;
  empty(): unknown;
}>();
</script>

<template>
  <FormGrid
    :components="topLevelComponents"
    :columns="gridColumns"
    :root-class="rootClass"
  >
    <template #empty>
      <slot name="empty">
        <p class="text-sm text-center text-lab-general-text-muted m-0 py-12">
          No fields to display.
        </p>
      </slot>
    </template>

    <template #field="slotProps">
      <slot name="field" v-bind="slotProps">
        <FormField
          class="w-full min-w-0"
          :field="slotProps.field as IFormRuntimeField"
        />
      </slot>
    </template>
  </FormGrid>
</template>
