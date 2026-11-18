<script setup lang="ts">
import { computed } from 'vue';
import {
  formatLabQuarksNumber,
  LAB_QUARKS_CURRENCY,
} from '@/shared/constants/lab-quarks-currency';
import {
  labShellQuarksBalance,
  labShellQuarksLoading,
} from '@/shared/composables/lab-virtual-bank-shell-state';

const emit = defineEmits<{
  open: [];
}>();

const amountLabel = computed(() => {
  if (labShellQuarksLoading.value || labShellQuarksBalance.value == null) {
    return '…';
  }
  return formatLabQuarksNumber(labShellQuarksBalance.value);
});

const ariaLabel = computed(() => {
  const openHint = 'Open Quarks wallet';
  if (labShellQuarksBalance.value == null) {
    return `${openHint}, balance loading`;
  }
  const n = labShellQuarksBalance.value;
  const unit = Math.abs(n) === 1 ? LAB_QUARKS_CURRENCY.nameSingular : LAB_QUARKS_CURRENCY.name;
  return `${openHint}: ${amountLabel.value} ${unit}`;
});
</script>

<template>
  <button
    type="button"
    class="lab-quick-nav__action lab-quick-nav__quarks"
    :aria-label="ariaLabel"
    @click="emit('open')"
  >
    <i class="pi pi-wallet" aria-hidden="true" />
    <span>{{ LAB_QUARKS_CURRENCY.badgeLabel }}</span>
    <span class="lab-quick-nav__quarks-amount text-lab-general-text tabular-nums">{{ amountLabel }}</span>
  </button>
</template>
