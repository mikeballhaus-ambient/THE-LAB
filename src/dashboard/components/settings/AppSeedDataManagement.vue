<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type {
  AppSeedBulkAction,
  AppSeedBulkOperationResult,
  AppSeedDataOverviewEntry,
  AppSeedPackManifest,
} from '@/shared/types/app/app-seed-data';
import type { User } from '@/shared/types';

const { generateUniqueId } = useUniqueElementId();

const props = defineProps<{
  user: User | null;
}>();

const reloadBtnId = generateUniqueId('seed-data-reload');
const bulkRemoveBtnId = generateUniqueId('seed-data-bulk-remove-demo');
const bulkApplyBtnId = generateUniqueId('seed-data-bulk-apply-demo');
const bulkRepairBtnId = generateUniqueId('seed-data-bulk-repair-infra');
const confirmDialogId = generateUniqueId('seed-data-confirm-dialog');
const confirmCancelBtnId = generateUniqueId('seed-data-confirm-cancel');
const confirmAcceptBtnId = generateUniqueId('seed-data-confirm-accept');
const loading = ref(false);
const confirmVisible = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAcceptLabel = ref('Confirm');
const confirmAcceptSeverity = ref<'danger' | 'secondary' | 'help' | 'contrast'>('secondary');
let pendingConfirmAction: (() => void) | null = null;
const actingPack = ref<string | null>(null);
const bulkAction = ref<string | null>(null);
const errorMessage = ref('');
const successMessage = ref('');
const overview = ref<AppSeedDataOverviewEntry[]>([]);

const isAdmin = computed(() => props.user?.role === 'owner' || props.user?.role === 'admin');

interface TableRow {
  appId: string;
  appName: string;
  pack: AppSeedPackManifest;
  present: boolean;
  rowCount?: number;
  message?: string;
  serverReachable?: boolean;
}

const rows = computed((): TableRow[] => {
  const out: TableRow[] = [];
  for (const entry of overview.value) {
    for (const pack of entry.manifest.packs) {
      const status = entry.status.find((s) => s.packId === pack.packId);
      out.push({
        appId: entry.manifest.appId,
        appName: entry.manifest.appName,
        pack,
        present: status?.present ?? false,
        rowCount: status?.rowCount,
        message: status?.message,
        serverReachable: status?.serverReachable,
      });
    }
  }
  return out;
});

async function loadOverview(): Promise<void> {
  if (!isAdmin.value) {
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    const base = resolvePlatformBackendUrlForClient();
    const response = await fetch(`${base}/api/platform/apps/seed-data`, labPlatformFetchInit());
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }
    overview.value = body.data as AppSeedDataOverviewEntry[];
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load demo data status';
  } finally {
    loading.value = false;
  }
}

function openConfirmDialog(options: {
  title: string;
  message: string;
  acceptLabel: string;
  acceptSeverity?: 'danger' | 'secondary' | 'help' | 'contrast';
  onAccept: () => void;
}): void {
  confirmTitle.value = options.title;
  confirmMessage.value = options.message;
  confirmAcceptLabel.value = options.acceptLabel;
  confirmAcceptSeverity.value = options.acceptSeverity ?? 'secondary';
  pendingConfirmAction = options.onAccept;
  confirmVisible.value = true;
}

function cancelConfirmDialog(): void {
  confirmVisible.value = false;
  pendingConfirmAction = null;
}

function acceptConfirmDialog(): void {
  const action = pendingConfirmAction;
  confirmVisible.value = false;
  pendingConfirmAction = null;
  action?.();
}

function requestPackAction(
  appName: string,
  packLabel: string,
  appId: string,
  packId: string,
  action: 'apply' | 'remove',
): void {
  if (action === 'apply') {
    void runAction(appId, packId, action);
    return;
  }
  openConfirmDialog({
    title: `Remove ${packLabel}`,
    message: `Remove demo data pack "${packLabel}" from ${appName}? This cannot be undone for rows removed by this pack.`,
    acceptLabel: 'Remove',
    acceptSeverity: 'danger',
    onAccept: () => {
      void runAction(appId, packId, action);
    },
  });
}

