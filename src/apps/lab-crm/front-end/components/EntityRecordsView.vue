<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue';

import Button from 'primevue/button';

import DataTable from 'primevue/datatable';

import Column from 'primevue/column';

import Dialog from 'primevue/dialog';

import InputText from 'primevue/inputtext';

import Message from 'primevue/message';

import Select from 'primevue/select';

import { useToast } from 'primevue/usetoast';

import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

import RecordDetailPanel from './RecordDetailPanel.vue';

import CrmEntityRecordRelatedPanels from './CrmEntityRecordRelatedPanels.vue';

import CrmApprovalStatusBadge from './CrmApprovalStatusBadge.vue';

import EntityIcon from './EntityIcon.vue';

import { useEntityWorkspace } from '../composables/useCrmApi';

import { useCrmRecordSocket } from '../composables/useCrmRecordSocket';

import type { CrmRecordIntegrationContext } from '../composables/useCrmIntegrations';
import { CRM_DEAL_ENTITY_KEYS } from '../../shared/constants/crm-integration-slots';

import {
  crmDealApprovalStatusAllowsSubmit,
  readCrmDealApprovalStatus,
} from '../../shared/utils/crm-approval-status';

import {
  filterableProperties,

  filterRecords,

  formatCellValueForDefinition,

  listDisplayColumns,

  recordsToCsv,

} from '../../shared/utils/record-list-display';



const props = defineProps<{

  serverUrl: string;

  entityKey: string;

  hasCreateSlot?: boolean;

  hasEditSlot?: boolean;

  hasDeleteSlot?: boolean;

  taskListServerUrl?: string;

  helpDeskServerUrl?: string;

  relatedPanelsRefreshToken?: number;

  showApprovalSubmit?: boolean;

  showApprovalDecideIntegration?: boolean;

  showLedgerIntegration?: boolean;

  showLedgerAccountCreate?: boolean;

  openRecordId?: number | null;

  /** Opened from Approvals → View CRM record; disables mutating integration actions in the view dialog. */
  recordViewReadOnly?: boolean;

}>();

const emit = defineEmits<{

  (e: 'create'): void;

  (e: 'edit', payload: CrmRecordIntegrationContext): void;

  (e: 'delete', recordId: number): void;

  (e: 'open-record-consumed'): void;

  (e: 'view-dialog-closed'): void;

  (e: 'open-task-create', payload: CrmRecordIntegrationContext & { title?: string }): void;

  (e: 'open-task-edit', taskId: number): void;

  (e: 'open-task-delete', taskId: number): void;

  (e: 'open-ticket-create', payload: CrmRecordIntegrationContext): void;

  (e: 'open-ticket-edit', ticketId: number): void;

  (e: 'open-ticket-delete', ticketId: number): void;

  (e: 'open-approval-submit', payload: CrmRecordIntegrationContext): void;

  (e: 'open-approval-decide', requestId: string): void;

  (e: 'open-ledger-post', payload: CrmRecordIntegrationContext): void;

  (e: 'open-ledger-create-account'): void;

}>();



const { generateUniqueId } = useUniqueElementId();

const toast = useToast();

const { records, lookupLabels, loading, definition, loadError, refresh, api } = useEntityWorkspace(

  props.serverUrl,

  props.entityKey,

);



const showView = ref(false);

const selectedRow = ref<Record<string, unknown> | null>(null);

const convertingLeadId = ref<number | null>(null);

const searchQuery = ref('');

const fieldFilters = ref<Record<string, string>>({});



const listColumns = computed(() => listDisplayColumns(definition.value));

const filterProps = computed(() => filterableProperties(definition.value));



const filteredRecords = computed(() =>

  filterRecords(records.value, { q: searchQuery.value, fieldFilters: fieldFilters.value }),

);



const isEmpty = computed(() => !loading.value && filteredRecords.value.length === 0);

function recordLabelFromRow(row: Record<string, unknown> | null | undefined): string {
  if (!row) {
    return '';
  }
  for (const col of listColumns.value) {
    const v = row[col.name];
    if (v != null && String(v).trim() !== '') {
      return String(v);
    }
  }
  return row.id != null ? `#${row.id}` : '';
}

function salesStageFromRow(row: Record<string, unknown> | null | undefined): string | undefined {
  if (props.entityKey !== 'sales' || !row) {
    return undefined;
  }
  const stage = row.stage;
  return stage != null && String(stage).trim() !== '' ? String(stage) : undefined;
}

const recordTasksAvailable = computed(() => Boolean(props.taskListServerUrl?.trim()));

const recordTicketsAvailable = computed(() => Boolean(props.helpDeskServerUrl?.trim()));

