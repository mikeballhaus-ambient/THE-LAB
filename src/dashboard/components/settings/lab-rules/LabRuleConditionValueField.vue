<script setup lang="ts">
import { computed } from 'vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import type { LabDomainEventPayloadFieldKind } from '@/shared/types/lab-domain-event-catalog';
import {
  formInputNumberPt,
  formInputTextPt,
  formSelectPt,
  withFormControlRootId,
} from '@/shared/forms/form-control-pt';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { LAB_RULE_CONDITION_VALUE_ME } from '@/shared/constants/lab-rule-condition-me';
import type { LabRuleScope } from '@/shared/types/lab-rule';

export type LabUserOption = { label: string; value: string };

const props = defineProps<{
  valueKind: LabDomainEventPayloadFieldKind;
  modelValue: string | number | boolean | undefined;
  labUserOptions: LabUserOption[];
  enumOptions?: LabUserOption[];
  usersLoading?: boolean;
  fieldIndex: number;
  /** Drives the @me option label (user owner vs event field user). */
  ruleScope?: LabRuleScope;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean];
}>();

const { generateUniqueId } = useUniqueElementId();

const booleanOptions = [
  { label: 'True', value: 'true' },
  { label: 'False', value: 'false' },
];

const selectPt = computed(() =>
  withFormControlRootId(formSelectPt, generateUniqueId(`rule-cond-value-${props.fieldIndex}`)),
);
const textPt = computed(() =>
  withFormControlRootId(formInputTextPt, generateUniqueId(`rule-cond-value-${props.fieldIndex}`)),
);
const numberPt = computed(() =>
  withFormControlRootId(formInputNumberPt, generateUniqueId(`rule-cond-value-${props.fieldIndex}`)),
);

const userIdSelectOptions = computed(() => {
  const meLabel =
    props.ruleScope === 'global'
      ? 'User on this event (@me)'
      : 'Me — rule owner (@me)';
  const meOption: LabUserOption = { label: meLabel, value: LAB_RULE_CONDITION_VALUE_ME };
  const seen = new Set(props.labUserOptions.map((o) => o.value));
  if (seen.has(LAB_RULE_CONDITION_VALUE_ME)) {
    return props.labUserOptions;
  }
  return [meOption, ...props.labUserOptions];
});

function numberModel(value: string | number | boolean | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
</script>

<template>
  <Select
    v-if="valueKind === 'userId'"
    :model-value="modelValue != null && modelValue !== '' ? String(modelValue) : null"
    :options="userIdSelectOptions"
    option-label="label"
    option-value="value"
    class="min-w-[12rem] flex-1"
    :placeholder="usersLoading ? 'Loading lab users…' : 'Select lab user'"
    filter
    :loading="usersLoading"
    :disabled="usersLoading"
    :pt="selectPt"
    @update:model-value="(v) => v != null && emit('update:modelValue', String(v))"
  />
  <Select
    v-else-if="valueKind === 'boolean'"
    :model-value="modelValue === true || modelValue === 'true' ? 'true' : 'false'"
    :options="booleanOptions"
    option-label="label"
    option-value="value"
    class="min-w-[8rem]"
    :pt="selectPt"
    @update:model-value="(v) => emit('update:modelValue', v === 'true')"
  />
  <InputNumber
    v-else-if="valueKind === 'number'"
    :model-value="numberModel(modelValue)"
    class="min-w-[8rem]"
    :pt="numberPt"
    @update:model-value="(v) => emit('update:modelValue', v ?? 0)"
  />
  <Select
    v-else-if="enumOptions?.length"
    :model-value="modelValue != null && modelValue !== '' ? String(modelValue) : null"
    :options="enumOptions"
    option-label="label"
    option-value="value"
    class="min-w-[10rem] flex-1"
    placeholder="Select value"
    :pt="selectPt"
    @update:model-value="(v) => v != null && emit('update:modelValue', v)"
  />
  <InputText
    v-else
    :model-value="String(modelValue ?? '')"
    placeholder="Value"
    class="min-w-[10rem] flex-1"
    :pt="textPt"
    @update:model-value="(v) => emit('update:modelValue', v ?? '')"
  />
</template>
