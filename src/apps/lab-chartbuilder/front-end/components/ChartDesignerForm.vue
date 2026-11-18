<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Slider from 'primevue/slider';
import {
  CHART_SIZE_DEFAULT,
  CHART_SIZE_MAX,
  CHART_SIZE_MIN,
  resolveChartSizePercent,
  type ChartLegendPosition,
  type ChartSchema,
  type ChartType,
} from '@/shared/charts';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  modelValue: ChartSchema;
  isNew: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ChartSchema];
  'layout-adjusting': [active: boolean];
}>();

const sizeSliderActive = ref(false);

function endSizeSliderAdjust(): void {
  if (!sizeSliderActive.value) {
    return;
  }
  sizeSliderActive.value = false;
  emit('layout-adjusting', false);
  window.removeEventListener('pointerup', endSizeSliderAdjust);
  window.removeEventListener('pointercancel', endSizeSliderAdjust);
}

function beginSizeSliderAdjust(): void {
  if (sizeSliderActive.value) {
    return;
  }
  sizeSliderActive.value = true;
  emit('layout-adjusting', true);
  window.addEventListener('pointerup', endSizeSliderAdjust);
  window.addEventListener('pointercancel', endSizeSliderAdjust);
}

onUnmounted(() => {
  endSizeSliderAdjust();
});

const { generateUniqueId } = useUniqueElementId();

const chartTypeOptions: { label: string; value: ChartType }[] = [
  { label: 'Bar', value: 'bar' },
  { label: 'Line', value: 'line' },
  { label: 'Pie', value: 'pie' },
  { label: 'Doughnut', value: 'doughnut' },
  { label: 'Funnel', value: 'funnel' },
];

const legendPositionOptions: { label: string; value: ChartLegendPosition }[] = [
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
];

const draft = computed({
  get: () => props.modelValue,
  set: (value: ChartSchema) => emit('update:modelValue', value),
});

const chartSizePercent = computed(() => resolveChartSizePercent(draft.value.layout));

function patch(partial: Partial<ChartSchema>): void {
  draft.value = { ...draft.value, ...partial };
}

function patchOptions(partial: ChartSchema['options']): void {
  draft.value = {
    ...draft.value,
    options: { ...draft.value.options, ...partial },
  };
}

function patchLayout(partial: NonNullable<ChartSchema['layout']>): void {
  const layout = { ...draft.value.layout, ...partial };
  if (partial.size != null) {
    delete layout.minHeight;
  }
  draft.value = {
    ...draft.value,
    layout,
  };
}
</script>

