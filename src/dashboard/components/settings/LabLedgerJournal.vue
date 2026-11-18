<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabLedgerAccountRecord, LabLedgerEntryRecord } from '@/shared/types/lab-ledger';
import {
  fetchLabLedgerAccounts,
  fetchLabLedgerEntries,
} from '@/shared/services/platform-lab-ledger.client';
import { useLabLedgerJournalLive } from '@/shared/composables/useLabLedgerJournalLive';
import PlatformCatalogIntegrationHost from '@/shared/integration/components/PlatformCatalogIntegrationHost.vue';
import { usePlatformCatalogIntegrationBridge } from '@/shared/integration/usePlatformCatalogIntegrationBridge';
import { LAB_LEDGER_ENTRY_DIALOG_SLOTS } from '@/shared/lab-integrations/platform-catalog-integration-services';
import {
  PLATFORM_LEDGER_APP_ID,
  PLATFORM_LEDGER_SURFACE,
} from '@/shared/lab-integrations/platform-catalog-manifests';

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const { hostRef, integrationContext, openIntegrationSlot } = usePlatformCatalogIntegrationBridge();

const accounts = ref<LabLedgerAccountRecord[]>([]);
const entries = ref<LabLedgerEntryRecord[]>([]);
const loading = ref(false);
const bindingHint = ref('');
const filterAccountId = ref<string | null>(null);
const filterMemo = ref('');
const expandedRows = ref<Record<string, boolean>>({});

const accountById = computed(() => {
  const map = new Map<string, LabLedgerAccountRecord>();
  for (const account of accounts.value) {
    map.set(account.id, account);
  }
  return map;
});

const accountFilterOptions = computed(() => [
  { label: 'All accounts', value: null },
  ...accounts.value
    .filter((a) => a.enabled)
    .map((a) => ({
      label: `${a.code} — ${a.name}`,
      value: a.id,
    })),
]);

const accountOptions = computed(() =>
  accounts.value
    .filter((a) => a.enabled)
    .map((a) => ({
      label: `${a.code} — ${a.name} (${formatMoney(a.balanceCents)})`,
      value: a.id,
    })),
);

const filteredEntries = computed(() => {
  const memoNeedle = filterMemo.value.trim().toLowerCase();
  return entries.value.filter((entry) => {
    if (filterAccountId.value) {
      const touches = entry.lines?.some((line) => line.accountId === filterAccountId.value);
      if (!touches) {
        return false;
      }
    }
    if (memoNeedle) {
      const memo = (entry.memo ?? '').toLowerCase();
      if (!memo.includes(memoNeedle)) {
        return false;
      }
    }
    return true;
  });
});

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

function accountLabel(accountId: string): string {
  const account = accountById.value.get(accountId);
  if (!account) {
    return accountId;
  }
  return `${account.code} — ${account.name}`;
}

function entrySummary(entry: LabLedgerEntryRecord): string {
  const lines = entry.lines ?? [];
  const parts = lines.map((line) => {
    const side = line.side === 'debit' ? 'Dr' : 'Cr';
    return `${side} ${accountLabel(line.accountId)} ${formatMoney(line.amountCents)}`;
  });
  return parts.join(' · ');
}

function entryTotalCents(entry: LabLedgerEntryRecord): number {
  return (entry.lines ?? [])
    .filter((line) => line.side === 'debit')
    .reduce((sum, line) => sum + line.amountCents, 0);
}

async function reload(): Promise<void> {
  loading.value = true;
  try {
    const { accounts: rows } = await fetchLabLedgerAccounts();
    accounts.value = rows;
    entries.value = await fetchLabLedgerEntries();
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
  void reload();
});

useLabLedgerJournalLive(() => reload());

function notifyMissingBinding(slot: string): void {
  bindingHint.value = `No Forms Builder binding for slot "${slot}". Restart the main backend after :3000 init or wire via lab_integrations_upsert_binding.`;
  toast.add({
    severity: 'warn',
    summary: 'Integration not wired',
    detail: bindingHint.value,
    life: 8000,
  });
}

function openPostEntry(): void {
  bindingHint.value = '';
  const preset: Record<string, unknown> = {};
  const debit = accountOptions.value[0]?.value;
  const credit = accountOptions.value[1]?.value ?? accountOptions.value[0]?.value;
  if (debit) {
    preset.debitAccountId = debit;
  }
  if (credit) {
    preset.creditAccountId = credit;
  }
  preset.amountDollars = 1;
  openIntegrationSlot(LAB_LEDGER_ENTRY_DIALOG_SLOTS.post, preset, () =>
    notifyMissingBinding(LAB_LEDGER_ENTRY_DIALOG_SLOTS.post),
  );
}

