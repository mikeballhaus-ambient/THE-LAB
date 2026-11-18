<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useLabWorkspaceContext } from '@/shared/composables/useLabWorkspaceContext';
import type { LabApprovalRequestRecord } from '@/shared/types/lab-approval';
import {
  fetchLabApprovalInbox,
  fetchLabApprovalPolicies,
  fetchMyLabApprovalRequests,
} from '@/shared/services/platform-lab-approvals.client';
import PlatformCatalogIntegrationHost from '@/shared/integration/components/PlatformCatalogIntegrationHost.vue';
import { usePlatformCatalogIntegrationBridge } from '@/shared/integration/usePlatformCatalogIntegrationBridge';
import { LAB_APPROVAL_REQUEST_DIALOG_SLOTS } from '@/shared/lab-integrations/platform-catalog-integration-services';
import {
  PLATFORM_APPROVALS_APP_ID,
  PLATFORM_APPROVALS_SURFACE,
} from '@/shared/lab-integrations/platform-catalog-manifests';
import { CRM_APP_REGISTRY_ID } from '@/apps/lab-crm/shared/constants/app-scope';
import {
  canOpenCrmRecordFromApprovalRequest,
  stageCrmOpenFromApprovalRequest,
} from '@/shared/lab-integrations/open-crm-record-from-approval';
import { LAB_HOST_CTX_APPROVAL_OPEN_REQUEST_ID } from '@/shared/lab-integrations/lab-host-context-keys';
import { logNotificationDeepLink } from '@/shared/utils/lab-notification-deeplink-debug';
import { useLabApprovalsInboxLive } from '@/shared/composables/useLabApprovalsInboxLive';
import LabApprovalDecidePreviousActivity from './LabApprovalDecidePreviousActivity.vue';

const props = defineProps<{
  onFocusAppsWorkspace?: () => void;
  onLaunchApp?: (appId: string, appName: string) => void;
  onCloseHost?: () => void;
  crmAppDisplayName?: string;
}>();

