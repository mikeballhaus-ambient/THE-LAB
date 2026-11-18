<script setup lang="ts">
import { computed, inject, type Ref } from 'vue';
import { getFormFieldShellClasses, type FormFieldLayoutSource } from './form-field-layout';
import {
  FORM_INVALID_FIELD_KEYS_KEY,
  isFieldRequired,
  type FieldValidationRulesMap,
} from './form-field-validation';
import { useFormFieldReadOnly } from './form-runtime-readonly';

const props = defineProps<{
  source: FormFieldLayoutSource & {
    fieldKey?: string;
    label?: string;
    required?: boolean;
    validation?: FieldValidationRulesMap;
  };
  hideLabel?: boolean;
  /** When set, overrides injected preview/runtime invalid state. */
  invalid?: boolean;
}>();

const injectedInvalidKeys = inject<Ref<Set<string>> | null>(FORM_INVALID_FIELD_KEYS_KEY, null);

const classes = computed(() => getFormFieldShellClasses(props.source));

const showRequiredMarker = computed(() => isFieldRequired(props.source));

const isInvalid = computed(() => {
  if (props.invalid === true) {
    return true;
  }
  if (props.invalid === false) {
    return false;
  }
  const key = props.source.fieldKey;
  if (!key || !injectedInvalidKeys?.value) {
    return false;
  }
  return injectedInvalidKeys.value.has(key);
});

const readOnly = useFormFieldReadOnly();
</script>

<template>
  <div :class="[classes.root, isInvalid && 'fb-field--invalid', readOnly && 'fb-field--readonly']">
    <div v-if="!hideLabel && source.label" :class="classes.label">
      {{ source.label }}<span v-if="showRequiredMarker" class="ms-0.5" aria-hidden="true">*</span>
    </div>
    <div :class="[classes.control, isInvalid && 'fb-field__control--invalid']">
      <slot />
    </div>
  </div>
</template>