const viewRecordId = computed(() =>
  selectedRow.value?.id != null ? Number(selectedRow.value.id) : null,
);

const viewRecordLabel = computed(() => recordLabelFromRow(selectedRow.value));

const viewRecordStage = computed(() => salesStageFromRow(selectedRow.value));

const showDealPlatformActions = computed(
  () => CRM_DEAL_ENTITY_KEYS.has(props.entityKey) && viewRecordId.value != null,
);

const showApprovalSubmitAction = computed(
  () => props.showApprovalSubmit === true && CRM_DEAL_ENTITY_KEYS.has(props.entityKey),
);

const viewDealApprovalStatus = computed(() => readCrmDealApprovalStatus(selectedRow.value));

const showApprovalSubmitButton = computed(
  () =>
    showApprovalSubmitAction.value
    && !props.recordViewReadOnly
    && crmDealApprovalStatusAllowsSubmit(viewDealApprovalStatus.value),
);

const viewReadOnlyActionsDisabled = computed(
  () => props.recordViewReadOnly === true && showView.value,
);

const showApprovalsRelatedPanel = computed(
  () =>
    showApprovalSubmitAction.value
    || props.showApprovalDecideIntegration === true,
);

const showRecordRelatedPanels = computed(
  () =>
    viewRecordId.value != null
    && (recordTasksAvailable.value
      || recordTicketsAvailable.value
      || showApprovalsRelatedPanel.value
      || props.showLedgerIntegration),
);

function viewRecordContext(): CrmRecordIntegrationContext {
  return {
    entityKey: props.entityKey,
    recordId: viewRecordId.value ?? 0,
    recordLabel: viewRecordLabel.value,
    stage: viewRecordStage.value,
  };
}

useCrmRecordSocket(props.serverUrl, props.entityKey, () => {

  void refresh();

});



function openView(row: Record<string, unknown>): void {

  selectedRow.value = row;

  showView.value = true;

}

watch(showView, (visible, wasVisible) => {
  if (wasVisible && !visible && props.recordViewReadOnly) {
    emit('view-dialog-closed');
  }
});

function tryOpenRecordById(recordId: number): void {
  const row = records.value.find((candidate) => Number(candidate.id) === recordId);
  if (!row) {
    return;
  }
  openView(row);
  emit('open-record-consumed');
}

watch(
  [() => props.openRecordId, records],
  () => {
    const recordId = props.openRecordId;
    if (recordId == null || Number.isNaN(recordId)) {
      return;
    }
    tryOpenRecordById(recordId);
  },
  { immediate: true },
);

watch(records, () => {
  if (!showView.value || selectedRow.value?.id == null) {
    return;
  }
  const id = Number(selectedRow.value.id);
  const fresh = records.value.find((candidate) => Number(candidate.id) === id);
  if (fresh) {
    selectedRow.value = fresh;
  }
});



function openEdit(row: Record<string, unknown>): void {

  const recordId = Number(row.id);

  emit('edit', {

    entityKey: props.entityKey,

    recordId,

    recordLabel: recordLabelFromRow(row),

    stage: salesStageFromRow(row),

    workflow: props.entityKey === 'sales' ? 'pipeline' : undefined,

  });

}



async function convertLead(row: Record<string, unknown>): Promise<void> {

  const id = Number(row.id);

  if (Number.isNaN(id)) {

    return;

  }

  const title = row.title ?? row.name ?? `#${id}`;

  const ok = window.confirm(`Convert lead "${title}" to a sale? The lead will be marked converted.`);

  if (!ok) {

    return;

  }

  convertingLeadId.value = id;

  try {

    await api.convertLead(id);

    toast.add({

      severity: 'success',

      summary: 'Lead converted',

      detail: 'Sale created and lead marked converted',

      life: 4000,

    });

    await refresh();

  } catch (err) {

    toast.add({

      severity: 'error',

      summary: 'Convert failed',

      detail: err instanceof Error ? err.message : 'Unknown error',

      life: 5000,

    });

  } finally {

    convertingLeadId.value = null;

  }

}



function exportCsv(): void {

  const csv = recordsToCsv(listColumns.value, filteredRecords.value, definition.value, lookupLabels.value);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;

  a.download = `${props.entityKey}-records.csv`;

  a.click();

  URL.revokeObjectURL(url);

  toast.add({ severity: 'info', summary: 'Export', detail: 'CSV download started', life: 2500 });

}



