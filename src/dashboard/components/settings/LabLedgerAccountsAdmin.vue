<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabLedgerAccountRecord } from '@/shared/types/lab-ledger';
import { deleteLabLedgerAccount, fetchLabLedgerAccounts } from '@/shared/services/platform-lab-ledger.client';
import PlatformCatalogIntegrationHost from '@/shared/integration/components/PlatformCatalogIntegrationHost.vue';
import { usePlatformCatalogIntegrationBridge } from '@/shared/integration/usePlatformCatalogIntegrationBridge';
import { LAB_LEDGER_ACCOUNT_DIALOG_SLOTS } from '@/shared/lab-integrations/platform-catalog-integration-services';
import {
  PLATFORM_LEDGER_APP_ID,
  PLATFORM_LEDGER_SURFACE,
} from '@/shared/lab-integrations/platform-catalog-manifests';
import { useLabShellUserRole } from '@/shared/composables/useLabShellUserRole';
import { isPlatformLedgerAccountAdmin } from '@/shared/utils/platform-ledger-permissions';
import type { UserRole } from '@/shared/types/user';
import LabRecordRowActions from '@/shared/ui/LabRecordRowActions.vue';

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const { hostRef, integrationContext, openIntegrationSlot } = usePlatformCatalogIntegrationBridge();
const shellUserRole = useLabShellUserRole();

const accounts = ref<LabLedgerAccountRecord[]>([]);
const bindingHint = ref('');
const canManageAccountsResolved = ref(false);
const platformRoleFromApi = ref<UserRole | undefined>();
const permissionsLoaded = ref(false);

const sessionRoleMismatch = computed(() => {
  const shell = shellUserRole.value;
  const api = platformRoleFromApi.value;
  return Boolean(shell && api && shell !== api);
});

const canManageAccounts = computed(() => {
  if (isPlatformLedgerAccountAdmin(shellUserRole.value ?? undefined)) {
    return true;
  }
  if (isPlatformLedgerAccountAdmin(platformRoleFromApi.value)) {
    return true;
  }
  return canManageAccountsResolved.value;
});

async function load(): Promise<void> {
  try {
    const result = await fetchLabLedgerAccounts();
    accounts.value = result.accounts;
    canManageAccountsResolved.value = result.canManageAccounts;
    platformRoleFromApi.value = result.platformRole;
    permissionsLoaded.value = true;
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: err instanceof Error ? err.message : 'Error',
      life: 6000,
    });
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
  if (!canManageAccounts.value) {
    return;
  }
  bindingHint.value = '';
  openIntegrationSlot(LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.create, {}, () =>
    notifyMissingBinding(LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.create),
  );
}

function openEdit(row: LabLedgerAccountRecord): void {
  if (!canManageAccounts.value) {
    return;
  }
  bindingHint.value = '';
  openIntegrationSlot(
    LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.edit,
    { accountId: row.id },
    () => notifyMissingBinding(LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.edit),
  );
}

function openDelete(row: LabLedgerAccountRecord): void {
  if (!canManageAccounts.value) {
    return;
  }
  bindingHint.value = '';
  openIntegrationSlot(
    LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.delete,
    { accountId: row.id },
    () => void removeDirect(row),
  );
}

async function removeDirect(row: LabLedgerAccountRecord): Promise<void> {
  if (!canManageAccounts.value) {
    return;
  }
  try {
    await deleteLabLedgerAccount(row.id);
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
  <div class="lab-ledger-accounts-admin p-4 text-lab-general-text">
    <PlatformCatalogIntegrationHost
      ref="hostRef"
      :host-app-id="PLATFORM_LEDGER_APP_ID"
      :surface-id="PLATFORM_LEDGER_SURFACE"
      :context="integrationContext"
      :inline-region-ids="[]"
      @integration-success="onIntegrationSuccess"
    />
    <Message v-if="bindingHint" severity="warn" class="mb-3">{{ bindingHint }}</Message>
    <Message
      v-if="sessionRoleMismatch"
      severity="warn"
      :closable="false"
      class="mb-3"
    >
      Your browser session role is <strong>{{ shellUserRole }}</strong> but the platform API sees
      <strong>{{ platformRoleFromApi }}</strong>. Sign out and sign in again to refresh your access
      token, then reload this tab.
    </Message>
    <Message
      v-else-if="permissionsLoaded && !canManageAccounts"
      severity="info"
      :closable="false"
      class="mb-3"
    >
      You can view accounts and balances. Only owners and admins can create or edit accounts.
      <span v-if="platformRoleFromApi">
        (Platform role for this request: <strong>{{ platformRoleFromApi }}</strong>.)
      </span>
    </Message>
    <div class="mb-4 flex justify-between gap-2">
      <h2 class="text-lg font-semibold">Ledger accounts</h2>
      <Button
        v-if="canManageAccounts"
        :id="generateUniqueId('lab-ledger-acct-create')"
        label="New account"
        icon="pi pi-plus"
        @click="openCreate"
      />
    </div>
    <DataTable :value="accounts" size="small" class="lab-settings-data-table">
      <Column field="code" header="Code" />
      <Column field="name" header="Name" />
      <Column field="type" header="Type" />
      <Column header="Balance">
        <template #body="{ data }">${{ (data.balanceCents / 100).toFixed(2) }}</template>
      </Column>
      <Column v-if="canManageAccounts" header="Actions">
        <template #body="{ data }">
          <LabRecordRowActions
            :record-id="data.id"
            :record-name="data.name"
            id-prefix="lab-ledger-acct"
            @edit="openEdit(data)"
            @delete="openDelete(data)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
