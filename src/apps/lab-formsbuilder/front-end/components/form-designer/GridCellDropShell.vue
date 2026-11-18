<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { makeDroppable } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
import type { FormComponent } from '../../../shared/types';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  dropList: () => FormComponent[];
  onDrop: (event: IDragEvent) => void;
}>();

const dropEl = useTemplateRef<HTMLElement>('dropEl');

makeDroppable(
  dropEl,
  {
    events: {
      onDrop: (event) => props.onDrop(event),
    },
  },
  () => props.dropList(),
);
</script>

<template>
  <div ref="dropEl" v-bind="$attrs">
    <slot />
  </div>
</template>
