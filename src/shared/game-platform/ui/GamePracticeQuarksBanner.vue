<script setup lang="ts">
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <p
    class="game-practice-quarks-banner m-0 text-sm text-lab-general-text-muted flex items-center gap-2"
    :id="generateUniqueId('game-practice-quarks-banner')"
    role="status"
  >
    <i class="pi pi-wallet shrink-0" aria-hidden="true" />
    <span>Practice table — simulated Quarks only; your wallet is unchanged.</span>
  </p>
</template>
