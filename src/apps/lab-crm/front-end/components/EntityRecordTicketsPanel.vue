<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { Ticket } from '@/apps/lab-helpdesk/shared/types/ticket.types';
import { parseHelpDeskCrmMetadata } from '@/apps/lab-helpdesk/shared/types/help-desk-crm-metadata';
import { useCrmHelpDeskApi } from '../composables/useCrmHelpDeskApi';
import type { CrmRecordIntegrationContext } from '../composables/useCrmIntegrations';

const props = defineProps<{
  helpDeskServerUrl: string;
  entityKey: string;
  recordId: number;
  recordLabel?: string;
  actionsDisabled?: boolean;
  /** Render inside {@link CrmEntityRecordRelatedPanels}. */
  grouped?: boolean;
  /** When grouped, add divider above tickets (another related panel is above). */
  groupedAfterSibling?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-create', payload: CrmRecordIntegrationContext): void;
  (e: 'open-edit', ticketId: number): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const api = computed(() => useCrmHelpDeskApi(props.helpDeskServerUrl));

const loading = ref(false);
const loadError = ref<string | null>(null);
const tickets = ref<Ticket[]>([]);

async function refresh(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    tickets.value = await api.value.fetchTicketsForEntity(props.entityKey, props.recordId);
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load tickets';
    tickets.value = [];
  } finally {
    loading.value = false;
  }
}

function recordContext(): CrmRecordIntegrationContext {
  return {
    entityKey: props.entityKey,
    recordId: props.recordId,
    recordLabel: props.recordLabel,
  };
}

function ticketContextLabel(ticket: Ticket): string {
  const meta = parseHelpDeskCrmMetadata(ticket.metadata);
  return meta?.recordLabel ?? '—';
}

watch(
  () => [props.entityKey, props.recordId, props.helpDeskServerUrl] as const,
  () => {
    void refresh();
  },
);

onMounted(() => {
  void refresh();
});

defineExpose({ refresh });
</script>

<template>
  <section
    class="lab-form-section entity-record-tickets-panel mb-0 flex min-w-0 flex-col gap-3"
    :class="grouped ? '' : 'border-t border-lab-general-border mt-4 pt-4'"
    :id="generateUniqueId(`crm-record-hd-tickets-${entityKey}-${recordId}`)"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <h4
        class="lab-form-section__title m-0 min-w-0"
        :id="generateUniqueId('crm-record-hd-tickets-heading')"
      >
        <span class="lab-form-section__icon" aria-hidden="true">
          <i class="pi pi-ticket" />
        </span>
        Related support tickets
      </h4>
      <Button
        label="New ticket"
        icon="pi pi-plus"
        size="small"
        :disabled="loading || actionsDisabled"
        :pt="{ root: { attrs: { id: generateUniqueId(`crm-add-record-hd-ticket-${recordId}`) } } }"
        @click="emit('open-create', recordContext())"
      />
    </div>

    <Message v-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>

    <DataTable
      :value="tickets"
      :loading="loading"
      size="small"
      striped-rows
      class="text-sm"
      :pt="{ root: { attrs: { id: generateUniqueId(`crm-record-hd-tickets-table-${recordId}`) } } }"
    >
      <Column field="subject" header="Subject" />
      <Column field="status" header="Status" />
      <Column field="priority" header="Priority" />
      <Column header="Context">
        <template #body="{ data }">
          {{ ticketContextLabel(data as Ticket) }}
        </template>
      </Column>
      <Column header="" style="width: 5rem">
        <template #body="{ data }">
          <Button
            label="Edit"
            size="small"
            text
            :pt="{
              root: { attrs: { id: generateUniqueId(`crm-edit-record-hd-ticket-${(data as Ticket).id}`) } },
            }"
            @click="emit('open-edit', (data as Ticket).id)"
          />
        </template>
      </Column>
      <template #empty>
        <p class="text-lab-general-text-muted text-xs m-2">No tickets linked to this record.</p>
      </template>
    </DataTable>
  </section>
</template>