<template>
  <div class="chart-designer-form flex min-w-0 w-full flex-col gap-4">
    <div class="flex flex-col gap-1">
      <label :id="generateUniqueId('cb-name-label')" :for="generateUniqueId('cb-name')">Name</label>
      <InputText
        :id="generateUniqueId('cb-name')"
        :model-value="draft.name"
        class="w-full"
        @update:model-value="patch({ name: String($event ?? '') })"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label :id="generateUniqueId('cb-key-label')" :for="generateUniqueId('cb-key')">Chart key</label>
      <InputText
        :id="generateUniqueId('cb-key')"
        :model-value="draft.chartKey"
        class="w-full font-mono text-sm"
        :disabled="!isNew"
        @update:model-value="patch({ chartKey: String($event ?? '') })"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label :id="generateUniqueId('cb-desc-label')" :for="generateUniqueId('cb-desc')">Description</label>
      <Textarea
        :id="generateUniqueId('cb-desc')"
        :model-value="draft.description ?? ''"
        class="w-full"
        rows="2"
        auto-resize
        @update:model-value="patch({ description: String($event ?? '') || undefined })"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label :id="generateUniqueId('cb-type-label')" :for="generateUniqueId('cb-type')">Chart type</label>
      <Select
        :input-id="generateUniqueId('cb-type')"
        :options="chartTypeOptions"
        option-label="label"
        option-value="value"
        :model-value="draft.chartType"
        class="w-full"
        @update:model-value="patch({ chartType: $event as ChartType })"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label :id="generateUniqueId('cb-title-label')" :for="generateUniqueId('cb-title')">Chart title</label>
      <InputText
        :id="generateUniqueId('cb-title')"
        :model-value="draft.options.title ?? ''"
        class="w-full"
        @update:model-value="patchOptions({ title: String($event ?? '') || undefined })"
      />
    </div>

    <div class="flex items-center gap-2">
      <Checkbox
        :input-id="generateUniqueId('cb-legend')"
        :model-value="draft.options.legendDisplay ?? true"
        binary
        @update:model-value="patchOptions({ legendDisplay: Boolean($event) })"
      />
      <label :id="generateUniqueId('cb-legend-label')" :for="generateUniqueId('cb-legend')">Show legend</label>
    </div>

    <div v-if="draft.options.legendDisplay !== false" class="flex flex-col gap-1">
      <label :id="generateUniqueId('cb-legend-pos-label')" :for="generateUniqueId('cb-legend-pos')">
        Legend location
      </label>
      <Select
        :input-id="generateUniqueId('cb-legend-pos')"
        :options="legendPositionOptions"
        option-label="label"
        option-value="value"
        :model-value="draft.options.legendPosition ?? 'top'"
        class="w-full"
        @update:model-value="patchOptions({ legendPosition: $event as ChartLegendPosition })"
      />
    </div>

    <div class="flex items-center gap-2">
      <Checkbox
        :input-id="generateUniqueId('cb-data-labels')"
        :model-value="draft.options.showDataLabels === true"
        binary
        @update:model-value="patchOptions({ showDataLabels: Boolean($event) })"
      />
      <label :id="generateUniqueId('cb-data-labels-label')" :for="generateUniqueId('cb-data-labels')">
        Show data values on chart
      </label>
    </div>

    <div
      v-if="draft.chartType === 'bar' || draft.chartType === 'line'"
      class="flex flex-col gap-3"
    >
      <div class="flex items-center gap-2">
        <Checkbox
          :input-id="generateUniqueId('cb-stacked')"
          :model-value="draft.options.stacked ?? false"
          binary
          @update:model-value="patchOptions({ stacked: Boolean($event) })"
        />
        <label :id="generateUniqueId('cb-stacked-label')" :for="generateUniqueId('cb-stacked')">Stacked</label>
      </div>
      <div v-if="draft.chartType === 'bar'" class="flex items-center gap-2">
        <Checkbox
          :input-id="generateUniqueId('cb-horizontal')"
          :model-value="draft.options.indexAxis === 'y'"
          binary
          @update:model-value="patchOptions({ indexAxis: $event ? 'y' : 'x' })"
        />
        <label
          :id="generateUniqueId('cb-horizontal-label')"
          :for="generateUniqueId('cb-horizontal')"
        >
          Horizontal bars
        </label>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
        <label :id="generateUniqueId('cb-size-label')">Chart size</label>
        <span
          :id="generateUniqueId('cb-size-value')"
          class="text-sm tabular-nums text-muted-color"
        >
          {{ chartSizePercent }}%
        </span>
      </div>
      <p class="text-xs text-muted-color">
        Scales width and height in the preview pane; Chart.js keeps the default aspect ratio inside the box.
      </p>
      <div @pointerdown="beginSizeSliderAdjust">
        <Slider
          :pt="{ root: { attrs: { id: generateUniqueId('cb-size-slider') } } }"
          :model-value="chartSizePercent"
          :min="CHART_SIZE_MIN"
          :max="CHART_SIZE_MAX"
          :step="5"
          class="w-full"
          @update:model-value="patchLayout({ size: Number($event) || CHART_SIZE_DEFAULT })"
          @slideend="endSizeSliderAdjust"
        />
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Checkbox
        :input-id="generateUniqueId('cb-active')"
        :model-value="draft.is_active !== false"
        binary
        @update:model-value="patch({ is_active: Boolean($event) })"
      />
      <label :id="generateUniqueId('cb-active-label')" :for="generateUniqueId('cb-active')">
        Active (loadable by hosts)
      </label>
    </div>
  </div>
</template>
