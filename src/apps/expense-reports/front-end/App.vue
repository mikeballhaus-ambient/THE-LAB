<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { ExpenseReport, ExpenseStatus } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-expense-reports';

interface Props {
  serverUrl?: string;
  appDescription?: string;
}
const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const integrationRef = ref<InstanceType<typeof CatalogIntegrationHost> | null>(null);

const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

const loading = ref(false);
const error = ref<string | null>(null);
const expenses = ref<ExpenseReport[]>([]);
const totals = ref<Record<string, number>>({});

const statuses: ExpenseStatus[] = ['draft', 'submitted', 'approved', 'rejected', 'reimbursed'];

const statusLabels: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  reimbursed: 'Reimbursed',
};

/** Button copy — imperative verbs, not the destination status string. */
const advanceActionLabels: Partial<Record<ExpenseStatus, string>> = {
  draft: 'Submit',
  approved: 'Reimburse',
  rejected: 'Resubmit',
};

function statusLabel(status: ExpenseStatus): string {
  return statusLabels[status] ?? status;
}

function advanceActionLabel(current: ExpenseStatus): string | null {
  const next = nextStatus(current);
  if (!next) {
    return null;
  }
  return advanceActionLabels[current] ?? statusLabel(next);
}

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await api.listExpenses(base.value);
    expenses.value = result.expenses;
    totals.value = result.totals;
    } catch (e) {
    error.value = msg(e);
  } finally {
    loading.value = false;
  }
}
const { reportsChartContext, reloadWorkspace } = useCatalogWorkspaceRefresh({
  hostAppId: HOST_APP_ID,
  serverUrl: () => base.value,
  reload: refresh,
});

async function onIntegrationSuccess(): Promise<void> {
  await reloadWorkspace();
  toast.add({ severity: 'success', summary: 'Expense updated', life: 2500 });
}