function requestBulkAction(action: AppSeedBulkAction): void {
  const copy: Record<AppSeedBulkAction, { title: string; message: string; acceptLabel: string; severity: 'danger' | 'secondary' | 'help' }> = {
    'remove-demo': {
      title: 'Remove all demo data',
      message:
        'Remove all demo-tier packs (lab demo users, CRM, Task List, Help Desk)? Infrastructure seeds are not touched. Removed rows cannot be restored except by re-applying demo packs.',
      acceptLabel: 'Remove all',
      severity: 'danger',
    },
    'apply-demo': {
      title: 'Restore all demo data',
      message: 'Re-apply all demo-tier packs across the platform and apps?',
      acceptLabel: 'Restore all',
      severity: 'secondary',
    },
    'repair-infrastructure': {
      title: 'Repair infrastructure seeds',
      message:
        'Repair infrastructure seeds (Chart Builder samples and Forms Builder platform forms)? Demo data is not changed.',
      acceptLabel: 'Repair',
      severity: 'help',
    },
  };
  const c = copy[action];
  openConfirmDialog({
    title: c.title,
    message: c.message,
    acceptLabel: c.acceptLabel,
    acceptSeverity: c.severity,
    onAccept: () => {
      void runBulk(action);
    },
  });
}

async function runAction(appId: string, packId: string, action: 'apply' | 'remove'): Promise<void> {
  actingPack.value = `${appId}:${packId}:${action}`;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const base = resolvePlatformBackendUrlForClient();
    const response = await fetch(
      `${base}/api/platform/apps/${appId}/seed-data/${packId}/${action}`,
      labPlatformFetchInit({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      }),
    );
    const body = await response.json();
    if (!response.ok || body.success === false) {
      throw new Error(body.content ?? body.error ?? `HTTP ${response.status}`);
    }
    successMessage.value = body.content ?? 'Done.';
    await loadOverview();
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Action failed';
  } finally {
    actingPack.value = null;
  }
}

async function runBulk(action: AppSeedBulkAction): Promise<void> {
  bulkAction.value = action;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const base = resolvePlatformBackendUrlForClient();
    const response = await fetch(
      `${base}/api/platform/apps/seed-data/bulk/${action}`,
      labPlatformFetchInit({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      }),
    );
    const body = (await response.json()) as AppSeedBulkOperationResult;
    if (!response.ok && response.status !== 207) {
      throw new Error(body.content ?? `HTTP ${response.status}`);
    }
    const failed = body.results?.filter((r) => !r.success && !r.skipped) ?? [];
    const skipped = body.results?.filter((r) => r.skipped) ?? [];
    if (failed.length > 0) {
      errorMessage.value = `${body.content} Failures: ${failed.map((f) => `${f.appId}/${f.packId}`).join(', ')}`;
    } else {
      successMessage.value = body.content;
      if (skipped.length > 0) {
        successMessage.value += ` Launch stopped apps and run again for: ${skipped.map((s) => s.appId).join(', ')}.`;
      }
    }
    await loadOverview();
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Bulk action failed';
  } finally {
    bulkAction.value = null;
  }
}

