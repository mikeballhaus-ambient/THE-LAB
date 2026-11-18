<script setup lang="ts">
import { computed } from 'vue';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import { buildLabelTailwindClasses } from '@/shared/forms/label-display-style';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const classNames = computed(() => buildLabelTailwindClasses(props.field.labelDisplay));
</script>

<template>
  <p class="m-0 w-full break-words" :class="classNames">
    {{ field.label || 'Label text' }}
  </p>
</template>
