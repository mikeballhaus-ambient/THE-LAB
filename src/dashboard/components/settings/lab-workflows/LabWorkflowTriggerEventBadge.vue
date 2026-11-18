<script setup lang="ts">
import { computed } from 'vue';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import {
  catalogEntryForWorkflowTriggerEventType,
  resolveLabDomainEventLabel,
} from '@/shared/utils/palette-display-text';

const props = defineProps<{
  eventType: string;
  catalogEntries: readonly LabDomainEventCatalogEntry[];
}>();

const label = computed(() => resolveLabDomainEventLabel(props.eventType, props.catalogEntries));

const badgeClass = computed(() => {
  const entry = catalogEntryForWorkflowTriggerEventType(props.eventType, props.catalogEntries);
  const kind = entry?.publisherKind;
  if (kind === 'platform') {
    return 'lab-workflow-trigger-event-badge lab-workflow-trigger-event-badge--platform';
  }
  if (kind === 'catalog-app') {
    return 'lab-workflow-trigger-event-badge lab-workflow-trigger-event-badge--app';
  }
  return 'lab-workflow-trigger-event-badge';
});
</script>

<template>
  <span
    v-if="label"
    :class="badgeClass"
    :title="eventType"
  >
    {{ label }}
  </span>
  <span v-else class="text-lab-general-text-muted">—</span>
</template>