function filterOptions(propName: string): { label: string; value: string }[] {

  const prop = definition.value?.properties.find((p) => p.name === propName);

  if (prop?.type === 'enum' && prop.options?.length) {

    return prop.options.map((o) => ({ label: o.label, value: o.value }));

  }

  const values = new Set<string>();

  for (const row of records.value) {

    const v = row[propName];

    if (v != null && v !== '') {

      values.add(String(v));

    }

  }

  return [...values].sort().map((v) => ({ label: v, value: v }));

}



onMounted(() => refresh());

watch(

  () => props.entityKey,

  () => {

    searchQuery.value = '';

    fieldFilters.value = {};

    refresh();

  },

);

</script>



<template>

  <div class="crm-entity-records-view app-loaded-container flex flex-col gap-4">

    <div class="crm-entity-toolbar flex flex-wrap items-center justify-between gap-2">

      <h2

        class="text-xl font-semibold"

        :id="generateUniqueId(`crm-entity-title-${entityKey}`)"

      >

        <EntityIcon :icon="definition?.icon" size="lg">

          {{ definition?.name ?? entityKey }}

        </EntityIcon>

      </h2>

      <div class="flex flex-wrap gap-2">

        <Button

          class="crm-export-records-btn"

          label="Export CSV"

          icon="pi pi-download"

          severity="secondary"

          outlined

          size="small"

          :disabled="filteredRecords.length === 0"

          :pt="{ root: { attrs: { id: generateUniqueId(`crm-export-${entityKey}`) } } }"

          @click="exportCsv"

        />

        <Button

          class="crm-new-record-btn"

          label="New"

          icon="pi pi-plus"

          size="small"

          :disabled="!hasCreateSlot"

          :pt="{ root: { attrs: { id: generateUniqueId(`crm-new-${entityKey}`) } } }"

          @click="emit('create')"

        />

      </div>

    </div>



    <Message v-if="loadError" severity="error" :closable="false" class="crm-records-load-error">

      {{ loadError }}

    </Message>



    <p v-if="!hasCreateSlot" class="text-sm text-amber-300">

      No integration binding for <code>crm.{{ entityKey }}.create.dialog</code>. Provision a form stub and

      upsert a binding on host <code>app-lab-crm</code> (Integrations / Lab Assistant).

    </p>



    <div class="crm-records-filters flex flex-wrap gap-2 items-end">

      <div class="flex flex-col gap-1">

        <label class="text-xs text-lab-general-text-muted" :id="generateUniqueId(`crm-search-label-${entityKey}`)">Search</label>

        <InputText

          v-model="searchQuery"

          placeholder="Search records…"

          class="crm-records-search-input"

          :pt="{ root: { attrs: { id: generateUniqueId(`crm-search-${entityKey}`) } } }"

        />

      </div>

      <div

        v-for="fp in filterProps"

        :key="fp.name"

        class="flex flex-col gap-1"

      >

        <label
          class="text-xs text-lab-general-text-muted"
          :id="generateUniqueId(`crm-filter-label-${entityKey}-${fp.name}`)"
        >{{ fp.label }}</label>

        <Select

          :model-value="fieldFilters[fp.name] ?? ''"

          :options="[{ label: 'All', value: '' }, ...filterOptions(fp.name)]"

          option-label="label"

          option-value="value"

          placeholder="All"

          class="crm-records-filter-select"

          :pt="{

            root: { attrs: { id: generateUniqueId(`crm-filter-${entityKey}-${fp.name}`) } },

          }"

          @update:model-value="

            (v: string | null) => {

              fieldFilters = { ...fieldFilters, [fp.name]: v ?? '' };

            }

          "

        />

      </div>

    </div>



    <Message

      v-if="isEmpty && !loadError"

      severity="info"

      :closable="false"

      class="crm-records-empty-state"

    >

      No records match your filters. Create one with <strong>New</strong> or clear filters.

    </Message>



    <DataTable

      v-show="!isEmpty || loading"

      :value="filteredRecords"

      :loading="loading"

      striped-rows

      class="crm-records-table"

      :pt="{ root: { attrs: { id: generateUniqueId(`crm-table-${entityKey}`) } } }"

    >

      <Column field="id" header="ID" style="width: 4rem" />

      <Column

        v-for="col in listColumns"

        :key="col.name"

        :field="col.name"

        :header="col.label"

      >

        <template #body="{ data }">

          <CrmApprovalStatusBadge
            v-if="col.name === 'approvalStatus' && readCrmDealApprovalStatus(data)"
            :status="readCrmDealApprovalStatus(data)!"
          />
          <span
            v-else-if="col.name === 'approvalStatus'"
            class="text-lab-general-text-muted"
          >
            —
          </span>
          <template v-else>
            {{ formatCellValueForDefinition(data, col.name, definition, lookupLabels) }}
          </template>

        </template>

      </Column>

      <Column header="Actions" style="width: 12rem">

        <template #body="{ data }">

          <div class="flex flex-wrap gap-1">

            <Button

              icon="pi pi-eye"

              size="small"

              text

              rounded

              severity="secondary"

              class="crm-view-record-btn"

              :pt="{

                root: { attrs: { id: generateUniqueId(`crm-view-${entityKey}-${data.id}`) } },

              }"

              @click="openView(data)"

            />

            <Button

              icon="pi pi-pencil"

              size="small"

              text

              rounded

              severity="secondary"

              :disabled="!hasEditSlot"

              :pt="
                labRecordActionButtonPt(
                  generateUniqueId,
                  `crm-${entityKey}`,
                  'edit',
                  data.id,
                  recordLabelFromRow(data),
                )
              "

              @click="openEdit(data)"

            />

            <Button

              v-if="entityKey === 'leads' && data.status !== 'converted'"

              label="Convert"

              size="small"

              class="crm-convert-lead-btn"

              :loading="convertingLeadId === data.id"

              :pt="{ root: { attrs: { id: generateUniqueId(`crm-convert-${data.id}`) } } }"

              @click="convertLead(data)"

            />

          </div>

        </template>

      </Column>

    </DataTable>



    <Dialog

      v-model:visible="showView"

      modal

      class="crm-view-dialog lab-integration-dialog lab-app-dialog lab-form-runtime w-full max-w-3xl"

      :pt="{
        root: { attrs: { id: generateUniqueId(`crm-view-dialog-${entityKey}`) } },
        mask: { class: 'lab-app-dialog' },
      }"

    >

      <template #header>

        <div class="flex flex-wrap items-center justify-between gap-2 w-full min-w-0">
          <EntityIcon :icon="definition?.icon">
            View {{ definition?.name ?? entityKey }}
          </EntityIcon>
          <div
            v-if="showDealPlatformActions"
            class="crm-record-deal-actions flex flex-wrap gap-2 shrink-0 me-8"
          >
            <Button
              v-if="showApprovalSubmitButton"
              label="Submit approval"
              icon="pi pi-check-square"
              size="small"
              severity="secondary"
              outlined
              :pt="{ root: { attrs: { id: generateUniqueId(`crm-view-approval-${viewRecordId}`) } } }"
              @click="emit('open-approval-submit', viewRecordContext())"
            />
            <CrmApprovalStatusBadge
              v-else-if="viewDealApprovalStatus"
              :status="viewDealApprovalStatus"
            />
            <Button
              v-if="showLedgerIntegration"
              label="Post entry"
              icon="pi pi-book"
              size="small"
              severity="secondary"
              outlined
              :disabled="viewReadOnlyActionsDisabled"
              :pt="{ root: { attrs: { id: generateUniqueId(`crm-view-ledger-post-${viewRecordId}`) } } }"
              @click="emit('open-ledger-post', viewRecordContext())"
            />
          </div>
        </div>

      </template>

      <div class="crm-view-dialog-body flex flex-col gap-4 min-w-0 px-5 pb-5 pt-1">
        <RecordDetailPanel

          v-if="selectedRow"

          :definition="definition"

          :record="selectedRow"

          :lookup-labels="lookupLabels"

          @close="showView = false"

        />

        <CrmEntityRecordRelatedPanels

          v-if="showRecordRelatedPanels"

          :task-list-server-url="taskListServerUrl"

          :help-desk-server-url="helpDeskServerUrl"

          :entity-key="entityKey"

          :record-id="viewRecordId!"

          :record-label="viewRecordLabel"

          :stage="viewRecordStage"

          :refresh-token="relatedPanelsRefreshToken"

          :show-approvals="showApprovalsRelatedPanel"
          :show-approval-submit="showApprovalSubmitButton"
          :record-approval-status="viewDealApprovalStatus"
          :disable-integration-actions="viewReadOnlyActionsDisabled"

          :show-ledger="showLedgerIntegration"

          :show-ledger-account-create="showLedgerAccountCreate"

          @open-task-create="emit('open-task-create', $event)"

          @open-task-edit="emit('open-task-edit', $event)"

          @open-ticket-create="emit('open-ticket-create', $event)"

          @open-ticket-edit="emit('open-ticket-edit', $event)"

          @open-approval-submit="emit('open-approval-submit', $event)"

          @open-approval-decide="emit('open-approval-decide', $event)"

          @open-ledger-post="emit('open-ledger-post', $event)"

          @open-ledger-create-account="emit('open-ledger-create-account')"

        />
      </div>

    </Dialog>

  </div>

</template>


