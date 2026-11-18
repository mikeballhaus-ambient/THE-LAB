<script setup lang="ts">
import { computed, inject } from 'vue';
import type { IDragEvent } from '@vue-dnd-kit/core';
import type { FormComponent } from '../../../shared/types';
import GridCellPlacedContent from './GridCellPlacedContent.vue';
import GridCellDropShell from './GridCellDropShell.vue';
import {
  canPlaceComponent,
  isPaletteDragPayload,
  normalizedCol,
  resolvePlacedComponent,
} from './grid-layout-utils';
import { resolveHorizontalAlign, resolveVerticalAlign, clampFormGridColumns } from '@/shared/forms/form-layout';
import { getComponentBounds } from '../../utils/grid-occupancy';
import { FORM_DESIGN_CONTAINER_DROP_KEY, FORM_DESIGN_TABS_ACTIVE_TAB_KEY } from './design-container-context';
import { isContainerType } from '../../utils/container-types';
import { resolveTabIndexFromPointer } from '../../utils/container-tab-drop';

const props = defineProps<{
  row: number;
  col: number;
  component?: FormComponent;
  shouldRender?: boolean;
  allComponents?: FormComponent[];
  gridColumns?: number;
  selectedFieldKey?: string | null;
}>();

const emit = defineEmits<{
  (e: 'drop', payload: { row: number; col: number; component: FormComponent }): void;
  (e: 'select', component: FormComponent): void;
  (e: 'remove', component: FormComponent): void;
}>();

const onContainerDrop = inject(FORM_DESIGN_CONTAINER_DROP_KEY, null);
const tabsActiveTabByFieldKey = inject(FORM_DESIGN_TABS_ACTIVE_TAB_KEY, null);

const gridCols = computed(() => clampFormGridColumns(props.gridColumns));

function gridCellDropList(): FormComponent[] {
  return props.component ? [props.component] : [];
}

const isSelected = computed(
  () =>
    Boolean(props.component?.fieldKey)
    && props.selectedFieldKey != null
    && props.component!.fieldKey === props.selectedFieldKey,
);

const cellSizeStyle = computed(() => {
  const rowPx = 108;
  const cols = gridCols.value;
  if (!props.component) {
    return {
      minHeight: `${rowPx}px`,
      flex: '1 1 0%',
      minWidth: '0',
      maxWidth: `${(1 / cols) * 100}%`,
    };
  }
  const { rowSpan, colSpan } = getComponentBounds(props.component);
  return {
    minHeight: `${rowSpan * rowPx}px`,
    flex: `${colSpan} 1 0%`,
    minWidth: '0',
    maxWidth: `${(colSpan / cols) * 100}%`,
  };
});

const getHAlignment = computed(() => {
  if (!props.component) {
    return 'justify-start';
  }
  switch (resolveHorizontalAlign(props.component)) {
    case 'left':
      return 'justify-start';
    case 'center':
      return 'justify-center';
    case 'right':
      return 'justify-end';
    default:
      return 'justify-start';
  }
});

const getVAlignment = computed(() => {
  if (!props.component) {
    return 'items-center';
  }
  switch (resolveVerticalAlign(props.component)) {
    case 'top':
      return 'items-start';
    case 'middle':
      return 'items-center';
    case 'bottom':
      return 'items-end';
    default:
      return 'items-center';
  }
});

function tryForwardDropToGroupContainer(
  event: IDragEvent,
  draggedComponent: FormComponent,
): boolean {
  const host = props.component;
  if (!host || host.type !== 'Group' || !onContainerDrop) {
    return false;
  }

  if (isPaletteDragPayload(draggedComponent)) {
    if (isContainerType(draggedComponent.type)) {
      return true;
    }
    onContainerDrop({ containerFieldKey: host.fieldKey, component: draggedComponent });
    return true;
  }

  const placed = resolvePlacedComponent(draggedComponent, props.allComponents);
  if (!placed || isContainerType(placed.type) || placed.fieldKey === host.fieldKey) {
    return true;
  }
  if (placed.parentContainerKey === host.fieldKey) {
    return true;
  }

  let toMove = placed;
  const removed = event.helpers.suggestRemove();
  if (removed?.removedItems.length) {
    toMove =
      resolvePlacedComponent(removed.removedItems[0] as FormComponent, props.allComponents)
      ?? placed;
  }
  onContainerDrop({ containerFieldKey: host.fieldKey, component: toMove });
  return true;
}

