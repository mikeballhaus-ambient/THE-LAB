<script setup lang="ts">
import { computed } from 'vue';
import DatePicker from 'primevue/datepicker';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { useFormFieldModel } from '@/shared/forms/useFormFieldModel';
import { parseDateFieldValue } from '@/shared/forms/form-submit-payload';

import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import { formDatePickerPt } from '@/shared/forms/form-control-pt';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const storeModel = useFormFieldModel<Date | Date[] | (Date | null)[] | null | undefined>(props.field);
const readOnly = useFormFieldReadOnly();

const showIcon = computed(() => props.field.showIcon !== false);
const showTime = computed(() => {
  if (props.field.dateOnly === true) {
    return false;
  }
  return props.field.showTime !== false;
});
const hourFormat = computed(() => props.field.hourFormat ?? '12');

/** PrimeVue dateFormat is date-only; time is rendered separately when showTime is enabled (see PrimeVue DatePicker docs). */
const dateFormat = computed(() => {
  if (props.field.dateFormat?.trim()) {
    return props.field.dateFormat.trim();
  }
  return 'mm/dd/yy';
});

function normalizePickerValue(raw: unknown): Date | null {
  if (raw == null || raw === '') {
    return null;
  }
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  const parsed = parseDateFieldValue(raw);
  return parsed ?? null;
}

/** Always bind a Date (or null) — PrimeVue treats string modelValue as "today" for the time spinners. */
const pickerModel = computed({
  get: (): Date | null => normalizePickerValue(storeModel.value),
  set: (value: Date | Date[] | (Date | null)[] | null | undefined) => {
    if (value == null || (Array.isArray(value) && value.length === 0)) {
      storeModel.value = null as typeof storeModel.value;
      return;
    }
    const single = Array.isArray(value) ? value[0] : value;
    if (single instanceof Date && !Number.isNaN(single.getTime())) {
      storeModel.value = single as typeof storeModel.value;
      return;
    }
    const parsed = normalizePickerValue(single);
    storeModel.value = (parsed ?? null) as typeof storeModel.value;
  },
});

/**
 * PrimeVue runs updateCurrentMetaData before rawValue on mount, so time spinners stick at "now"
 * until modelValue changes. Re-assign the same instant when the overlay opens to sync spinners.
 */
async function onPickerShow(): Promise<void> {
  const current = pickerModel.value;
  if (!current) {
    return;
  }
  storeModel.value = new Date(current.getTime()) as typeof storeModel.value;
}
</script>

<template>
  <FormFieldShell :source="field">
    <DatePicker
      v-model="pickerModel"
      append-to="body"
      :disabled="readOnly"
      :show-icon="showIcon"
      icon-display="input"
      :date-format="dateFormat"
      :show-time="showTime"
      :show-seconds="false"
      :hour-format="hourFormat"
      class="w-full"
      :pt="formDatePickerPt"
      @show="onPickerShow"
    />
  </FormFieldShell>
</template>
