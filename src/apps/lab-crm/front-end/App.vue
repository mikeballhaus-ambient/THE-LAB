<script setup lang="ts">
import CrmAppLayout from './components/CrmAppLayout.vue';

interface Props {
  serverUrl?: string;
  /** Registry description from THE-LAB mount (optional). */
  appDescription?: string;
}

defineProps<Props>();
</script>

<template>
  <CrmAppLayout :server-url="serverUrl" />
</template>
