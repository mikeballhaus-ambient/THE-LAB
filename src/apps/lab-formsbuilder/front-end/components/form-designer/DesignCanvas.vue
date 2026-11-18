<script setup lang="ts">
import { ref, watch, computed, provide } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import GridCanvas from './GridCanvas.vue';
import FormLayoutPreview from '@/shared/forms/FormLayoutPreview.vue';
import SpanConfigDialog from './SpanConfigDialog.vue';
import LayoutConfigDialog from './LayoutConfigDialog.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { getComponentDefinition } from '../../composables/useFormComponents';
import type { FormComponent, FormSchema } from '../../../shared/types';
import {
  canPlaceComponent,
  isCanvasComponentInstance,
  isPaletteDragPayload,
  normalizedCol,
  resolvePlacedComponent,
  resolveGridColumns,
} from './grid-layout-utils';

import type { GridSpanConfig } from './SpanConfigDialog.vue';
import { defaultContainerConfig, isContainerType } from '../../utils/container-types';
import { DEFAULT_LABEL_DISPLAY_STYLE, isStaticLabelComponentType } from '@/shared/forms/label-display-style';
import { FORM_COMPONENTS_KEY } from '@/shared/forms/form-components-context';
import { createSchemaFieldValuesStore } from '@/shared/forms/design-canvas-values';
import { FORM_RUNTIME_VALUES_KEY } from '@/shared/forms/form-runtime-values';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import {
  clampFormComponentsToGridColumns,
  clampFormGridColumns,
  formGridColumnOptions,
} from '@/shared/forms/form-layout';
import { reflowTopLevelComponentsToGrid } from '../../utils/grid-reflow';
import { FORM_DESIGN_GRID_COLUMNS_KEY } from './design-grid-context';
import {
  FORM_DESIGN_CANVAS_ACTIONS_KEY,
  FORM_DESIGN_CONTAINER_DROP_KEY,
  FORM_DESIGN_TABS_ACTIVE_TAB_KEY,
  type ContainerDropEvent,
} from './design-container-context';
import {
  assignComponentToContainer,
  releaseComponentToTopLevelGrid,
} from '../../utils/container-drop';