const emit = defineEmits<{
  'focus-mode-change': [active: boolean];
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const labWorkspace = useLabWorkspaceContext();
const { hostRef, integrationContext, openIntegrationSlot } = usePlatformCatalogIntegrationBridge();

const inbox = ref<LabApprovalRequestRecord[]>([]);
const mine = ref<LabApprovalRequestRecord[]>([]);
const policyNameById = ref<Map<string, string>>(new Map());
const loading = ref(false);
const bindingHint = ref('');
const activeTab = ref<'inbox' | 'mine'>('inbox');

/** Bell “Review approval” — hide full inbox until the user chooses “All approvals”. */
const notificationFocusRequestId = ref<string | null>(null);

const isNotificationFocusView = computed(() => notificationFocusRequestId.value != null);

const focusedRequest = computed((): LabApprovalRequestRecord | null => {
  const id = notificationFocusRequestId.value;
  if (!id) {
    return null;
  }
  return inbox.value.find((row) => row.id === id) ?? mine.value.find((row) => row.id === id) ?? null;
});

function enterNotificationFocus(requestId: string): void {
  notificationFocusRequestId.value = requestId;
  activeTab.value = 'inbox';
  emit('focus-mode-change', true);
  logNotificationDeepLink('approvals: notification focus mode', { requestId });
}

function clearNotificationFocus(): void {
  notificationFocusRequestId.value = null;
  emit('focus-mode-change', false);
}

async function reload(): Promise<void> {
  loading.value = true;
  try {
    const [inboxRows, mineRows, policies] = await Promise.all([
      fetchLabApprovalInbox(),
      fetchMyLabApprovalRequests(),
      fetchLabApprovalPolicies(),
    ]);
    inbox.value = inboxRows;
    mine.value = mineRows;
    policyNameById.value = new Map(policies.map((policy) => [policy.id, policy.name]));
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: err instanceof Error ? err.message : 'Could not load approvals',
      life: 6000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void reload();
});

useLabApprovalsInboxLive(() => reload());

function tryOpenApprovalFromHostContext(): void {
  const requestId = labWorkspace?.hostContext.value[LAB_HOST_CTX_APPROVAL_OPEN_REQUEST_ID]?.trim();
  if (!requestId) {
    return;
  }
  enterNotificationFocus(requestId);
  logNotificationDeepLink('approvals: saw host context', {
    requestId,
    inboxCount: inbox.value.length,
    mineCount: mine.value.length,
  });
  const request =
    inbox.value.find((row) => row.id === requestId) ?? mine.value.find((row) => row.id === requestId);
  if (request) {
    openDecide(request);
    labWorkspace?.setHostContext({ [LAB_HOST_CTX_APPROVAL_OPEN_REQUEST_ID]: '' });
  }
}

watch(
  () => [labWorkspace?.hostContext.value[LAB_HOST_CTX_APPROVAL_OPEN_REQUEST_ID], inbox.value, mine.value] as const,
  () => {
    tryOpenApprovalFromHostContext();
  },
);

function notifyMissingBinding(slot: string): void {
  bindingHint.value = `No Forms Builder binding for slot "${slot}". Restart the main backend after :3000 init or wire via lab_integrations_upsert_binding.`;
  toast.add({
    severity: 'warn',
    summary: 'Integration not wired',
    detail: bindingHint.value,
    life: 8000,
  });
}

function openSubmit(): void {
  bindingHint.value = '';
  openIntegrationSlot(LAB_APPROVAL_REQUEST_DIALOG_SLOTS.submit, {}, () =>
    notifyMissingBinding(LAB_APPROVAL_REQUEST_DIALOG_SLOTS.submit),
  );
}

function openDecide(request: LabApprovalRequestRecord): void {
  bindingHint.value = '';
  openIntegrationSlot(
    LAB_APPROVAL_REQUEST_DIALOG_SLOTS.decide,
    { requestId: request.id },
    () => notifyMissingBinding(LAB_APPROVAL_REQUEST_DIALOG_SLOTS.decide),
  );
}

function openCrmRecord(request: LabApprovalRequestRecord): void {
  if (!canOpenCrmRecordFromApprovalRequest(request)) {
    toast.add({
      severity: 'info',
      summary: 'CRM record unavailable',
      detail: 'This request is not linked to a CRM sales or quote record.',
      life: 5000,
    });
    return;
  }
  if (!stageCrmOpenFromApprovalRequest(labWorkspace, request)) {
    return;
  }
  props.onCloseHost?.();
  props.onFocusAppsWorkspace?.();
  const displayName = props.crmAppDisplayName?.trim() || 'CRM';
  props.onLaunchApp?.(CRM_APP_REGISTRY_ID, displayName);
}

function onIntegrationSuccess(): void {
  bindingHint.value = '';
  void reload();
  hostRef.value?.refresh?.();
}

function policyDisplayName(request: LabApprovalRequestRecord): string {
  return policyNameById.value.get(request.policyId) ?? 'Unknown policy';
}
</script>

<template>
  <div class="lab-approvals-inbox p-4 text-lab-general-text">
    <PlatformCatalogIntegrationHost
      ref="hostRef"
      :host-app-id="PLATFORM_APPROVALS_APP_ID"
      :surface-id="PLATFORM_APPROVALS_SURFACE"
      :context="integrationContext"
      @integration-success="onIntegrationSuccess"
    >
      <template #dialog-accessory="{ slotId, context }">
        <LabApprovalDecidePreviousActivity :slot-id="slotId" :context="context" />
      </template>
    </PlatformCatalogIntegrationHost>
    <Message v-if="bindingHint" severity="warn" class="mb-3">{{ bindingHint }}</Message>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-lg font-semibold">
          {{ isNotificationFocusView ? 'Review approval' : 'Approvals' }}
        </h2>
        <p class="text-sm text-lab-general-text-muted">
          {{
            isNotificationFocusView
              ? 'This request was shared with you — decide below or view its details.'
              : 'Multi-step approval requests on the platform backend. Submit and decide via Forms Builder slots.'
          }}
        </p>
      </div>
      <Button
        v-if="isNotificationFocusView"
        :id="generateUniqueId('lab-approvals-show-all')"
        label="All approvals"
        icon="pi pi-list"
        severity="secondary"
        @click="clearNotificationFocus"
      />
      <Button
        v-else
        :id="generateUniqueId('lab-approvals-submit-open')"
        label="Submit request"
        icon="pi pi-plus"
        @click="openSubmit"
      />
    </div>

    <p
      v-if="isNotificationFocusView && !loading && !focusedRequest"
      class="text-sm text-lab-general-text-muted m-0 mb-3 flex flex-wrap items-center gap-2"
    >
      That approval request is no longer available.
      <Button
        label="All approvals"
        size="small"
        severity="secondary"
        :id="generateUniqueId('lab-approvals-focus-missing-all')"
        @click="clearNotificationFocus"
      />
    </p>

    <DataTable
      v-if="isNotificationFocusView"
      :value="focusedRequest ? [focusedRequest] : []"
      :loading="loading"
      size="small"
      class="mb-2"
    >
      <Column field="title" header="Title" />
      <Column field="status" header="Status" />
      <Column header="Policy">
        <template #body="{ data }">
          <span
            class="lab-approvals-inbox__policy-badge inline-block max-w-[14rem] truncate rounded-md border border-lab-general-border/70 bg-lab-general-bg/50 px-2 py-0.5 text-xs font-medium text-lab-general-text-muted"
            :title="policyDisplayName(data)"
          >
            {{ policyDisplayName(data) }}
          </span>
        </template>
      </Column>
      <Column header="Subject">
        <template #body="{ data }">
          {{ data.subjectAppId }} / {{ data.subjectEntityType }} / {{ data.subjectEntityId }}
        </template>
      </Column>
      <Column header="Actions">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="canOpenCrmRecordFromApprovalRequest(data)"
              :id="generateUniqueId(`lab-approvals-view-crm-${data.id}`)"
              label="View CRM record"
              size="small"
              severity="secondary"
              icon="pi pi-external-link"
              @click="openCrmRecord(data)"
            />
            <Button
              v-if="data.status === 'pending'"
              :id="generateUniqueId(`lab-approvals-decide-${data.id}`)"
              label="Decide"
              size="small"
              @click="openDecide(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Tabs
      v-else
      v-model:value="activeTab"
      class="lab-platform-catalog-tabs"
      :pt="{ root: { attrs: { id: generateUniqueId('lab-approvals-tabs') } } }"
    >
      <TabList>
        <Tab value="inbox">Inbox</Tab>
        <Tab value="mine">My requests</Tab>
      </TabList>
      <TabPanels>
      <TabPanel value="inbox">
        <DataTable :value="inbox" :loading="loading" size="small">
          <Column field="title" header="Title" />
          <Column field="status" header="Status" />
          <Column header="Policy">
            <template #body="{ data }">
              <span
                class="lab-approvals-inbox__policy-badge inline-block max-w-[14rem] truncate rounded-md border border-lab-general-border/70 bg-lab-general-bg/50 px-2 py-0.5 text-xs font-medium text-lab-general-text-muted"
                :title="policyDisplayName(data)"
              >
                {{ policyDisplayName(data) }}
              </span>
            </template>
          </Column>
          <Column header="Subject">
            <template #body="{ data }">
              {{ data.subjectAppId }} / {{ data.subjectEntityType }} / {{ data.subjectEntityId }}
            </template>
          </Column>
          <Column header="Actions">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-2">
                <Button
                  v-if="canOpenCrmRecordFromApprovalRequest(data)"
                  :id="generateUniqueId(`lab-approvals-view-crm-${data.id}`)"
                  label="View CRM record"
                  size="small"
                  severity="secondary"
                  icon="pi pi-external-link"
                  @click="openCrmRecord(data)"
                />
                <Button
                  v-if="data.status === 'pending'"
                  :id="generateUniqueId(`lab-approvals-decide-${data.id}`)"
                  label="Decide"
                  size="small"
                  @click="openDecide(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>
      <TabPanel value="mine">
        <DataTable :value="mine" :loading="loading" size="small">
          <Column field="title" header="Title" />
          <Column field="status" header="Status" />
          <Column header="Policy">
            <template #body="{ data }">
              <span
                class="lab-approvals-inbox__policy-badge inline-block max-w-[14rem] truncate rounded-md border border-lab-general-border/70 bg-lab-general-bg/50 px-2 py-0.5 text-xs font-medium text-lab-general-text-muted"
                :title="policyDisplayName(data)"
              >
                {{ policyDisplayName(data) }}
              </span>
            </template>
          </Column>
          <Column field="currentStepIndex" header="Step" />
        </DataTable>
      </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
