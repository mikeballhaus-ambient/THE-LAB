<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  formatLabQuarksAmount,
  formatLabQuarksDelta,
  LAB_QUARKS_CURRENCY,
} from '@/shared/constants/lab-quarks-currency';
import type {
  LabVirtualBankAccountView,
  LabVirtualBankLedgerEntry,
} from '@/shared/types/lab-virtual-bank';
import {
  LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP,
  LAB_VIRTUAL_BANK_MAX_ACCRUAL_DAYS,
} from '@/shared/types/lab-virtual-bank';
import {
  formatQuarksLedgerActivityHint,
  formatQuarksLedgerActivityTitle,
} from '@/shared/utils/lab-quarks-ledger-display';

const props = defineProps<{
  visible: boolean;
  loading: boolean;
  error: string | null;
  account: LabVirtualBankAccountView | null;
  ledger: LabVirtualBankLedgerEntry[];
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  refresh: [];
}>();

const { generateUniqueId } = useUniqueElementId();

const dialogVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
});

const balanceLabel = computed(() => {
  if (props.account == null) {
    return '…';
  }
  return formatLabQuarksAmount(props.account.balance);
});

const dailyLead = computed(() => {
  const amount = props.account?.dailyAccrualAmount;
  if (amount == null) {
    return LAB_QUARKS_CURRENCY.playMoneyDisclaimer;
  }
  const perDay = formatLabQuarksAmount(amount);
  const cap = formatLabQuarksAmount(LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP);
  return `You receive ${perDay} on the first lab visit each UTC day (up to ${LAB_VIRTUAL_BANK_MAX_ACCRUAL_DAYS} days if you were away) while your balance is below ${cap}. Balances may go negative. ${LAB_QUARKS_CURRENCY.playMoneyDisclaimer}`;
});

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    append-to="body"
    :header="LAB_QUARKS_CURRENCY.walletDialogTitle"
    class="lab-quarks-wallet-dialog lab-integration-dialog lab-app-dialog lab-form-runtime text-lab-general-text"
    :style="{ width: 'min(28rem, 94vw)' }"
    :pt="{ root: { attrs: { id: generateUniqueId('lab-quarks-wallet-dialog') } } }"
  >
    <div v-if="loading" class="lab-quarks-wallet__loading lab-quarks-wallet-dialog__body flex justify-center py-8">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>

    <p v-else-if="error" class="lab-quarks-wallet-dialog__body text-lab-general-text-muted m-0" role="alert">
      {{ error }}
    </p>

    <div v-else-if="account" class="lab-quarks-wallet-dialog__body flex flex-col gap-4">
      <section class="lab-form-section">
        <h4 class="lab-form-section__title">
          <span class="lab-form-section__icon"><i class="pi pi-wallet" aria-hidden="true" /></span>
          Current balance
        </h4>
        <p class="lab-form-section__lead m-0">
          {{ LAB_QUARKS_CURRENCY.playMoneyDisclaimer }}
        </p>
        <p class="m-0 mt-3 text-xl font-semibold tracking-wide text-lab-general-text tabular-nums">
          {{ balanceLabel }}
        </p>
      </section>

      <section class="lab-form-section">
        <h4 class="lab-form-section__title">
          <span class="lab-form-section__icon"><i class="pi pi-calendar" aria-hidden="true" /></span>
          Daily allotment
        </h4>
        <p class="lab-form-section__lead m-0">
          {{ dailyLead }}
        </p>
      </section>

      <section class="lab-form-section">
        <h4 class="lab-form-section__title">
          <span class="lab-form-section__icon"><i class="pi pi-history" aria-hidden="true" /></span>
          Recent activity
        </h4>
        <p class="lab-form-section__lead m-0">
          Each row is a credit or debit. Game names come from the app that posted the match.
        </p>
        <div class="lab-form-section__children">
          <p v-if="ledger.length === 0" class="text-lab-general-text-muted text-sm m-0">
            No activity yet.
          </p>
          <div
            v-else
            class="max-h-[min(16rem,42vh)] overflow-y-auto overscroll-contain rounded-md border border-lab-general-border bg-lab-general-bg py-0.5 pr-1.5 -mr-0.5"
            tabindex="0"
            role="region"
            aria-label="Recent Quark transactions"
          >
            <ul class="catalog-accordion-item-list m-0 p-0 list-none">
              <li v-for="entry in ledger" :key="entry.id">
                <div class="flex items-start justify-between gap-3 py-0.5">
                  <div class="min-w-0">
                    <p class="m-0 text-sm font-medium text-lab-general-text">
                      {{ formatQuarksLedgerActivityTitle(entry) }}
                    </p>
                    <p
                      v-if="formatQuarksLedgerActivityHint(entry)"
                      class="m-0 mt-0.5 text-xs text-lab-general-text-muted"
                    >
                      {{ formatQuarksLedgerActivityHint(entry) }}
                    </p>
                    <p class="m-0 mt-0.5 text-xs text-lab-general-text-muted">
                      {{ formatWhen(entry.createdAt) }}
                    </p>
                  </div>
                  <span
                    class="shrink-0 text-sm font-semibold tabular-nums"
                    :class="entry.delta >= 0 ? 'text-[color:var(--lab-success,#22c55e)]' : 'text-lab-danger-text'"
                  >
                    {{ formatLabQuarksDelta(entry.delta) }}
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          severity="secondary"
          text
          :loading="loading"
          :id="generateUniqueId('lab-quarks-wallet-refresh')"
          @click="emit('refresh')"
        />
        <Button
          label="Close"
          severity="secondary"
          data-lab-shell-action="close-quarks-wallet"
          :id="generateUniqueId('lab-quarks-wallet-close')"
          @click="dialogVisible = false"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
:global(.lab-quarks-wallet-dialog.lab-app-dialog) {
  --lab-integration-chrome-bg: color-mix(in srgb, var(--lab-general-bg) 92%, var(--lab-general-border));
  --lab-integration-body-bg: color-mix(in srgb, var(--lab-general-bg-muted, var(--lab-general-bg)) 88%, transparent);
  --lab-integration-field-bg: var(--lab-general-bg);
  --lab-integration-field-border: var(--lab-general-border);
  --lab-form-control-bg: var(--lab-general-bg);
  --lab-form-control-border: var(--lab-general-border);
}

:global(.lab-quarks-wallet-dialog.lab-integration-dialog .lab-quarks-wallet-dialog__body) {
  padding: 1rem 1.25rem 1.25rem;
  box-sizing: border-box;
}

:global(.lab-quarks-wallet-dialog.lab-integration-dialog .catalog-accordion-item-list) {
  color: var(--lab-general-text);
}
</style>
