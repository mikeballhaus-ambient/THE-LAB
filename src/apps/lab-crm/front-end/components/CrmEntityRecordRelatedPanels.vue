<script setup lang="ts">
import { computed } from 'vue';
import EntityRecordTasksPanel from './EntityRecordTasksPanel.vue';
import EntityRecordTicketsPanel from './EntityRecordTicketsPanel.vue';
import EntityRecordApprovalsPanel from './EntityRecordApprovalsPanel.vue';
import EntityRecordLedgerPanel from './EntityRecordLedgerPanel.vue';
import type { CrmRecordIntegrationContext } from '../composables/useCrmIntegrations';
import type { CrmDealApprovalStatus } from '../../shared/utils/crm-approval-status';

const props = defineProps<{
  taskListServerUrl?: string;
  helpDeskServerUrl?: string;
  entityKey: string;
  recordId: number;
  recordLabel?: string;
  stage?: string;
  refreshToken?: number;
  showApprovals?: boolean;
  showApprovalSubmit?: boolean;
  recordApprovalStatus?: CrmDealApprovalStatus | null;
  showLedger?: boolean;
  showLedgerAccountCreate?: boolean;
  disableIntegrationActions?: boolean;
}>();

const showTasks = computed(() => Boolean(props.taskListServerUrl?.trim()));
const showTickets = computed(() => Boolean(props.helpDeskServerUrl?.trim()));

const emit = defineEmits<{
  (e: 'open-task-create', payload: CrmRecordIntegrationContext & { title?: string }): void;
  (e: 'open-task-edit', taskId: number): void;
  (e: 'open-ticket-create', payload: CrmRecordIntegrationContext): void;
  (e: 'open-ticket-edit', ticketId: number): void;
  (e: 'open-approval-submit', payload: CrmRecordIntegrationContext): void;
  (e: 'open-approval-decide', requestId: string): void;
  (e: 'open-ledger-post', payload: CrmRecordIntegrationContext): void;
  (e: 'open-ledger-create-account'): void;
}>();

const showApprovalsPanel = computed(() => props.showApprovals === true);
const showLedgerPanel = computed(() => props.showLedger === true);
const groupedBeforeApprovals = computed(() => showTasks.value || showTickets.value);
const groupedBeforeLedger = computed(
  () => groupedBeforeApprovals.value || showApprovalsPanel.value,
);
</script>

<template>
  <div class="crm-record-related-panels box-border flex w-full min-w-0 flex-col gap-4 list-none m-0 p-0">
    <EntityRecordTasksPanel
      v-if="showTasks"
      grouped
      :task-list-server-url="taskListServerUrl ?? ''"
      :entity-key="entityKey"
      :record-id="recordId"
      :record-label="recordLabel"
      :stage="stage"
      :actions-disabled="disableIntegrationActions === true"
      @open-create="emit('open-task-create', $event)"
      @open-edit="emit('open-task-edit', $event)"
    />
    <EntityRecordTicketsPanel
      v-if="showTickets"
      grouped
      :grouped-after-sibling="showTasks"
      :help-desk-server-url="helpDeskServerUrl ?? ''"
      :entity-key="entityKey"
      :record-id="recordId"
      :record-label="recordLabel"
      :actions-disabled="disableIntegrationActions === true"
      @open-create="emit('open-ticket-create', $event)"
      @open-edit="emit('open-ticket-edit', $event)"
    />
    <EntityRecordApprovalsPanel
      v-if="showApprovalsPanel"
      grouped
      :grouped-after-sibling="groupedBeforeApprovals"
      :entity-key="entityKey"
      :record-id="recordId"
      :record-label="recordLabel"
      :refresh-token="refreshToken"
      :show-submit="showApprovalSubmit === true"
      :record-approval-status="recordApprovalStatus ?? null"
      @open-submit="emit('open-approval-submit', $event)"
      @open-decide="emit('open-approval-decide', $event)"
    />
    <EntityRecordLedgerPanel
      v-if="showLedgerPanel"
      grouped
      :grouped-after-sibling="groupedBeforeLedger"
      :show-create-account="showLedgerAccountCreate === true"
      :actions-disabled="disableIntegrationActions === true"
      :entity-key="entityKey"
      :record-id="recordId"
      :record-label="recordLabel"
      @open-post-entry="emit('open-ledger-post', $event)"
      @open-create-account="emit('open-ledger-create-account')"
    />
  </div>
</template>
