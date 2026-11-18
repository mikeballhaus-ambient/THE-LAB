<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    icon: string;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { size: 'md' },
);

const iconClasses = computed(() => {
  const name = props.icon.startsWith('fa-') ? props.icon : `fa-${props.icon}`;
  return ['fa-solid', name];
});

const sizeClass = computed(() => {
  if (props.size === 'sm') {
    return 'size-8 text-sm';
  }
  if (props.size === 'lg') {
    return 'size-11 text-xl';
  }
  return 'size-[2.35rem] text-base';
});
</script>

<template>
  <span
    class="tw-game-icon inline-flex shrink-0 items-center justify-center rounded-[0.65rem] bg-[var(--lab-card-icon-bg)] text-lab-card-title shadow-[inset_0_0_0_1px_var(--lab-card-icon-border)]"
    :class="sizeClass"
    aria-hidden="true"
  >
    <i :class="iconClasses" />
  </span>
</template>
