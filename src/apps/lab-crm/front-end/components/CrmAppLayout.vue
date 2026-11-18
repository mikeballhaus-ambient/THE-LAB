<script setup lang="ts">
import { toRef } from 'vue';
import Button from 'primevue/button';
import { LabIntegrationSurface } from '@/shared/integration';
import { CRM_APP_REGISTRY_ID } from '../../shared/constants/app-scope';
import EntityRecordsView from './EntityRecordsView.vue';
import CrmIntegrationDialogRelatedAccessory from './CrmIntegrationDialogRelatedAccessory.vue';
import LabApprovalDecidePreviousActivity from '@/dashboard/components/settings/LabApprovalDecidePreviousActivity.vue';
import { isApprovalRequestDecideSlot } from '@/shared/lab-integrations/approval-request-form-stub-filter';
import CrmTasksView from './CrmTasksView.vue';
import CrmDashboard from './CrmDashboard.vue';
import CrmSettingsDialog from './CrmSettingsDialog.vue';
import CrmApprovalSubmitDialog from './CrmApprovalSubmitDialog.vue';
import CrmLedgerPostDialog from './CrmLedgerPostDialog.vue';
import { entityIconForPrimeButton } from '../../shared/utils/entity-icon';
import { useCrmAppShell } from '../composables/useCrmAppShell';

const props = defineProps<{
  serverUrl?: string;
}>();

const {
  generateUniqueId,
  serverUrl,
  peerUrlsLoading,
  peerUrlsError,
  refreshPeerUrls,
  taskListServerUrl,
  helpDeskServerUrl,
  definitions,
  activeView,
  showSettings,
  settingsDialogRef,
  entityNavItems,
  activeEntityKey,
  pendingOpenRecordId,
  pendingOpenRecordReadOnly,
  clearPendingOpenReadOnly,
  dashboardRef,
  selectDashboard,
  selectTasks,
  selectEntity,
  openSettings,
  openAddNewEntity,
  loadMeta,
  integrationSurfaceRef,
  integrationContext,
  peerConnectorUrls,
  integrationInlineRegionIds,
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
  hasApprovalDecideIntegration,
  canSubmitApprovalForEntity,
  approvalSubmitVisible,
  approvalSubmitContext,
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
} = useCrmAppShell(toRef(props, 'serverUrl'));
</script>