type DragEventWithPointer = IDragEvent & {
  pointer?: { current?: { x: number; y: number }; start?: { x: number; y: number } };
};

function resolveTabsDropTabIndex(containerFieldKey: string, event?: DragEventWithPointer): number {
  const fromRegistry = tabsActiveTabByFieldKey?.value.get(containerFieldKey) ?? 0;
  const pointer = event?.pointer?.current ?? event?.pointer?.start;
  if (!pointer) {
    return fromRegistry;
  }
  return resolveTabIndexFromPointer(containerFieldKey, pointer.x, pointer.y, fromRegistry);
}

function tryForwardDropToTabsContainer(
  event: IDragEvent,
  draggedComponent: FormComponent,
): boolean {
  const host = props.component;
  if (!host || host.type !== 'Tabs' || !onContainerDrop) {
    return false;
  }

  const tabIndex = resolveTabsDropTabIndex(host.fieldKey, event);

  if (isPaletteDragPayload(draggedComponent)) {
    if (isContainerType(draggedComponent.type)) {
      return true;
    }
    onContainerDrop({ containerFieldKey: host.fieldKey, tabIndex, component: draggedComponent });
    return true;
  }

  const placed = resolvePlacedComponent(draggedComponent, props.allComponents);
  if (!placed || isContainerType(placed.type) || placed.fieldKey === host.fieldKey) {
    return true;
  }

  let toMove = placed;
  const removed = event.helpers.suggestRemove();
  if (removed?.removedItems.length) {
    toMove =
      resolvePlacedComponent(removed.removedItems[0] as FormComponent, props.allComponents)
      ?? placed;
  }

  onContainerDrop({ containerFieldKey: host.fieldKey, tabIndex, component: toMove });
  return true;
}

function handleGridCellDrop(event: IDragEvent): void {
  const draggedComponent = event.draggedItems[0]?.data as FormComponent | undefined;
  if (!draggedComponent) {
    return;
  }

  if (tryForwardDropToGroupContainer(event, draggedComponent)) {
    return;
  }

  if (tryForwardDropToTabsContainer(event, draggedComponent)) {
    return;
  }

  if (isPaletteDragPayload(draggedComponent)) {
    if (props.component) {
      return;
    }
    emit('drop', { row: props.row, col: props.col, component: draggedComponent });
    return;
  }

  const placed = resolvePlacedComponent(draggedComponent, props.allComponents);
  if (placed) {
    const fromRow = placed.row ?? 0;
    const fromCol = normalizedCol(placed.col);
    if (fromRow === props.row && fromCol === props.col) {
      return;
    }

    const all = props.allComponents ?? [];
    if (!canPlaceComponent(placed, props.row, props.col, all, placed, gridCols.value)) {
      return;
    }

    const removed = event.helpers.suggestRemove();
    if (!removed?.removedItems.length) {
      return;
    }
    const moved =
      resolvePlacedComponent(removed.removedItems[0] as FormComponent, all)
      ?? placed;
    emit('drop', { row: props.row, col: props.col, component: moved });
    return;
  }

  if (props.component) {
    return;
  }

  emit('drop', { row: props.row, col: props.col, component: draggedComponent });
}

const cellRootBind = computed(() => ({
  class: [
    'min-h-[100px] flex transition-all bg-lab-general-bg-muted border border-lab-general-border rounded-lg p-2 min-w-0',
    { hidden: !props.shouldRender },
    { 'ring-2 ring-lab-accent ring-offset-2 ring-offset-lab-general-bg': isSelected.value },
    getHAlignment.value,
    getVAlignment.value,
  ],
  style: cellSizeStyle.value,
  'data-row': props.row,
  'data-col': props.col,
}));
</script>

<template>
  <GridCellDropShell
    v-bind="cellRootBind"
    :drop-list="gridCellDropList"
    :on-drop="handleGridCellDrop"
  >
    <GridCellPlacedContent
      v-if="props.component"
      :component="props.component"
      :all-components="allComponents"
      :row="row"
      :col="col"
      @select="emit('select', $event)"
      @remove="emit('remove', $event)"
    />
    <div v-else class="flex items-center justify-center w-full h-full min-h-[84px] pointer-events-none">
      <div class="select-none text-lab-general-text-muted text-xs">Drop components here</div>
    </div>
  </GridCellDropShell>
</template>
