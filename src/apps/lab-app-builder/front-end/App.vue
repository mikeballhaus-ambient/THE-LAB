<script setup lang="ts">
import LabAppBuilderWizard from '@/apps/lab-app-builder/front-end/components/LabAppBuilderWizard.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import '@/assets/styles/platform-catalog-app.css';

defineProps<{
  serverUrl?: string;
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div
    :id="generateUniqueId('lab-app-builder-root')"
    class="lab-app-builder-app lab-platform-catalog-app app-loaded-container text-lab-general-text flex flex-col gap-4 min-h-0 h-full overflow-auto lab-app-body"
  >
    <LabAppBuilderWizard />
  </div>
</template>
