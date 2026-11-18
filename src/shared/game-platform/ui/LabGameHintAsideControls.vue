<script setup lang="ts">
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import LabGameHintDevMockButton from '@/shared/game-platform/ui/LabGameHintDevMockButton.vue';
import LabGameHintPurchaseButton from '@/shared/game-platform/ui/LabGameHintPurchaseButton.vue';

const props = withDefaults(
  defineProps<{
    skuLabel: string;
    costQuarks: number;
    unlocked: boolean;
    loading?: boolean;
    disabled?: boolean;
    devMockEnabled?: boolean;
    showWhen?: boolean;
  }>(),
  {
    loading: false,
    disabled: false,
    devMockEnabled: false,
    showWhen: true,
  },
);

const emit = defineEmits<{
  purchase: [];
  'mock-purchase': [];
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <section
    v-if="props.showWhen"
    class="lab-form-section lab-form-section--nested m-0"
    :id="generateUniqueId('lab-game-hint-aside')"
  >
    <h4 class="lab-form-section__title m-0">
      <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-lightbulb" /></span>
      Quarks hint
    </h4>
    <p class="lab-form-section__lead m-0 text-xs">
      One purchase unlocks a single bounded reveal for this turn.
    </p>
    <div class="flex flex-wrap gap-2 mt-2">
      <LabGameHintPurchaseButton
        :sku-label="props.skuLabel"
        :cost-quarks="props.costQuarks"
        :unlocked="props.unlocked"
        :loading="props.loading"
        :disabled="props.disabled"
        @purchase="emit('purchase')"
      />
      <LabGameHintDevMockButton
        v-if="props.devMockEnabled"
        :sku-label="props.skuLabel"
        :cost-quarks="props.costQuarks"
        :unlocked="props.unlocked"
        :disabled="props.disabled || props.loading"
        @mock-purchase="emit('mock-purchase')"
      />
    </div>
  </section>
</template>