function tierSeverity(tier: string): 'info' | 'warn' | 'success' {
  if (tier === 'infrastructure') {
    return 'info';
  }
  return 'warn';
}

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <div class="flex flex-col gap-4 h-full min-h-0">
    <div class="flex items-center justify-between gap-4">
      <p class="text-lab-general-text text-sm m-0">
        Manage demo data across the platform and apps. Infrastructure packs (Chart Builder, Forms Builder) can be
        repaired with Apply but not removed.
      </p>
      <div class="flex flex-wrap gap-2 shrink-0">
        <Button
          :id="bulkRemoveBtnId"
          type="button"
          label="Remove all demo data"
          size="small"
          severity="danger"
          outlined
          :loading="bulkAction === 'remove-demo'"
          :disabled="loading || bulkAction !== null"
          @click="requestBulkAction('remove-demo')"
        />
        <Button
          :id="bulkApplyBtnId"
          type="button"
          label="Restore all demo data"
          size="small"
          severity="secondary"
          :loading="bulkAction === 'apply-demo'"
          :disabled="loading || bulkAction !== null"
          @click="requestBulkAction('apply-demo')"
        />
        <Button
          :id="bulkRepairBtnId"
          type="button"
          label="Repair infrastructure"
          size="small"
          severity="help"
          outlined
          :loading="bulkAction === 'repair-infrastructure'"
          :disabled="loading || bulkAction !== null"
          @click="requestBulkAction('repair-infrastructure')"
        />
        <Button
          :id="reloadBtnId"
          type="button"
          label="Refresh"
          icon="fa fa-rotate"
          size="small"
          severity="secondary"
          :loading="loading"
          :disabled="bulkAction !== null"
          @click="loadOverview"
        />
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
    <Message v-if="successMessage" severity="success" :closable="false">{{ successMessage }}</Message>

    <DataTable
      :value="rows"
      size="small"
      striped-rows
      class="text-sm"
      :pt="{ root: { class: 'flex-1 min-h-0' } }"
    >
      <Column field="appName" header="App" />
      <Column header="Pack">
        <template #body="{ data }">
          <div class="flex flex-col">
            <span class="font-medium">{{ data.pack.label }}</span>
            <span class="text-lab-general-text-muted text-xs">{{ data.pack.packId }}</span>
          </div>
        </template>
      </Column>
      <Column header="Tier">
        <template #body="{ data }">
          <Tag :severity="tierSeverity(data.pack.tier)" :value="data.pack.tier" />
        </template>
      </Column>
      <Column header="Status">
        <template #body="{ data }">
          <Tag :severity="data.present ? 'success' : 'secondary'" :value="data.present ? 'Present' : 'Not present'" />
          <span v-if="data.rowCount != null" class="text-lab-general-text-muted text-xs ml-2">({{ data.rowCount }})</span>
          <p v-if="data.message" class="text-lab-general-text-muted text-xs m-0 mt-1">{{ data.message }}</p>
        </template>
      </Column>
      <Column header="Actions">
        <template #body="{ data }">
          <div class="flex gap-2 flex-wrap">
            <Button
              type="button"
              label="Apply"
              size="small"
              :loading="actingPack === `${data.appId}:${data.pack.packId}:apply`"
              :pt="{ root: { attrs: { id: generateUniqueId(`seed-apply-${data.appId}-${data.pack.packId}`) } } }"
              @click="requestPackAction(data.appName, data.pack.label, data.appId, data.pack.packId, 'apply')"
            />
            <Button
              v-if="data.pack.allowRemove"
              type="button"
              label="Remove"
              size="small"
              severity="danger"
              outlined
              :loading="actingPack === `${data.appId}:${data.pack.packId}:remove`"
              :pt="{ root: { attrs: { id: generateUniqueId(`seed-remove-${data.appId}-${data.pack.packId}`) } } }"
              @click="requestPackAction(data.appName, data.pack.label, data.appId, data.pack.packId, 'remove')"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="confirmVisible"
      modal
      :style="{ width: 'min(28rem, 92vw)' }"
      :pt="{
        root: { attrs: { id: confirmDialogId } },
        mask: { class: 'settings-modal-child' },
      }"
      @hide="cancelConfirmDialog"
    >
      <template #header>
        <h3 class="text-xl font-semibold m-0">{{ confirmTitle }}</h3>
      </template>
      <p class="text-lab-general-text text-sm m-0 mb-4 leading-relaxed">{{ confirmMessage }}</p>
      <div class="flex justify-end gap-2 flex-wrap">
        <Button
          :id="confirmCancelBtnId"
          type="button"
          label="Cancel"
          icon="fa fa-times-circle"
          severity="secondary"
          @click="cancelConfirmDialog"
        />
        <Button
          :id="confirmAcceptBtnId"
          type="button"
          :label="confirmAcceptLabel"
          :severity="confirmAcceptSeverity"
          icon="fa fa-check"
          @click="acceptConfirmDialog"
        />
      </div>
    </Dialog>
  </div>
</template>