const props = defineProps<{
  schema?: FormSchema;
  selectedFieldKey?: string | null;
  formActionsPreviewEditMode?: boolean;
}>();
const emit = defineEmits<{
  (e: 'component-drop', component: FormComponent): void;
  (e: 'component-remove', fieldKey: string): void;
  (e: 'component-select', component: FormComponent): void;
  (e: 'canvas-clear'): void;
  (e: 'preview'): void;
  (e: 'drag-start', component: FormComponent): void;
  (e: 'drag-end'): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const formColumnsSelectId = generateUniqueId('form-columns-select');

const pendingComponent = ref<FormComponent | undefined>();
const showSpanConfigDialog = ref(false);
const spanDialogMode = ref<'create' | 'edit'>('create');
const showLayoutConfigDialog = ref(false);
const pendingLayoutComponent = ref<FormComponent | undefined>();
const clearCanvasConfirmVisible = ref(false);
const showFormPreview = ref(false);

const hasCanvasComponents = computed(
  () => (props.schema?.components?.length ?? 0) > 0,
);

const gridColumns = computed(() => resolveGridColumns(props.schema?.columns));

provide(FORM_DESIGN_GRID_COLUMNS_KEY, gridColumns);

const columnCountOptions = formGridColumnOptions();

const selectedColumnCount = computed({
  get: () => gridColumns.value,
  set: (value: number) => {
    const schema = props.schema;
    if (!schema) {
      return;
    }
    const cols = clampFormGridColumns(value);
    const prev = clampFormGridColumns(schema.columns);
    schema.columns = cols;
    if (cols < prev) {
      reflowTopLevelComponentsToGrid(schema.components, cols);
    } else {
      clampFormComponentsToGridColumns(schema.components, cols);
    }
  },
});

provide(
  FORM_COMPONENTS_KEY,
  computed(() => (props.schema?.components ?? []) as IFormRuntimeField[]),
);

provide(
  FORM_RUNTIME_VALUES_KEY,
  createSchemaFieldValuesStore(() => props.schema?.components ?? []),
);

provide(FORM_DESIGN_CANVAS_ACTIONS_KEY, {
  select: (component: FormComponent) => handleSelect(component),
  remove: (component: FormComponent) => handleRemove(component),
});

provide(FORM_DESIGN_CONTAINER_DROP_KEY, (event: ContainerDropEvent) => {
  handleContainerDrop(event);
});

const tabsActiveTabByFieldKey = ref(new Map<string, number>());
provide(FORM_DESIGN_TABS_ACTIVE_TAB_KEY, tabsActiveTabByFieldKey);

function toggleFormPreview(): void {
  showFormPreview.value = !showFormPreview.value;
}

function requestClearCanvas(): void {
  if (!hasCanvasComponents.value) {
    return;
  }
  clearCanvasConfirmVisible.value = true;
}

function confirmClearCanvas(): void {
  clearCanvasConfirmVisible.value = false;
  showFormPreview.value = false;
  emit('canvas-clear');
}

async function addComponent(component: FormComponent, config: GridSpanConfig) {
  const isContainer = isContainerType(component.type);
  const fieldKey = isContainer ? `container-${Date.now()}` : `field-${Date.now()}`;

  const definition = await getComponentDefinition(component.type);
  const isLabel = isStaticLabelComponentType(component.type);
  const newComponent: FormComponent = {
    type: component.type,
    fieldKey,
    span: config.colSpan,
    rowSpan: config.rowSpan,
    label: isContainer ? component.label : isLabel ? 'Section heading' : `New ${component.label}`,
    row: component.row,
    col: component.col,
    definition,
    hAlign: 'left',
    vAlign: 'top',
    labelLayout: 'vertical',
    labelDisplay: isLabel ? { ...DEFAULT_LABEL_DISPLAY_STYLE } : undefined,
    container: isContainer
      ? defaultContainerConfig(component.type === 'Tabs' ? 'tabs' : 'group')
      : undefined,
  };

  emit('component-drop', newComponent);

  pendingComponent.value = undefined;
  showSpanConfigDialog.value = false;
  spanDialogMode.value = 'create';
}

async function addComponentToContainer(
  source: FormComponent,
  container: FormComponent,
  tabIndex?: number,
): Promise<void> {
  if (isContainerType(source.type)) {
    return;
  }

  const definition = await getComponentDefinition(source.type);
  const newComponent: FormComponent = {
    type: source.type,
    fieldKey: `field-${Date.now()}`,
    span: 1,
    rowSpan: 1,
    label: `New ${source.label}`,
    definition,
    hAlign: 'left',
    vAlign: 'top',
    labelLayout: 'vertical',
  };

  const all = props.schema?.components ?? [];
  assignComponentToContainer(newComponent, container, all, tabIndex);
  emit('component-drop', newComponent);
}

function handleContainerDrop(event: ContainerDropEvent): void {
  const all = props.schema?.components ?? [];
  const container = all.find(c => c.fieldKey === event.containerFieldKey);
  if (!container || !isContainerType(container.type)) {
    return;
  }

  if (isPaletteDragPayload(event.component)) {
    void addComponentToContainer(event.component, container, event.tabIndex);
    return;
  }

  const placed = resolvePlacedComponent(event.component, all);
  if (!placed || isContainerType(placed.type)) {
    return;
  }

  assignComponentToContainer(placed, container, all, event.tabIndex);
}

function openSpanConfigForComponent(component: FormComponent): void {
  pendingComponent.value = component;
  spanDialogMode.value = 'edit';
  showSpanConfigDialog.value = true;
}

function openLayoutConfigForComponent(component: FormComponent): void {
  pendingLayoutComponent.value = component;
  showLayoutConfigDialog.value = true;
}

defineExpose({ openSpanConfigForComponent, openLayoutConfigForComponent });

function handlePaletteDrop(payload: { row: number; col: number; component: FormComponent }) {
  const { component, row, col } = payload;
  pendingComponent.value = {
    type: component.type,
    label: component.label,
    fieldKey: component.fieldKey,
    icon: component.icon,
    row,
    col,
  };
  spanDialogMode.value = 'create';
  showSpanConfigDialog.value = true;
}

function handleMove(payload: { component: FormComponent; row: number; col: number }) {
  const { component, row, col } = payload;
  const all = props.schema?.components ?? [];
  const placed = resolvePlacedComponent(component, all) ?? component;

  const fromRow = placed.row ?? 0;
  const fromCol = normalizedCol(placed.col);
  if (
    placed.parentContainerKey == null
    && fromRow === row
    && fromCol === col
  ) {
    return;
  }

  if (!canPlaceComponent(placed, row, col, all, placed, gridColumns.value)) {
    return;
  }

  releaseComponentToTopLevelGrid(placed, row, col, all);
}

function handleGridDrop(payload: { row: number; col: number; component: FormComponent }) {
  const { component, row, col } = payload;
  const placed = props.schema?.components ?? [];

  if (isPaletteDragPayload(component)) {
    handlePaletteDrop({ row, col, component });
    return;
  }

  if (isCanvasComponentInstance(component, placed)) {
    handleMove({ component, row, col });
    return;
  }

  handlePaletteDrop({ row, col, component });
}

function handleSpanConfig(component: FormComponent, config: GridSpanConfig): void {
  if (spanDialogMode.value === 'edit') {
    component.span = config.colSpan;
    component.rowSpan = config.rowSpan;
    pendingComponent.value = undefined;
    showSpanConfigDialog.value = false;
    spanDialogMode.value = 'create';
    return;
  }

  void addComponent(component, config);
}

function handleSpanCancel(): void {
  pendingComponent.value = undefined;
  spanDialogMode.value = 'create';
}

function handleLayoutConfig(
  component: FormComponent,
  layout: {
    hAlign: FormComponent['hAlign'];
    vAlign: FormComponent['vAlign'];
    labelLayout: FormComponent['labelLayout'];
  },
): void {
  component.hAlign = layout.hAlign;
  component.vAlign = layout.vAlign;
  component.labelLayout = layout.labelLayout;
  pendingLayoutComponent.value = undefined;
}

function handleLayoutCancel(): void {
  pendingLayoutComponent.value = undefined;
}

function handleSelect(component: FormComponent) {
  emit('component-select', component);
}

function handleRemove(component: FormComponent) {
  emit('component-remove', component.fieldKey || '');
}

watch(
  () => props.schema?.components,
  (components) => {
    if (!components?.length) {
      return;
    }
    for (const c of components) {
      if (c.hAlign === undefined) {
        c.hAlign = 'left';
      }
      if (c.vAlign === undefined) {
        c.vAlign = 'top';
      }
      if (c.labelLayout === undefined) {
        c.labelLayout = 'vertical';
      }
    }
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <Card class="design-canvas" pt:root="flex-1">
    <template #title>
      <div class="canvas-title-row">
        <span>{{ showFormPreview ? 'Form preview' : 'Form Design Canvas' }}</span>
        <div class="canvas-title-actions">
          <div class="canvas-columns-picker">
            <label :id="generateUniqueId('form-columns-label')" class="canvas-columns-label" :for="formColumnsSelectId">
              Columns
            </label>
            <Select
              v-model="selectedColumnCount"
              :options="columnCountOptions"
              option-label="label"
              option-value="value"
              size="small"
              :pt="{
                root: { attrs: { id: formColumnsSelectId } },
              }"
            />
          </div>
          <Button
            :label="showFormPreview ? 'Edit canvas' : 'Preview Form'"
            :icon="showFormPreview ? 'pi pi-pencil' : 'pi pi-eye'"
            :severity="showFormPreview ? 'primary' : 'secondary'"
            size="small"
            :outlined="!showFormPreview"
            @click="toggleFormPreview"
            :pt="{ root: { id: generateUniqueId('preview-form-btn') } }"
          />
          <Button
            v-if="!showFormPreview"
            label="Clear canvas"
            icon="pi pi-trash"
            severity="secondary"
            size="small"
            :disabled="!hasCanvasComponents"
            @click="requestClearCanvas"
            :pt="{ root: { id: generateUniqueId('clear-canvas-btn') } }"
          />
        </div>
      </div>
    </template>

    <template #content>
      <div class="canvas-container">
        <FormLayoutPreview
          v-if="showFormPreview"
          :components="props.schema?.components"
          :columns="gridColumns"
          :form-actions="props.schema?.formActions"
          :validation-rules="props.schema?.validationRules"
          :preview-edit-mode="props.formActionsPreviewEditMode"
        />
        <GridCanvas
          v-else
          :components="props.schema?.components"
          :grid-columns="gridColumns"
          :selected-field-key="props.selectedFieldKey"
          @drop="handleGridDrop"
          @remove="handleRemove"
          @select="handleSelect"
          :pt="{ root: { id: generateUniqueId('grid-canvas') } }"
        />

        <SpanConfigDialog
          v-model:visible="showSpanConfigDialog"
          :component="pendingComponent"
          :components="props.schema?.components"
          :grid-columns="gridColumns"
          @config="handleSpanConfig"
          @cancel="handleSpanCancel"
        />

        <LayoutConfigDialog
          v-model:visible="showLayoutConfigDialog"
          :component="pendingLayoutComponent"
          @config="handleLayoutConfig"
          @cancel="handleLayoutCancel"
        />

        <Dialog
          v-model:visible="clearCanvasConfirmVisible"
          modal
          header="Clear canvas"
          :style="{ width: '28rem' }"
          :pt="{ root: { id: generateUniqueId('clear-canvas-dialog') } }"
        >
          <p>Remove all controls from the design canvas? This cannot be undone until you save the form.</p>
          <div class="flex justify-end gap-2 mt-4">
            <Button
              label="Cancel"
              severity="secondary"
              @click="clearCanvasConfirmVisible = false"
              :pt="{ root: { id: generateUniqueId('clear-canvas-cancel-btn') } }"
            />
            <Button
              label="Clear all"
              severity="danger"
              @click="confirmClearCanvas"
              :pt="{ root: { id: generateUniqueId('clear-canvas-confirm-btn') } }"
            />
          </div>
        </Dialog>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.design-canvas {
  flex-shrink: 0;
}

.design-canvas :deep(.p-card-title) {
  width: 100%;
}

.canvas-container {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.canvas-title-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.canvas-title-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.canvas-columns-picker {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.canvas-columns-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--p-text-muted-color, #94a3b8);
  white-space: nowrap;
}
</style>
