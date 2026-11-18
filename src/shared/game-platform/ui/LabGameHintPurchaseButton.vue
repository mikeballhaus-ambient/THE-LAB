<script setup lang="ts">
import Button from 'primevue/button';
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formatLabQuarksNumber } from '@/shared/constants/lab-quarks-currency';

const props = withDefaults(
  defineProps<{
    skuLabel?: string;
    costQuarks?: number;
    disabled?: boolean;
    loading?: boolean;
    unlocked?: boolean;
  }>(),
  {
    skuLabel: 'Hint',
    costQuarks: 50,
    disabled: false,
    loading: false,
    unlocked: false,
  },
);

const emit = defineEmits<{
  purchase: [];
}>();

const { generateUniqueId } = useUniqueElementId();

const label = computed(() => {
  if (props.unlocked) {
    return `${props.skuLabel} active`;
  }
  return `${props.skuLabel} (${formatLabQuarksNumber(props.costQuarks)} Quarks)`;
});
</script>

<template>
  <Button
    type="button"
    size="small"
    :disabled="props.disabled || props.unlocked || props.loading"
    :loading="props.loading"
    class="lab-game-hint-purchase"
    :label="label"
    :pt="{ root: { attrs: { id: generateUniqueId('lab-game-hint-purchase') } } }"
    @click="emit('purchase')"
  />
</template>