async function changeStatus(expense: ExpenseReport, status: ExpenseStatus): Promise<void> {
  try {
    await api.setExpenseStatus(base.value, expense.id, status);
    await reloadWorkspace();
    if (status === 'submitted') {
      toast.add({
        severity: 'success',
        summary: 'Expense submitted',
        detail: 'Manager approval is pending — status updates when they decide.',
        life: 4000,
      });
    }
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Update failed', detail: msg(e), life: 5000 });
  }
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function nextStatus(status: ExpenseStatus): ExpenseStatus | null {
  const flow: Partial<Record<ExpenseStatus, ExpenseStatus>> = {
    draft: 'submitted',
    approved: 'reimbursed',
    rejected: 'submitted',
  };
  return flow[status] ?? null;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

onMounted(refresh);
</script>

<template>
  <div
    class="expense-reports-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('expense-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('expense-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('expense-title')">Expense Reports</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Log expenses with receipts and reimbursement status.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New expense"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('expense-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('expense-refresh') } } }"
          @click="reloadWorkspace()"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="expense-reports"
    />

    <CatalogAppFormSection
      title="Expenses"
      lead="Status totals and reimbursement demo rows."
      icon="pi pi-wallet"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="expense-main"
    >
      <div
        class="expense-status-totals"
        role="list"
        :id="generateUniqueId('expense-totals')"
      >
        <section
          v-for="s in statuses"
          :key="s"
          class="expense-status-total expense-tone-card expense-status-tone"
          :class="`expense-status-tone--${s}`"
          role="listitem"
          :id="generateUniqueId(`expense-total-${s}`)"
        >
          <span class="expense-status-total__label">{{ statusLabel(s) }}</span>
          <span class="expense-status-total__amount">{{ money(totals[s] ?? 0) }}</span>
        </section>
      </div>

      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('expense-error')">{{ error }}</p>
      <p
        v-else-if="!loading && expenses.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('expense-empty')"
      >
        No expenses yet — use “New expense” to add one.
      </p>

      <ul v-else class="catalog-master-list" :id="generateUniqueId('expense-list')">
        <li v-for="expense in expenses" :key="expense.id" :id="generateUniqueId(`expense-wrap-${expense.id}`)">
          <section
            class="catalog-master-record expense-report-row expense-tone-card expense-status-tone flex flex-col gap-2"
            :class="`expense-status-tone--${expense.status}`"
            :id="generateUniqueId(`expense-item-${expense.id}`)"
          >
            <div class="flex items-start gap-3 min-w-0">
              <div class="flex-1 min-w-0">
                <h2
                  class="expense-report-row__title text-base font-semibold m-0 truncate"
                  :id="generateUniqueId(`expense-item-title-${expense.id}`)"
                >
                  {{ expense.title }}
                </h2>
                <span
                  class="expense-status-total__label mt-1.5"
                  :id="generateUniqueId(`expense-status-${expense.id}`)"
                >
                  {{ statusLabel(expense.status) }}
                </span>
                <p class="expense-report-row__meta text-xs m-0 mt-1">
                  {{ expense.spentOn }}
                  <span v-if="expense.category"> · {{ expense.category }}</span>
                  · {{ expense.submitter || '—' }}
                </p>
              </div>
              <span
                class="expense-status-total__amount shrink-0 text-right"
                :id="generateUniqueId(`expense-amount-${expense.id}`)"
              >
                {{ money(expense.amountCents) }}
              </span>
            </div>
            <div
              class="expense-report-row__actions flex flex-wrap items-center gap-2 pt-2"
              :id="generateUniqueId(`expense-actions-${expense.id}`)"
            >
              <Button
                v-if="advanceActionLabel(expense.status)"
                :label="advanceActionLabel(expense.status)!"
                size="small"
                severity="secondary"
                :pt="{ root: { attrs: { id: generateUniqueId(`expense-advance-${expense.id}`) } } }"
                @click="changeStatus(expense, nextStatus(expense.status)!)"
              />
              <span class="flex-1 min-w-[0.5rem]" aria-hidden="true" />
              <Button
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                text
                :pt="labRecordActionButtonPt(generateUniqueId, 'expense', 'edit', expense.id, expense.title)"
                @click="integrationRef?.openPrimaryEdit(expense.id)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                :pt="labRecordActionButtonPt(generateUniqueId, 'expense', 'delete', expense.id, expense.title)"
                @click="integrationRef?.openPrimaryDelete(expense.id)"
              />
            </div>
          </section>
        </li>
      </ul>
    </CatalogAppFormSection>

    <CatalogIntegrationHost
      ref="integrationRef"
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      @integration-success="onIntegrationSuccess"
    />

  </div>
</template>

<style scoped>
/* Shared status palette — totals strip + row pills */
.expense-reports-app .expense-status-tone--draft {
  --expense-tone-fg: color-mix(in srgb, var(--lab-general-text-muted) 92%, var(--lab-general-bg));
  --expense-tone-rail: var(--lab-general-text-muted);
}

.expense-reports-app .expense-status-tone--submitted {
  --expense-tone-fg: color-mix(in srgb, var(--lab-general-text) 50%, var(--lab-button-border-hover));
  --expense-tone-rail: var(--lab-button-border-hover);
}

.expense-reports-app .expense-status-tone--approved {
  --expense-tone-fg: color-mix(in srgb, var(--lab-general-text) 72%, var(--lab-general-text-muted));
  --expense-tone-rail: color-mix(in srgb, var(--lab-general-text) 35%, var(--lab-general-border));
}

.expense-reports-app .expense-status-tone--rejected {
  --expense-tone-fg: color-mix(
    in srgb,
    var(--lab-general-text-muted) 55%,
    var(--lab-error-text, var(--lab-general-text))
  );
  --expense-tone-rail: color-mix(
    in srgb,
    var(--lab-error-text, var(--lab-general-text-muted)) 65%,
    var(--lab-general-bg)
  );
}

.expense-reports-app .expense-status-tone--reimbursed {
  --expense-tone-fg: color-mix(in srgb, var(--lab-general-text) 68%, var(--lab-button-border-hover));
  --expense-tone-rail: var(--lab-button-border-hover);
}

.expense-reports-app .expense-status-totals {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.75rem, 1fr));
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.expense-reports-app .expense-tone-card {
  margin: 0;
  border-radius: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 16%, var(--lab-general-bg));
  border-left-width: 3px;
  border-left-color: color-mix(in srgb, var(--expense-tone-rail) 72%, var(--lab-general-bg));
  background: color-mix(in srgb, var(--lab-general-bg) 94%, var(--expense-tone-rail));
  box-shadow: 0 1px 0 color-mix(in srgb, var(--lab-general-text) 4%, transparent);
}

.expense-reports-app .expense-status-total {
  padding: 0.55rem 0.7rem 0.6rem 0.65rem;
}

.expense-reports-app .expense-report-row {
  padding: 0.55rem 0.7rem 0.5rem 0.65rem;
}

.expense-reports-app .expense-status-total__label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--expense-tone-fg) 55%, var(--lab-general-text-muted));
}

.expense-reports-app .expense-status-total__amount {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.9375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--expense-tone-fg);
}

.expense-reports-app .expense-report-row .expense-status-total__amount {
  margin-top: 0;
}

.expense-reports-app .expense-report-row .expense-status-total__label {
  display: block;
}

/* Muted hairline — `--lab-general-border` alone can read as harsh on dark presets. */
.expense-reports-app .expense-report-row__actions {
  border-top: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 35%, var(--lab-general-bg));
}

.expense-reports-app .expense-report-row__title {
  color: var(--lab-general-text);
}

.expense-reports-app .expense-report-row__meta {
  color: color-mix(in srgb, var(--lab-general-text-muted) 88%, var(--lab-general-bg));
}
</style>
