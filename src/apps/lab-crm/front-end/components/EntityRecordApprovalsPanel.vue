<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { fetchMyLabApprovalRequests } from '@/shared/services/platform-lab-approvals.client';
import type { LabApprovalRequestRecord } from '@/shared/types/lab-approval';
import { CRM_APP_REGISTRY_ID } from '../../shared/constants/app-scope';
import type { CrmRecordIntegrationContext } from '../composables/useCrmIntegrations';
import CrmApprovalStatusBadge from './CrmApprovalStatusBadge.vue';
import type { CrmDealApprovalStatus } from '../../shared/utils/crm-approval-status';

const props = defineProps<{
  entityKey: string;
  recordId: number;
  recordLabel?: string;
  grouped?: boolean;
  groupedAfterSibling?: boolean;
  refreshToken?: number;
  enabled?: boolean;
  showSubmit?: boolean;
  recordApprovalStatus?: CrmDealApprovalStatus | null;
}>();

const emit = defineEmits<{
  (e: 'open-submit', payload: CrmRecordIntegrationContext): void;
  (e: 'open-decide', requestId: string): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const loading = ref(false);
const loadError = ref<string | null>(null);
const requests = ref<LabApprovalRequestRecord[]>([]);

async function refresh(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    const all = await fetchMyLabApprovalRequests();
    requests.value = all.filter(
      (row) =>
        row.subjectAppId === CRM_APP_REGISTRY_ID
        && row.subjectEntityType === props.entityKey
        && row.subjectEntityId === String(props.recordId),
    );
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load approval requests';
    requests.value = [];
  } finally {
    loading.value = false;
  }
}

const recordContext = computed((): CrmRecordIntegrationContext => ({
  entityKey: props.entityKey,
  recordId: props.recordId,
  recordLabel: props.recordLabel,
}));

watch(
  () => [props.entityKey, props.recordId, props.refreshToken] as const,
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
    v-if="enabled !== false"
    class="lab-form-section entity-record-approvals-panel mb-0 flex min-w-0 flex-col gap-3"
    :class="grouped ? '' : 'border-t border-lab-general-border mt-4 pt-4'"
    :id="generateUniqueId(`crm-record-approvals-${entityKey}-${recordId}`)"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <h4
        class="lab-form-section__title m-0 min-w-0"
        :id="generateUniqueId(`crm-record-approvals-heading-${entityKey}-${recordId}`)"
      >
        <span class="lab-form-section__icon" aria-hidden="true">
          <i class="pi pi-shield" />
        </span>
        Related approvals
      </h4>
      <Button
        v-if="showSubmit === true"
        label="Submit approval"
        icon="pi pi-check-square"
        size="small"
        :disabled="loading"
        :pt="{ root: { attrs: { id: generateUniqueId(`crm-approval-submit-${recordId}`) } } }"
        @click="emit('open-submit', recordContext)"
      />
      <CrmApprovalStatusBadge
        v-else-if="recordApprovalStatus"
        :status="recordApprovalStatus"
      />
    </div>

    <Message v-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>

    <DataTable
      :value="requests"
      :loading="loading"
      size="small"
      striped-rows
      class="text-sm"
      :pt="{ root: { attrs: { id: generateUniqueId(`crm-record-approvals-table-${recordId}`) } } }"
    >
      <Column field="title" header="Title" />
      <Column field="status" header="Status" />
      <Column field="policyId" header="Policy" />
      <Column header="" style="width: 6rem">
        <template #body="{ data }">
          <Button
            v-if="(data as LabApprovalRequestRecord).status === 'pending'"
            label="Decide"
            size="small"
            text
            :pt="{
              root: {
                attrs: {
                  id: generateUniqueId(`crm-approval-decide-${(data as LabApprovalRequestRecord).id}`),
                },
              },
            }"
            @click="emit('open-decide', (data as LabApprovalRequestRecord).id)"
          />
        </template>
      </Column>
      <template #empty>
        <p class="text-lab-general-text-muted text-xs m-2">No approval requests for this record.</p>
      </template>
    </DataTable>
  </section>
</template>
