<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabApprovalPolicyRecord } from '@/shared/types/lab-approval';
import {
  deleteLabApprovalPolicy,
  fetchLabApprovalPolicies,
} from '@/shared/services/platform-lab-approvals.client';
import PlatformCatalogIntegrationHost from '@/shared/integration/components/PlatformCatalogIntegrationHost.vue';
import { usePlatformCatalogIntegrationBridge } from '@/shared/integration/usePlatformCatalogIntegrationBridge';
import { LAB_APPROVAL_POLICY_DIALOG_SLOTS } from '@/shared/lab-integrations/platform-catalog-integration-services';
import {
  PLATFORM_APPROVALS_APP_ID,
  PLATFORM_APPROVALS_SURFACE,
} from '@/shared/lab-integrations/platform-catalog-manifests';
import LabRecordRowActions from '@/shared/ui/LabRecordRowActions.vue';
import { labRecordActionRootAttrs } from '@/shared/constants/lab-record-automation';

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const { hostRef, integrationContext, openIntegrationSlot } = usePlatformCatalogIntegrationBridge();

const policies = ref<LabApprovalPolicyRecord[]>([]);
const loading = ref(false);
const bindingHint = ref('');

async function load(): Promise<void> {
  loading.value = true;
  try {
    policies.value = await fetchLabApprovalPolicies();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: err instanceof Error ? err.message : 'Error',
      life: 6000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function notifyMissingBinding(slot: string): void {
  bindingHint.value = `No Forms Builder binding for slot "${slot}". Restart the main backend after :3000 init or wire via lab_integrations_upsert_binding.`;
  toast.add({
    severity: 'warn',
    summary: 'Integration not wired',
    detail: bindingHint.value,
    life: 8000,
  });
}

function openCreate(): void {
  bindingHint.value = '';
  openIntegrationSlot(LAB_APPROVAL_POLICY_DIALOG_SLOTS.create, {}, () =>
    notifyMissingBinding(LAB_APPROVAL_POLICY_DIALOG_SLOTS.create),
  );
}

function openEdit(policy: LabApprovalPolicyRecord): void {
  bindingHint.value = '';
  openIntegrationSlot(
    LAB_APPROVAL_POLICY_DIALOG_SLOTS.edit,
    { policyId: policy.id },
    () => notifyMissingBinding(LAB_APPROVAL_POLICY_DIALOG_SLOTS.edit),
  );
}

function openDelete(policy: LabApprovalPolicyRecord): void {
  bindingHint.value = '';
  openIntegrationSlot(
    LAB_APPROVAL_POLICY_DIALOG_SLOTS.delete,
    { policyId: policy.id },
    () => void removeDirect(policy),
  );
}

async function removeDirect(policy: LabApprovalPolicyRecord): Promise<void> {
  try {
    await deleteLabApprovalPolicy(policy.id);
    await load();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: err instanceof Error ? err.message : 'Error',
      life: 6000,
    });
  }
}

function onIntegrationSuccess(): void {
  bindingHint.value = '';
  void load();
  hostRef.value?.refresh?.();
}
</script>

<template>
  <div class="lab-approval-policies p-4 text-lab-general-text">
    <PlatformCatalogIntegrationHost
      ref="hostRef"
      :host-app-id="PLATFORM_APPROVALS_APP_ID"
      :surface-id="PLATFORM_APPROVALS_SURFACE"
      :context="integrationContext"
      @integration-success="onIntegrationSuccess"
    />
    <Message v-if="bindingHint" severity="warn" class="mb-3">{{ bindingHint }}</Message>
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-lab-general-text">Approval policies (admin)</h2>
      <Button
        :id="generateUniqueId('lab-approval-policies-create')"
        label="New policy"
        icon="pi pi-plus"
        :pt="{
          root: {
            attrs: labRecordActionRootAttrs('create', 'new', 'New policy'),
          },
        }"
        @click="openCreate"
      />
    </div>
    <DataTable :value="policies" :loading="loading" size="small">
      <Column field="name" header="Name" />
      <Column field="enabled" header="Enabled">
        <template #body="{ data }">{{ data.enabled ? 'Yes' : 'No' }}</template>
      </Column>
      <Column header="Steps">
        <template #body="{ data }">{{ data.definition?.steps?.length ?? 0 }}</template>
      </Column>
      <Column header="Actions">
        <template #body="{ data }">
          <LabRecordRowActions
            :record-id="data.id"
            :record-name="data.name"
            id-prefix="lab-approval-policies"
            @edit="openEdit(data)"
            @delete="openDelete(data)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
