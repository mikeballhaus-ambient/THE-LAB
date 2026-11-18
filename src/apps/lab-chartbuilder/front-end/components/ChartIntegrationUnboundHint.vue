<script setup lang="ts">
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

defineProps<{
  slotId: string;
  label: string;
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div
    class="lab-app-panel border border-dashed border-lab-general-border text-sm text-lab-general-text-muted"
    :id="generateUniqueId(`cb-unbound-${slotId}`)"
  >
    <p class="font-medium text-lab-general-text m-0">{{ label }}</p>
    <p class="m-0 mt-2">
      No Forms Builder binding for slot
      <code class="text-xs text-lab-general-text">{{ slotId }}</code>.
      Use Lab Assistant (<code class="text-xs">lab_integrations_get_manifest</code>,
      stubs, <code class="text-xs">lab_integrations_upsert_binding</code>) for host
      <code class="text-xs">app-lab-chartbuilder</code>.
    </p>
  </div>
</template>
