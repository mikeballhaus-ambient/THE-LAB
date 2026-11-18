<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import {
  TAILWIND_COLOR_PALETTES,
  TAILWIND_COLOR_STEPS,
  type TailwindColorPalette,
  type TailwindColorPrefix,
  type TailwindColorStep,
} from '@/shared/theme/tailwind-color-catalog';
import {
  findNearestCatalogSelection,
  formatTailwindUtilityClass,
  resolveTailwindColorUtility,
} from '@/shared/theme/tailwind-color-resolve';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  modelValue: string;
  twPrefix: TailwindColorPrefix;
  inputId?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { generateUniqueId } = useUniqueElementId();

const palette = ref<TailwindColorPalette>('slate');
const step = ref<TailwindColorStep>(600);
const opacityPercent = ref(100);
const customMode = ref(false);
const customValue = ref('');
/** True when picker shows nearest swatch but stored token is not an exact catalog match. */
const approximateMatch = ref(false);

const paletteOptions = TAILWIND_COLOR_PALETTES.map((p) => ({ label: p, value: p }));
const stepOptions = TAILWIND_COLOR_STEPS.map((s) => ({ label: String(s), value: s }));
const opacityOptions = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5].map(
  (v) => ({ label: v === 100 ? '100%' : `${v}%`, value: v }),
);

function syncFromModel(value: string) {
  const parsed = findNearestCatalogSelection(value);
  if (!parsed) {
    customMode.value = true;
    customValue.value = value;
    approximateMatch.value = false;
    return;
  }
  customMode.value = false;
  approximateMatch.value = !parsed.exact;
  palette.value = parsed.palette;
  step.value = parsed.step;
  opacityPercent.value = parsed.opacityPercent;
}

watch(
  () => props.modelValue,
  (v) => syncFromModel(v),
  { immediate: true },
);

const classHint = computed(() => {
  if (customMode.value) {
    return 'Custom value';
  }
  return formatTailwindUtilityClass(props.twPrefix, palette.value, step.value, opacityPercent.value);
});

function emitResolved() {
  if (customMode.value) {
    emit('update:modelValue', customValue.value);
    return;
  }
  emit(
    'update:modelValue',
    resolveTailwindColorUtility(props.twPrefix, palette.value, step.value, opacityPercent.value),
  );
}

function onPickerChange() {
  customMode.value = false;
  approximateMatch.value = false;
  emitResolved();
}

const paletteSelectId = computed(() => props.inputId ?? generateUniqueId('theme-tw-palette'));
const stepSelectId = generateUniqueId('theme-tw-step');
const opacitySelectId = generateUniqueId('theme-tw-opacity');
</script>

<template>
  <div class="flex flex-col gap-1">
    <span class="text-[10px] font-mono text-lab-general-text-muted">{{ classHint }}</span>
    <span
      v-if="approximateMatch && !customMode"
      class="text-[10px] text-lab-general-text-muted"
    >
      Nearest Tailwind match — change a control to apply, or use custom CSS for the exact saved value.
    </span>
    <template v-if="!customMode">
      <div class="grid grid-cols-3 gap-2">
        <Select
          :input-id="paletteSelectId"
          v-model="palette"
          :options="paletteOptions"
          option-label="label"
          option-value="value"
          size="small"
          :pt="{ root: { attrs: { id: paletteSelectId } } }"
          @update:model-value="onPickerChange"
        />
        <Select
          :input-id="stepSelectId"
          v-model="step"
          :options="stepOptions"
          option-label="label"
          option-value="value"
          size="small"
          :pt="{ root: { attrs: { id: stepSelectId } } }"
          @update:model-value="onPickerChange"
        />
        <Select
          :input-id="opacitySelectId"
          v-model="opacityPercent"
          :options="opacityOptions"
          option-label="label"
          option-value="value"
          size="small"
          :pt="{ root: { attrs: { id: opacitySelectId } } }"
          @update:model-value="onPickerChange"
        />
      </div>
      <button
        type="button"
        class="text-[10px] text-left text-lab-button-outlined-text hover:underline w-fit"
        :id="generateUniqueId('theme-tw-custom-toggle')"
        @click="customMode = true"
      >
        Edit as custom CSS
      </button>
    </template>
    <template v-else>
      <InputText
        v-model="customValue"
        class="text-xs! font-mono!"
        :pt="{ root: { attrs: { id: generateUniqueId('theme-tw-custom-input') } } }"
        @update:model-value="emit('update:modelValue', customValue)"
      />
      <button
        type="button"
        class="text-[10px] text-left text-lab-button-outlined-text hover:underline w-fit"
        :id="generateUniqueId('theme-tw-picker-toggle')"
        @click="
          customMode = false;
          syncFromModel(modelValue);
          onPickerChange();
        "
      >
        Back to Tailwind picker
      </button>
    </template>
  </div>
</template>