function onIntegrationSuccess(): void {
  bindingHint.value = '';
  void reload();
  hostRef.value?.refresh?.();
}
</script>

<template>
  <div class="lab-ledger-journal p-4 text-lab-general-text">
    <div class="lab-ledger-journal-charts mb-4">
      <PlatformCatalogIntegrationHost
        ref="hostRef"
        :host-app-id="PLATFORM_LEDGER_APP_ID"
        :surface-id="PLATFORM_LEDGER_SURFACE"
        :context="integrationContext"
        :inline-region-ids="['reports.journal']"
        @integration-success="onIntegrationSuccess"
      />
    </div>
    <Message v-if="bindingHint" severity="warn" class="mb-3">{{ bindingHint }}</Message>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-lg font-semibold text-lab-general-text">Financial ledger</h2>
        <p class="text-sm text-lab-general-text-muted">
          Posted transactions (balanced debit and credit lines). Manage the chart of accounts on the Accounts tab.
          Post new entries via Forms Builder.
        </p>
      </div>
      <Button
        :id="generateUniqueId('lab-ledger-post-open')"
        label="Post entry"
        icon="pi pi-plus"
        :disabled="accountOptions.length < 2"
        @click="openPostEntry"
      />
    </div>

    <div class="mb-3 flex flex-wrap items-end gap-3">
      <h3 class="mb-0 w-full font-medium text-lab-general-text sm:w-auto">Journal entries</h3>
      <div class="flex min-w-[12rem] flex-col gap-1">
        <label :for="generateUniqueId('lab-ledger-filter-account')" class="text-xs text-lab-general-text-muted">
          Account
        </label>
        <Select
          :input-id="generateUniqueId('lab-ledger-filter-account')"
          v-model="filterAccountId"
          :options="accountFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="All accounts"
          class="w-full"
        />
      </div>
      <div class="flex min-w-[12rem] flex-1 flex-col gap-1">
        <label :for="generateUniqueId('lab-ledger-filter-memo')" class="text-xs text-lab-general-text-muted">
          Search memo
        </label>
        <InputText
          :id="generateUniqueId('lab-ledger-filter-memo')"
          v-model="filterMemo"
          placeholder="Filter by memo text"
          class="w-full"
        />
      </div>
      <Button
        :id="generateUniqueId('lab-ledger-refresh')"
        label="Refresh"
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        :loading="loading"
        @click="reload"
      />
    </div>

    <DataTable
      v-model:expanded-rows="expandedRows"
      :value="filteredEntries"
      :loading="loading"
      data-key="id"
      size="small"
      class="lab-settings-data-table"
    >
      <Column expander style="width: 3rem" />
      <Column header="When">
        <template #body="{ data }">{{ formatWhen(data.occurredAt) }}</template>
      </Column>
      <Column field="memo" header="Memo" />
      <Column header="Amount">
        <template #body="{ data }">{{ formatMoney(entryTotalCents(data)) }}</template>
      </Column>
      <Column header="Posting">
        <template #body="{ data }">
          <span class="text-sm text-lab-general-text-muted">{{ entrySummary(data) }}</span>
        </template>
      </Column>
      <template #expansion="{ data }">
        <DataTable :value="data.lines ?? []" size="small" class="m-2">
          <Column header="Account">
            <template #body="{ data: line }">{{ accountLabel(line.accountId) }}</template>
          </Column>
          <Column header="Side">
            <template #body="{ data: line }">
              <span :class="line.side === 'debit' ? 'text-lab-general-text' : 'text-lab-general-text-muted'">
                {{ line.side === 'debit' ? 'Debit' : 'Credit' }}
              </span>
            </template>
          </Column>
          <Column header="Amount">
            <template #body="{ data: line }">{{ formatMoney(line.amountCents) }}</template>
          </Column>
        </DataTable>
      </template>
    </DataTable>
    <p
      v-if="!loading && entries.length > 0 && filteredEntries.length === 0"
      class="mt-2 text-sm text-lab-general-text-muted"
    >
      No journal entries match the current filters.
    </p>
  </div>
</template>
