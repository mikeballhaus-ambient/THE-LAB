<script setup lang="ts">
import { computed } from 'vue';
import { parseCrmEntityRecordDialogSlot } from '../../shared/constants/crm-integration-slots';
import CrmEntityRecordRelatedPanels from './CrmEntityRecordRelatedPanels.vue';
import type { CrmRecordIntegrationContext } from '../composables/useCrmIntegrations';

const props = defineProps<{
  slotId: string;
  context: Record<string, unknown>;
  taskListServerUrl?: string;
  helpDeskServerUrl?: string;
  refreshToken?: number;
  showApprovalSubmit?: boolean;
  showApprovalDecideIntegration?: boolean;
  showLedgerIntegration?: boolean;
  showLedgerAccountCreate?: boolean;
}>();

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

const panelProps = computed(() => {
  const parsed = parseCrmEntityRecordDialogSlot(props.slotId);
  if (!parsed || parsed.mode !== 'edit') {
    return null;
  }
  const recordIdRaw = props.context.recordId;
  const recordId =
    recordIdRaw != null && !Number.isNaN(Number(recordIdRaw)) ? Number(recordIdRaw) : null;
  if (recordId == null || recordId < 1) {
    return null;
  }
  const entityKey = String(props.context.entityKey ?? parsed.entityKey);
  const recordLabel = props.context.recordLabel;
  const stage = props.context.stage;
  return {
    entityKey,
    recordId,
    recordLabel:
      recordLabel != null && String(recordLabel).trim() !== '' ? String(recordLabel) : undefined,
    stage: stage != null && String(stage).trim() !== '' ? String(stage) : undefined,
  };
});
</script>

<template>
  <CrmEntityRecordRelatedPanels
    v-if="panelProps"
    :key="`${panelProps.entityKey}-${panelProps.recordId}-${refreshToken ?? 0}`"
    :task-list-server-url="taskListServerUrl"
    :help-desk-server-url="helpDeskServerUrl"
    :entity-key="panelProps.entityKey"
    :record-id="panelProps.recordId"
    :record-label="panelProps.recordLabel"
    :stage="panelProps.stage"
    :refresh-token="refreshToken"
    :show-approvals="
      showApprovalSubmit === true
        || showApprovalDecideIntegration === true
    "
    :show-approval-submit="showApprovalSubmit === true"
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
</template>
