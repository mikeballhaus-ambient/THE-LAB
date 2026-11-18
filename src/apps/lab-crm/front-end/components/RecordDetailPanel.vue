<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { EntityDefinition, LookupLabelsByField } from '../../shared/types/entity.types';
import { formatCellValueForDefinition } from '../../shared/utils/record-list-display';

const props = defineProps<{
  definition: EntityDefinition | null;
  record: Record<string, unknown>;
  lookupLabels?: LookupLabelsByField;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { generateUniqueId } = useUniqueElementId();

const rows = computed(() => {
  const propsList = props.definition?.properties ?? [];
  return propsList.map((p) => ({
    label: p.label || p.name,
    value: formatCellValueForDefinition(props.record, p.name, props.definition, props.lookupLabels),
  }));
});

const sectionTitle = computed(() => {
  const name = props.definition?.name?.trim();
  return name ? `${name} details` : 'Record details';
});

const sectionLead = computed(() => {
  const nameProp = props.definition?.properties?.find((p) => p.name === 'name');
  if (!nameProp) {
    return 'Read-only snapshot of this record.';
  }
  const value = formatCellValueForDefinition(
    props.record,
    'name',
    props.definition,
    props.lookupLabels,
  );
  if (value == null || String(value).trim() === '' || String(value) === '—') {
    return 'Read-only snapshot of this record.';
  }
  return String(value);
});
</script>

<template>
  <section
    class="lab-form-section crm-record-detail-panel mb-0 min-w-0"
    :id="generateUniqueId('crm-record-detail-section')"
  >
    <h4
      class="lab-form-section__title m-0"
      :id="generateUniqueId('crm-record-detail-title')"
    >
      <span class="lab-form-section__icon" aria-hidden="true">
        <i class="pi pi-id-card" />
      </span>
      {{ sectionTitle }}
    </h4>
    <p class="lab-form-section__lead">{{ sectionLead }}</p>

    <dl
      class="crm-record-detail-fields m-0 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
      :id="generateUniqueId('crm-record-detail-fields')"
    >
      <div
        v-for="(row, index) in rows"
        :key="row.label"
        class="crm-record-detail-field min-w-0"
      >
        <dt class="m-0 text-xs font-medium text-lab-general-text-muted">{{ row.label }}</dt>
        <dd
          class="m-0 mt-0.5 text-sm text-lab-general-text break-words"
          :id="generateUniqueId(`crm-record-detail-val-${index}`)"
        >
          {{ row.value }}
        </dd>
      </div>
    </dl>

    <div class="flex justify-end pt-2">
      <Button
        label="Close"
        size="small"
        severity="secondary"
        outlined
        :pt="{ root: { attrs: { id: generateUniqueId('crm-record-detail-close') } } }"
        @click="emit('close')"
      />
    </div>
  </section>
</template>
