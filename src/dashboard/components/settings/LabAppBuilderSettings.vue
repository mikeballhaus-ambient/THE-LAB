<script setup lang="ts">
import LabAppBuilderWizard from '@/apps/lab-app-builder/front-end/components/LabAppBuilderWizard.vue';

const props = defineProps<{
  onCloseSettings: () => void;
  onFocusAppsWorkspace: () => void;
}>();
</script>

<template>
  <LabAppBuilderWizard
    :on-close-settings="props.onCloseSettings"
    :on-focus-apps-workspace="props.onFocusAppsWorkspace"
  />
</template>
