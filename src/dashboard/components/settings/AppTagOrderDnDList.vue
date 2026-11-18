<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { makeDroppable } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';
import AppTagOrderDnDRow from './AppTagOrderDnDRow.vue';

const props = defineProps<{
  tags: PlatformAppTag[];
  tagIds: string[];
}>();

const emit = defineEmits<{
  reorder: [tagIds: string[]];
  remove: [tagId: string];
}>();

const { generateUniqueId } = useUniqueElementId();
const listRef = useTemplateRef<HTMLElement>('listRef');

makeDroppable(
  listRef,
  {
    events: {
      onDrop(e: IDragEvent) {
        const result = e.helpers.suggestSort('vertical');
        if (!result) return;
        const srcItems = e.draggedItems[0]?.items as string[] | undefined;
        if (!srcItems || srcItems !== props.tagIds) return;
        emit('reorder', result.sourceItems as string[]);
      },
    },
  },
  () => props.tagIds,
);
</script>

<template>
  <div
    ref="listRef"
    class="rounded border border-lab-general-border/40 p-1 min-h-[2rem]"
    :id="generateUniqueId('app-tag-order-dnd-list')"
  >
    <AppTagOrderDnDRow
      v-for="(tag, index) in tags"
      :key="tag.id"
      :tag="tag"
      :index="index"
      :items="tagIds"
      :can-remove="tagIds.length > 1"
      @remove="emit('remove', tag.id)"
    />
    <p v-if="tags.length === 0" class="text-xs text-lab-general-text-muted m-0 p-2 text-center">
      Add at least one tag.
    </p>
  </div>
</template>
