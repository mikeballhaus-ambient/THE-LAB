<script setup lang="ts">
import { computed, inject, unref } from 'vue';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormField from '@/shared/forms/FormField.vue';
import { FORM_COMPONENTS_KEY } from '@/shared/forms/form-components-context';
import {
  groupContainerChildrenStyle,
  groupContainerWrapperStyle,
  type GroupContainerLayoutStyle,
} from '@/shared/forms/group-container-layout';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const allFields = computed(
  () => unref(inject(FORM_COMPONENTS_KEY, computed(() => []))) ?? [],
);

type FieldWithParent = IFormRuntimeField & {
  parentContainerKey?: string;
  container?: { groupStyle?: GroupContainerLayoutStyle };
};

const children = computed(() =>
  allFields.value.filter(f => (f as FieldWithParent).parentContainerKey === props.field.fieldKey),
);

const groupStyle = computed(
  () => (props.field as FieldWithParent).container?.groupStyle,
);

const wrapperStyle = computed(() => groupContainerWrapperStyle(groupStyle.value));

const childrenLayoutStyle = computed(() => groupContainerChildrenStyle(groupStyle.value));
</script>

<template>
  <div class="w-full box-border" :style="wrapperStyle">
    <div v-if="field.label" class="lab-form-group-title mb-1">{{ field.label }}</div>
    <div class="w-full box-border" :style="childrenLayoutStyle">
      <FormField v-for="child in children" :key="child.fieldKey" :field="child" />
    </div>
  </div>
</template>