<template>
  <div
    class="crm-app lab-app-workspace-fill app-loaded-container text-lab-general-text w-full min-w-0 min-h-full h-full flex flex-col overflow-hidden"
    :id="generateUniqueId('crm-app-root')"
  >
    <header class="crm-app-header lab-app-header" :id="generateUniqueId('crm-app-header')">
      <div>
        <h1 :id="generateUniqueId('crm-title')" class="text-2xl font-semibold m-0 text-lab-general-text">CRM</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">Pipeline, service, and customer records</p>
      </div>
      <Button
        label="Settings"
        icon="pi pi-cog"
        severity="secondary"
        outlined
        size="small"
        class="shrink-0"
        :pt="{ root: { attrs: { id: generateUniqueId('crm-settings-btn') } } }"
        @click="openSettings"
      />
    </header>

    <div v-if="!serverUrl" class="text-amber-300 p-4 md:p-6">CRM server URL is not configured.</div>
    <div v-else-if="peerUrlsLoading" class="text-lab-general-text p-4 md:p-6">Loading dependency app URLs…</div>
    <div v-else-if="peerUrlsError" class="text-amber-300 p-4 md:p-6 space-y-2">
      <p>Could not load dependency app URLs from THE-LAB (port 3000): {{ peerUrlsError }}</p>
      <Button
        label="Retry"
        icon="pi pi-refresh"
        size="small"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('crm-peer-urls-retry') } } }"
        @click="refreshPeerUrls()"
      />
    </div>
    <div v-else-if="!taskListServerUrl" class="text-amber-300 p-4 md:p-6">
      Task List URL is not configured. Ensure `app-lab-tasklist` is registered and enabled, then launch it as a CRM dependency.
    </div>

    <div v-else class="crm-app-body flex flex-1 min-h-0 w-full min-w-0">
      <aside
        class="crm-sidebar w-52 shrink-0 p-3 flex flex-col gap-1 border-r border-lab-general-border bg-[color-mix(in_srgb,var(--lab-general-bg)_90%,var(--lab-prime-surface-100))]"
        :id="generateUniqueId('crm-sidebar')"
      >
        <Button
          label="Dashboard"
          icon="pi pi-home"
          size="small"
          class="w-full justify-start!"
          :severity="activeView === 'dashboard' ? 'primary' : 'secondary'"
          :outlined="activeView !== 'dashboard'"
          :pt="{ root: { attrs: { id: generateUniqueId('crm-nav-dashboard') } } }"
          @click="selectDashboard"
        />
        <Button
          label="Tasks"
          icon="pi pi-check-square"
          size="small"
          class="w-full justify-start!"
          :severity="activeView === 'tasks' ? 'primary' : 'secondary'"
          :outlined="activeView !== 'tasks'"
          :pt="{ root: { attrs: { id: generateUniqueId('crm-nav-tasks') } } }"
          @click="selectTasks"
        />
        <Button
          label="Add new entity"
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          text
          class="w-full justify-start! crm-nav-add-entity-btn mt-1"
          :pt="{ root: { attrs: { id: generateUniqueId('crm-nav-add-entity') } } }"
          @click="openAddNewEntity"
        />
        <p class="text-[0.65rem] uppercase tracking-[0.06em] px-2 pt-3 pb-1 m-0 font-semibold text-lab-general-text-muted">
          Entities
        </p>
        <Button
          v-for="def in entityNavItems"
          :key="def.entityKey"
          size="small"
          class="w-full justify-start! text-left!"
          :severity="activeView === def.entityKey ? 'primary' : 'secondary'"
          :outlined="activeView !== def.entityKey"
          :icon="entityIconForPrimeButton(def.icon)"
          :label="def.name"
          :pt="{
            root: { attrs: { id: generateUniqueId(`crm-nav-entity-${def.entityKey}`) } },
            label: { class: 'truncate' },
          }"
          @click="selectEntity(def.entityKey)"
        />
      </aside>

      <main
        class="crm-main lab-app-body flex-1 min-w-0 flex flex-col min-h-0"
        :id="generateUniqueId('crm-main-content')"
      >
        <div class="flex-1 min-h-0 overflow-auto flex flex-col min-w-0">
        <CrmDashboard
          v-if="activeView === 'dashboard'"
          ref="dashboardRef"
          :server-url="serverUrl"
          :definitions="definitions"
          :task-list-server-url="taskListServerUrl"
        />
        <CrmTasksView
          v-else-if="activeView === 'tasks'"
          :task-list-server-url="taskListServerUrl"
          @open-create="openTaskCreateFromTasksTab()"
          @open-edit="openTaskEdit"
        />
        <EntityRecordsView
          v-else-if="activeEntityKey"
          :key="activeEntityKey"
          :server-url="serverUrl"
          :entity-key="activeEntityKey"
          :open-record-id="pendingOpenRecordId"
          :record-view-read-only="pendingOpenRecordReadOnly"
          :task-list-server-url="taskListServerUrl || undefined"
          :help-desk-server-url="helpDeskServerUrl || undefined"
          :related-panels-refresh-token="recordRelatedPanelsRefreshToken"
          :has-create-slot="hasEntitySlot(activeEntityKey!, 'create')"
          :has-edit-slot="hasEntitySlot(activeEntityKey!, 'edit')"
          :has-delete-slot="hasEntitySlot(activeEntityKey!, 'delete')"
          @create="openEntityCreate(activeEntityKey!)"
          @edit="(payload) => openEntityEdit(activeEntityKey!, payload.recordId, payload)"
          @delete="(recordId) => openEntityDelete(activeEntityKey!, recordId)"
          @open-task-create="openTaskCreate"
          @open-task-edit="openTaskEdit"
          @open-task-delete="openTaskDelete"
          @open-ticket-create="openTicketCreate"
          @open-ticket-edit="openTicketEdit"
          @open-ticket-delete="openTicketDelete"
          @open-approval-submit="openApprovalSubmit"
          @open-approval-decide="openApprovalDecide"
          @open-ledger-post="openLedgerPost"
          @open-ledger-create-account="openLedgerAccountCreate"
          @open-record-consumed="pendingOpenRecordId = null"
          @view-dialog-closed="clearPendingOpenReadOnly()"
          :show-approval-submit="canSubmitApprovalForEntity(activeEntityKey!)"
          :show-approval-decide-integration="hasApprovalDecideIntegration"
          :show-ledger-integration="canPostLedgerForEntity(activeEntityKey!)"
          :show-ledger-account-create="hasLedgerAccountCreateIntegration"
        />

        <LabIntegrationSurface
          v-if="serverUrl"
          ref="integrationSurfaceRef"
          :host-app-id="CRM_APP_REGISTRY_ID"
          surface-id="crm.workspace"
          :server-url="serverUrl"
          :peer-connector-urls="peerConnectorUrls"
          :context="integrationContext"
          :inline-region-ids="integrationInlineRegionIds"
          class="crm-integration-surface px-4 pb-6 pt-2 min-w-0"
          @integration-success="onIntegrationSuccess"
          @integration-cancel="onIntegrationCancel"
        >
          <template #dialog-accessory="{ slotId, context }">
            <LabApprovalDecidePreviousActivity
              v-if="isApprovalRequestDecideSlot(slotId)"
              :slot-id="slotId"
              :context="context"
            />
            <CrmIntegrationDialogRelatedAccessory
              v-else
              :slot-id="slotId"
              :context="context"
              :task-list-server-url="taskListServerUrl || undefined"
              :help-desk-server-url="helpDeskServerUrl || undefined"
              :refresh-token="recordRelatedPanelsRefreshToken"
              @open-task-create="openTaskCreate"
              @open-task-edit="openTaskEdit"
              @open-ticket-create="openTicketCreate"
              @open-ticket-edit="openTicketEdit"
              @open-approval-submit="openApprovalSubmit"
              @open-approval-decide="openApprovalDecide"
              @open-ledger-post="openLedgerPost"
              @open-ledger-create-account="openLedgerAccountCreate"
              :show-approval-submit="canSubmitApprovalForEntity(String(context.entityKey ?? ''))"
              :show-approval-decide-integration="hasApprovalDecideIntegration"
              :show-ledger-integration="canPostLedgerForEntity(String(context.entityKey ?? ''))"
              :show-ledger-account-create="hasLedgerAccountCreateIntegration"
            />
          </template>
        </LabIntegrationSurface>
        </div>
      </main>
    </div>

    <CrmSettingsDialog
      v-if="serverUrl"
      ref="settingsDialogRef"
      v-model:visible="showSettings"
      :server-url="serverUrl"
      @changed="loadMeta"
    />
    <CrmApprovalSubmitDialog
      v-if="serverUrl"
      :server-url="serverUrl"
      v-model:visible="approvalSubmitVisible"
      :context="approvalSubmitContext"
      @submitted="onApprovalSubmitted"
    />
    <CrmLedgerPostDialog
      v-if="serverUrl"
      :server-url="serverUrl"
      v-model:visible="ledgerPostVisible"
      :context="ledgerPostContext"
      @update:visible="(v) => { if (!v) onLedgerPostDialogClosed(); }"
      @posted="onLedgerPosted"
    />
  </div>
</template>

<style scoped>
.crm-sidebar :deep(.p-button) {
  justify-content: flex-start;
}

.crm-sidebar :deep(.p-button.p-button-outlined) {
  color: var(--lab-general-text) !important;
  border-color: color-mix(in srgb, var(--lab-general-border) 85%, transparent) !important;
}

.crm-sidebar :deep(.p-button.p-button-outlined .p-button-label) {
  color: var(--lab-general-text) !important;
}

.crm-sidebar :deep(.p-button.p-button-outlined:not(:disabled):hover) {
  background: color-mix(in srgb, var(--lab-button-outlined-bg-hover) 80%, var(--lab-general-bg)) !important;
  border-color: var(--lab-button-outlined-border) !important;
}

.crm-sidebar :deep(.p-button.p-button-text) {
  color: var(--lab-button-outlined-text) !important;
}

.crm-nav-add-entity-btn :deep(.p-button-label) {
  font-weight: 500;
}

.crm-integration-surface:empty {
  display: none;
}
</style>
