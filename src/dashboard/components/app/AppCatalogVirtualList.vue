<script setup lang="ts">
import { computed } from 'vue';
import VirtualScroller from 'primevue/virtualscroller';
import AppCard from './AppCard.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { RuntimeApp, User } from '@/shared/types';

const props = defineProps<{
  apps: RuntimeApp[];
  allApps: RuntimeApp[];
  viewType: 'list' | 'grid';
  user: User | null;
  isAppRunning: (id: string) => boolean;
}>();

const emit = defineEmits<{
  launch: [id: string, name: string];
  teardown: [id: string];
}>();

const { generateUniqueId } = useUniqueElementId();

const itemSize = computed(() => (props.viewType === 'list' ? 72 : 120));

const scrollerId = generateUniqueId('app-catalog-virtual-scroller');
</script>

<template>
  <VirtualScroller
    :items="apps"
    :item-size="itemSize"
    class="w-full"
    :style="{ height: Math.min(apps.length * itemSize + 8, 480) + 'px' }"
    :pt="{ root: { attrs: { id: scrollerId } } }"
  >
    <template #item="{ item, options }">
      <div
        :key="item.id"
        class="box-border flex items-stretch py-0.5"
        :style="{ height: options.itemSize + 'px' }"
      >
        <AppCard
          :app="item"
          :all-apps="allApps"
          :is-running="isAppRunning(item.id)"
          :view-type="viewType"
          :compact-meta="true"
          :user="user"
          @launch="emit('launch', item.id, item.name)"
          @teardown="emit('teardown', item.id)"
        />
      </div>
    </template>
  </VirtualScroller>
  <p v-if="apps.length === 0" class="text-sm text-lab-general-text-muted m-0 py-4 text-center">
    No apps match the current filters.
  </p>
</template>
