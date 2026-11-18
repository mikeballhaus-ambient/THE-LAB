<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import type { ConnectorTicket } from '../composables/useHelpDeskApi';
import { priorityLabel, statusLabel } from '../../shared/utils/dashboard-aggregates';

defineProps<{
  tickets: ConnectorTicket[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'edit', ticket: ConnectorTicket): void;
  (e: 'delete', ticket: ConnectorTicket): void;
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div class="lab-app-panel min-w-0 overflow-x-auto">
    <DataTable
      :value="tickets"
      :loading="loading"
      size="small"
      striped-rows
      class="w-full"
      :pt="{ root: { attrs: { id: generateUniqueId('help-desk-table') } } }"
    >
      <Column field="subject" header="Subject" />
      <Column header="Status">
        <template #body="{ data }">
          {{ statusLabel((data as ConnectorTicket).status) }}
        </template>
      </Column>
      <Column header="Priority">
        <template #body="{ data }">
          {{ priorityLabel((data as ConnectorTicket).priority) }}
        </template>
      </Column>
      <Column header="Actions" style="width: 9rem">
        <template #body="{ data }">
          <div class="flex gap-1 flex-wrap">
            <Button
              label="Edit"
              icon="pi pi-pencil"
              size="small"
              severity="secondary"
              outlined
              :pt="
                labRecordActionButtonPt(
                  generateUniqueId,
                  'help-desk-ticket',
                  'edit',
                  (data as ConnectorTicket).id,
                  (data as ConnectorTicket).subject,
                )
              "
              @click="emit('edit', data as ConnectorTicket)"
            />
            <Button
              label="Remove"
              icon="pi pi-trash"
              size="small"
              severity="danger"
              outlined
              :pt="
                labRecordActionButtonPt(
                  generateUniqueId,
                  'help-desk-ticket',
                  'delete',
                  (data as ConnectorTicket).id,
                  (data as ConnectorTicket).subject,
                )
              "
              @click="emit('delete', data as ConnectorTicket)"
            />
          </div>
        </template>
      </Column>
      <template #empty>
        <p class="text-lab-general-text-muted text-sm m-2">No tickets yet.</p>
      </template>
    </DataTable>
  </div>
</template>
