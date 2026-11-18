<script setup lang="ts">
import { Panel } from '@vue-flow/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const emit = defineEmits<{
  arrange: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const arrangeButtonId = generateUniqueId('lab-workflow-graph-arrange');
</script>

<template>
  <Panel position="top-left" class="lab-workflow-graph-arrange-panel">
    <button
      :id="arrangeButtonId"
      type="button"
      class="lab-workflow-graph-arrange-btn"
      title="Auto-arrange canvas"
      @click="emit('arrange')"
    >
      <i class="pi pi-sitemap" aria-hidden="true" />
      <span>Auto-arrange</span>
    </button>
  </Panel>
</template>
