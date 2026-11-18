<script setup lang="ts">
import { computed } from 'vue';
import {
  formatLabQuarksNumber,
  LAB_QUARKS_CURRENCY,
} from '@/shared/constants/lab-quarks-currency';

const props = defineProps<{
  balance: number | null;
  loading?: boolean;
}>();

const amountLabel = computed(() => {
  if (props.loading || props.balance == null) {
    return '…';
  }
  return formatLabQuarksNumber(props.balance);
});

const ariaLabel = computed(() => {
  if (props.balance == null) {
    return `${LAB_QUARKS_CURRENCY.badgeLabel} balance loading`;
  }
  const unit =
    Math.abs(props.balance) === 1
      ? LAB_QUARKS_CURRENCY.nameSingular
      : LAB_QUARKS_CURRENCY.name;
  return `${LAB_QUARKS_CURRENCY.badgeLabel}: ${amountLabel.value} ${unit}`;
});
</script>

<template>
  <div
    class="lab-virtual-bank-badge inline-flex items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--lab-general-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--lab-general-bg-muted,var(--lab-general-bg))_70%,transparent)] px-2.5 py-1 text-sm font-semibold tabular-nums"
    role="status"
    :aria-label="ariaLabel"
  >
    <i class="pi pi-wallet text-xs opacity-80" aria-hidden="true" />
    <span class="text-lab-general-text-muted font-normal text-xs">{{ LAB_QUARKS_CURRENCY.badgeLabel }}</span>
    <span class="text-lab-general-text">{{ amountLabel }}</span>
  </div>
</template>
