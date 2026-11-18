<script setup lang="ts">
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = withDefaults(
  defineProps<{
    skuLabel?: string;
    costQuarks?: number;
    disabled?: boolean;
    unlocked?: boolean;
  }>(),
  {
    skuLabel: 'Hint',
    costQuarks: 0,
    disabled: false,
    unlocked: false,
  },
);

const emit = defineEmits<{
  'mock-purchase': [];
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <Button
    type="button"
    size="small"
    severity="warn"
    class="lab-game-hint-dev-mock"
    :disabled="props.disabled || props.unlocked"
    :label="
      props.unlocked
        ? `Dev: ${props.skuLabel} active`
        : `Dev: mock purchase (${props.costQuarks} Q)`
    "
    :pt="{ root: { attrs: { id: generateUniqueId('lab-game-hint-dev-mock') } } }"
    @click="emit('mock-purchase')"
  />
</template>
