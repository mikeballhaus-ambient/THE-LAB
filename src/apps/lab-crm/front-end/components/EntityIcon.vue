<script setup lang="ts">
import { computed } from 'vue';
import { normalizeEntityIconClass } from '../../shared/utils/entity-icon';

const props = withDefaults(
  defineProps<{
    icon?: string | null;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    icon: undefined,
    size: 'md',
  },
);

const iconClass = computed(() => normalizeEntityIconClass(props.icon));

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-sm';
    case 'lg':
      return 'text-lg';
    default:
      return 'text-base';
  }
});
</script>

<template>
  <span class="crm-entity-icon inline-flex items-center gap-2 min-w-0">
    <i :class="[iconClass, sizeClass, 'shrink-0']" aria-hidden="true" />
    <span v-if="$slots.default" class="truncate text-lab-general-text">
      <slot />
    </span>
  </span>
</template>
