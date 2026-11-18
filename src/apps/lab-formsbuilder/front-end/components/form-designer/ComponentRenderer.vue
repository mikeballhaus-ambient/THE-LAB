<script setup lang="ts">
import { computed } from 'vue';
import FormField from '@/shared/forms/FormField.vue';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import type { FormComponent } from '../../../shared/types';
import DesignerGroupContainer from './DesignerGroupContainer.vue';
import DesignerTabsContainer from './DesignerTabsContainer.vue';

const props = defineProps<{
  component: FormComponent | undefined;
}>();

const runtimeField = computed(() => props.component as IFormRuntimeField | undefined);
</script>

<template>
  <div
    v-if="component?.hidden"
    class="w-full rounded border border-dashed border-lab-general-border bg-lab-general-bg-muted/60 px-3 py-2 text-xs text-lab-general-text-muted"
  >
    <span class="font-semibold text-lab-general-text">Hidden</span>
    · {{ component.modelProperty || component.fieldKey }}
  </div>
  <DesignerGroupContainer v-else-if="component?.type === 'Group'" :component="component" />
  <DesignerTabsContainer v-else-if="component?.type === 'Tabs'" :component="component" />
  <FormField
    v-else-if="runtimeField"
    class="design-canvas-form-field text-xs"
    :field="runtimeField"
  />
</template>

<style scoped>
.design-canvas-form-field :deep(.p-inputtext),
.design-canvas-form-field :deep(.p-textarea),
.design-canvas-form-field :deep(.p-select-label),
.design-canvas-form-field :deep(.p-inputnumber-input) {
  font-size: 0.75rem;
  line-height: 1rem;
}
</style>
