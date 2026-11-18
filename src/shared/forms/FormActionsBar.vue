<script setup lang="ts">
import { computed } from 'vue';
import {
  buildFormActionsBarClasses,
  buildFormPrimaryButtonClasses,
  buildFormSecondaryButtonClasses,
  normalizeFormActionsConfig,
  resolvePrimaryActionLabel,
  type FormActionsConfig,
} from './form-actions-config';

const props = withDefaults(
  defineProps<{
    config?: FormActionsConfig | null;
    /** When true, primary button uses updateLabel */
    isEditMode?: boolean;
    /** Preview/designer: buttons do not submit */
    previewMode?: boolean;
    disabled?: boolean;
    primaryId?: string;
    cancelId?: string;
  }>(),
  {
    config: null,
    isEditMode: false,
    previewMode: false,
    disabled: false,
    primaryId: undefined,
    cancelId: undefined,
  },
);

const emit = defineEmits<{
  (e: 'primary'): void;
  (e: 'cancel'): void;
}>();

const normalized = computed(() => normalizeFormActionsConfig(props.config));

const barClass = computed(() => buildFormActionsBarClasses(normalized.value));
const primaryClass = computed(() => buildFormPrimaryButtonClasses(normalized.value));
const secondaryClass = computed(() => buildFormSecondaryButtonClasses(normalized.value));
const primaryLabel = computed(() =>
  resolvePrimaryActionLabel(normalized.value, props.isEditMode),
);

const showPrimary = computed(() => normalized.value.showSave !== false);
const showCancel = computed(() => normalized.value.showCancel !== false);

function onPrimaryClick(): void {
  if (props.previewMode || props.disabled) {
    return;
  }
  emit('primary');
}

function onCancelClick(): void {
  if (props.previewMode || props.disabled) {
    return;
  }
  emit('cancel');
}
</script>

<template>
  <div
    v-if="showPrimary || showCancel"
    class="form-actions-bar"
    :class="barClass"
    data-form-actions-bar="true"
  >
    <button
      v-if="showPrimary"
      type="button"
      :id="primaryId"
      class="form-actions-primary"
      :class="primaryClass"
      :disabled="disabled"
      :aria-disabled="previewMode ? 'true' : undefined"
      @click="onPrimaryClick"
    >
      {{ primaryLabel }}
    </button>
    <button
      v-if="showCancel"
      type="button"
      :id="cancelId"
      class="form-actions-cancel"
      :class="secondaryClass"
      :disabled="disabled"
      :aria-disabled="previewMode ? 'true' : undefined"
      @click="onCancelClick"
    >
      {{ normalized.cancelLabel }}
    </button>
  </div>
</template>
