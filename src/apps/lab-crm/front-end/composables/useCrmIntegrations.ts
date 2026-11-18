import { computed, ref, type Ref } from 'vue';
import type { LabIntegrationSurface } from '@/shared/integration';
import { CRM_APP_REGISTRY_ID } from '../../shared/constants/app-scope';
import {
  crmEntityCreateSlot,
  crmEntityDeleteSlot,
  crmEntityEditSlot,
  CRM_TASK_INTEGRATION_SLOTS,
  CRM_TICKET_INTEGRATION_SLOTS,
  CRM_APPROVAL_INTEGRATION_SLOTS,
  CRM_LEDGER_INTEGRATION_SLOTS,
  CRM_DEAL_ENTITY_KEYS,
} from '../../shared/constants/crm-integration-slots';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import type { IntegrationConnectorPeerUrls } from '@/shared/lab-integrations/resolve-integration-connector-server-url';
import { useCrmTasksApi } from './useCrmTasksApi';

export interface CrmRecordIntegrationContext {
  entityKey: string;
  recordId: number;
  recordLabel?: string;
  stage?: string;
  workflow?: string;
}

export function useCrmIntegrations(options: {
  serverUrl: Ref<string>;
  taskListServerUrl: Ref<string>;
  helpDeskServerUrl: Ref<string>;
  onRecordsChanged: () => Promise<void>;
}) {
  const integrationSurfaceRef = ref<InstanceType<typeof LabIntegrationSurface> | null>(null);

  const integrationEntityKey = ref<string | null>(null);
  const integrationRecordId = ref<number | null>(null);
  const integrationRecordLabel = ref<string | undefined>(undefined);
  const integrationRecordStage = ref<string | undefined>(undefined);
  const integrationTaskId = ref<number | null>(null);
  const integrationTicketId = ref<number | null>(null);
  const integrationRequestId = ref<string | null>(null);
  const integrationTaskTitlePreset = ref<string | undefined>(undefined);
  const integrationDebitAccountId = ref<string | undefined>(undefined);
  const integrationCreditAccountId = ref<string | undefined>(undefined);
  const defaultTaskListId = ref<number | null>(null);
  /** Bumped when task/ticket dialogs succeed so record-related panels reload. */
  const recordRelatedPanelsRefreshToken = ref(0);

  const approvalSubmitVisible = ref(false);
  const approvalSubmitContext = ref<(CrmRecordIntegrationContext & { title?: string }) | null>(null);
  const ledgerPostVisible = ref(false);
  const ledgerPostContext = ref<CrmRecordIntegrationContext | null>(null);

  const peerConnectorUrls = computed<IntegrationConnectorPeerUrls>(() => ({
    'app-lab-tasklist': options.taskListServerUrl.value || undefined,
    'app-lab-helpdesk': options.helpDeskServerUrl.value || undefined,
    platform: resolvePlatformBackendUrlForClient(),
  }));

  const integrationContext = computed((): Record<string, unknown> => {
    const ctx: Record<string, unknown> = {};
    if (integrationEntityKey.value) {
      ctx.entityKey = integrationEntityKey.value;
    }
    if (integrationRecordId.value != null) {
      ctx.recordId = integrationRecordId.value;
    }
    if (integrationRecordLabel.value) {
      ctx.recordLabel = integrationRecordLabel.value;
    }
    if (integrationRecordStage.value) {
      ctx.stage = integrationRecordStage.value;
    }
    if (integrationEntityKey.value === 'sales') {
      ctx.workflow = 'pipeline';
    }
    if (defaultTaskListId.value != null) {
      ctx.taskListId = defaultTaskListId.value;
    }
    if (integrationTaskId.value != null) {
      ctx.taskId = integrationTaskId.value;
    }
    if (integrationTicketId.value != null) {
      ctx.ticketId = integrationTicketId.value;
    }
    if (integrationTaskTitlePreset.value) {
      ctx.title = integrationTaskTitlePreset.value;
    }
    if (integrationRequestId.value) {
      ctx.requestId = integrationRequestId.value;
    }
    if (integrationDebitAccountId.value) {
      ctx.debitAccountId = integrationDebitAccountId.value;
    }
    if (integrationCreditAccountId.value) {
      ctx.creditAccountId = integrationCreditAccountId.value;
    }
    if (integrationEntityKey.value && integrationRecordId.value != null) {
      ctx.subjectAppId = CRM_APP_REGISTRY_ID;
      ctx.subjectEntityType = integrationEntityKey.value;
      ctx.subjectEntityId = String(integrationRecordId.value);
    }
    return ctx;
  });

  async function ensureDefaultTaskListId(): Promise<number | null> {
    const url = options.taskListServerUrl.value?.trim();
    if (!url) {
      return null;
    }
    if (defaultTaskListId.value != null) {
      return defaultTaskListId.value;
    }
    try {
      const id = await useCrmTasksApi(url).ensureDefaultTaskListId();
      defaultTaskListId.value = id;
      return id;
    } catch {
      return null;
    }
  }

  function resetIntegrationIds(): void {
    integrationEntityKey.value = null;
    integrationRecordId.value = null;
    integrationRecordLabel.value = undefined;
    integrationRecordStage.value = undefined;
    integrationTaskId.value = null;
    integrationTicketId.value = null;
    integrationRequestId.value = null;
    integrationTaskTitlePreset.value = undefined;
    integrationDebitAccountId.value = undefined;
    integrationCreditAccountId.value = undefined;
  }

  function hasIntegrationSlot(slot: string): boolean {
    return integrationSurfaceRef.value?.hasEnabledBinding(slot) ?? false;
  }

  const hasApprovalDecideIntegration = computed(() =>
    hasIntegrationSlot(CRM_APPROVAL_INTEGRATION_SLOTS.decide),
  );

  function canSubmitApprovalForEntity(entityKey: string): boolean {
    return CRM_DEAL_ENTITY_KEYS.has(entityKey);
  }

  function canPostLedgerForEntity(entityKey: string): boolean {
    return CRM_DEAL_ENTITY_KEYS.has(entityKey);
  }

  const hasLedgerAccountCreateIntegration = computed(() =>
    hasIntegrationSlot(CRM_LEDGER_INTEGRATION_SLOTS.createAccount),
  );

  function openEntityCreate(entityKey: string): void {
    const slot = crmEntityCreateSlot(entityKey);
    if (!integrationSurfaceRef.value?.hasEnabledBinding(slot)) {
      return;
    }
    integrationEntityKey.value = entityKey;
    integrationRecordId.value = null;
    integrationRecordLabel.value = undefined;
    integrationRecordStage.value = undefined;
    integrationSurfaceRef.value.openSlot(slot);
  }

  function openEntityEdit(entityKey: string, recordId: number, extras?: Partial<CrmRecordIntegrationContext>): void {
    const slot = crmEntityEditSlot(entityKey);
    if (!integrationSurfaceRef.value?.hasEnabledBinding(slot)) {
      return;
    }
    integrationEntityKey.value = entityKey;
    integrationRecordId.value = recordId;
    integrationRecordLabel.value = extras?.recordLabel;
    integrationRecordStage.value = extras?.stage;
    integrationSurfaceRef.value.openSlot(slot);
  }

  function openEntityDelete(entityKey: string, recordId: number): void {
    const slot = crmEntityDeleteSlot(entityKey);
    if (!integrationSurfaceRef.value?.hasEnabledBinding(slot)) {
      return;
    }
    integrationEntityKey.value = entityKey;
    integrationRecordId.value = recordId;
    integrationSurfaceRef.value.openSlot(slot);
  }

  async function openTaskCreateFromTasksTab(): Promise<void> {
    await ensureDefaultTaskListId();
    if (!integrationSurfaceRef.value?.hasEnabledBinding(CRM_TASK_INTEGRATION_SLOTS.create)) {
      return;
    }
    integrationEntityKey.value = null;
    integrationRecordId.value = null;
    integrationRecordLabel.value = undefined;
    integrationRecordStage.value = undefined;
    integrationSurfaceRef.value.openSlot(CRM_TASK_INTEGRATION_SLOTS.create);
  }

  async function openTaskCreate(
    record: CrmRecordIntegrationContext & { title?: string },
  ): Promise<void> {
    await ensureDefaultTaskListId();
    if (!integrationSurfaceRef.value?.hasEnabledBinding(CRM_TASK_INTEGRATION_SLOTS.create)) {
      return;
    }
    integrationEntityKey.value = record.entityKey;
    integrationRecordId.value = record.recordId;
    integrationRecordLabel.value = record.recordLabel;
    integrationRecordStage.value = record.stage;
    integrationTaskTitlePreset.value = record.title;
    integrationSurfaceRef.value.openSlot(CRM_TASK_INTEGRATION_SLOTS.create);
  }

  function openTaskEdit(taskId: number): void {
    if (!integrationSurfaceRef.value?.hasEnabledBinding(CRM_TASK_INTEGRATION_SLOTS.edit)) {
      return;
    }
    integrationTaskId.value = taskId;
    void ensureDefaultTaskListId().then(() => {
      integrationSurfaceRef.value?.openSlot(CRM_TASK_INTEGRATION_SLOTS.edit);
    });
  }

  function openTaskDelete(taskId: number): void {
    if (!integrationSurfaceRef.value?.hasEnabledBinding(CRM_TASK_INTEGRATION_SLOTS.delete)) {
      return;
    }
    integrationTaskId.value = taskId;
    void ensureDefaultTaskListId().then(() => {
      integrationSurfaceRef.value?.openSlot(CRM_TASK_INTEGRATION_SLOTS.delete);
    });
  }

  function openTicketCreate(record: CrmRecordIntegrationContext): void {
    if (!integrationSurfaceRef.value?.hasEnabledBinding(CRM_TICKET_INTEGRATION_SLOTS.create)) {
      return;
    }
    integrationEntityKey.value = record.entityKey;
    integrationRecordId.value = record.recordId;
    integrationRecordLabel.value = record.recordLabel;
    integrationSurfaceRef.value.openSlot(CRM_TICKET_INTEGRATION_SLOTS.create);
  }

  function openTicketEdit(ticketId: number): void {
    if (!integrationSurfaceRef.value?.hasEnabledBinding(CRM_TICKET_INTEGRATION_SLOTS.edit)) {
      return;
    }
    integrationTicketId.value = ticketId;
    integrationSurfaceRef.value.openSlot(CRM_TICKET_INTEGRATION_SLOTS.edit);
  }

  function openTicketDelete(ticketId: number): void {
    if (!integrationSurfaceRef.value?.hasEnabledBinding(CRM_TICKET_INTEGRATION_SLOTS.delete)) {
      return;
    }
    integrationTicketId.value = ticketId;
    integrationSurfaceRef.value.openSlot(CRM_TICKET_INTEGRATION_SLOTS.delete);
  }

  function openApprovalSubmit(record: CrmRecordIntegrationContext & { title?: string }): void {
    if (!CRM_DEAL_ENTITY_KEYS.has(record.entityKey)) {
      return;
    }
    approvalSubmitContext.value = record;
    approvalSubmitVisible.value = true;
  }

  function onApprovalSubmitDialogClosed(): void {
    approvalSubmitVisible.value = false;
    approvalSubmitContext.value = null;
  }

  async function onApprovalSubmitted(): Promise<void> {
    onApprovalSubmitDialogClosed();
    recordRelatedPanelsRefreshToken.value += 1;
    await options.onRecordsChanged();
  }

  function openApprovalDecide(requestId: string): void {
    if (!integrationSurfaceRef.value?.hasEnabledBinding(CRM_APPROVAL_INTEGRATION_SLOTS.decide)) {
      return;
    }
    integrationRequestId.value = requestId;
    integrationSurfaceRef.value.openSlot(CRM_APPROVAL_INTEGRATION_SLOTS.decide);
  }

  function openLedgerPost(record: CrmRecordIntegrationContext): void {
    if (!CRM_DEAL_ENTITY_KEYS.has(record.entityKey)) {
      return;
    }
    ledgerPostContext.value = record;
    ledgerPostVisible.value = true;
  }

  function onLedgerPostDialogClosed(): void {
    ledgerPostVisible.value = false;
    ledgerPostContext.value = null;
  }

  function onLedgerPosted(): void {
    onLedgerPostDialogClosed();
    recordRelatedPanelsRefreshToken.value += 1;
  }

  function openLedgerAccountCreate(): void {
    if (!integrationSurfaceRef.value?.hasEnabledBinding(CRM_LEDGER_INTEGRATION_SLOTS.createAccount)) {
      return;
    }
    resetIntegrationIds();
    integrationSurfaceRef.value.openSlot(CRM_LEDGER_INTEGRATION_SLOTS.createAccount);
  }

  function hasEntitySlot(entityKey: string, mode: 'create' | 'edit' | 'delete'): boolean {
    const slot =
      mode === 'create'
        ? crmEntityCreateSlot(entityKey)
        : mode === 'edit'
          ? crmEntityEditSlot(entityKey)
          : crmEntityDeleteSlot(entityKey);
    return integrationSurfaceRef.value?.hasEnabledBinding(slot) ?? false;
  }

  async function onIntegrationSuccess(payload: { slot: string }): Promise<void> {
    resetIntegrationIds();
    if (payload.slot.startsWith('crm.') && payload.slot.includes('.create.dialog')) {
      await options.onRecordsChanged();
      return;
    }
    if (payload.slot.startsWith('crm.') && payload.slot.includes('.edit.dialog')) {
      await options.onRecordsChanged();
      return;
    }
    if (payload.slot.startsWith('crm.') && payload.slot.includes('.delete.dialog')) {
      await options.onRecordsChanged();
      return;
    }
    if (payload.slot.startsWith('crm.task.')) {
      recordRelatedPanelsRefreshToken.value += 1;
      await options.onRecordsChanged();
    }
    if (payload.slot.startsWith('crm.ticket.')) {
      recordRelatedPanelsRefreshToken.value += 1;
      await options.onRecordsChanged();
    }
    if (payload.slot.startsWith('crm.approval.')) {
      recordRelatedPanelsRefreshToken.value += 1;
    }
    if (payload.slot.startsWith('crm.ledger.')) {
      recordRelatedPanelsRefreshToken.value += 1;
    }
  }

  function onIntegrationCancel(): void {
    resetIntegrationIds();
  }

  return {
    integrationSurfaceRef,
    integrationContext,
    peerConnectorUrls,
    ensureDefaultTaskListId,
    openEntityCreate,
    openEntityEdit,
    openEntityDelete,
    openTaskCreateFromTasksTab,
    openTaskCreate,
    openTaskEdit,
    openTaskDelete,
    openTicketCreate,
    openTicketEdit,
    openTicketDelete,
    openApprovalSubmit,
    openApprovalDecide,
    openLedgerPost,
    openLedgerAccountCreate,
    hasIntegrationSlot,
    hasApprovalDecideIntegration,
    canSubmitApprovalForEntity,
    approvalSubmitVisible,
    approvalSubmitContext,
    onApprovalSubmitDialogClosed,
    onApprovalSubmitted,
    canPostLedgerForEntity,
    ledgerPostVisible,
    ledgerPostContext,
    onLedgerPostDialogClosed,
    onLedgerPosted,
    hasLedgerAccountCreateIntegration,
    hasEntitySlot,
    onIntegrationSuccess,
    onIntegrationCancel,
    recordRelatedPanelsRefreshToken,
  };
}
