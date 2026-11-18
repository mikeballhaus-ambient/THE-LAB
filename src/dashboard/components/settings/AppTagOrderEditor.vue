<script setup lang="ts">
import { computed } from 'vue';
import { DnDProvider } from '@vue-dnd-kit/core';
import Select from 'primevue/select';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';
import AppTagOrderDnDList from './AppTagOrderDnDList.vue';

const tagIds = defineModel<string[]>({ default: () => [] });

const props = defineProps<{
  tags: PlatformAppTag[];
}>();

const { generateUniqueId } = useUniqueElementId();

const tagById = computed(() => new Map(props.tags.map((t) => [t.id, t])));

const orderedTags = computed(() =>
  tagIds.value.map((id) => tagById.value.get(id)).filter((t): t is PlatformAppTag => Boolean(t)),
);

const addableTags = computed(() =>
  props.tags.filter((t) => !tagIds.value.includes(t.id)),
);

const addTagId = computed({
  get: () => null as string | null,
  set: (id: string | null) => {
    if (!id || tagIds.value.includes(id)) return;
    tagIds.value = [...tagIds.value, id];
  },
});

function onReorder(nextIds: string[]): void {
  tagIds.value = nextIds;
}

function onRemove(tagId: string): void {
  if (tagIds.value.length <= 1) return;
  tagIds.value = tagIds.value.filter((id) => id !== tagId);
}
</script>

<template>
  <DnDProvider>
    <div class="flex flex-col gap-2 min-w-[14rem]">
      <AppTagOrderDnDList
        :tags="orderedTags"
        :tag-ids="tagIds"
        @reorder="onReorder"
        @remove="onRemove"
      />
      <Select
        v-if="addableTags.length > 0"
        v-model="addTagId"
        :options="addableTags"
        option-label="label"
        option-value="id"
        placeholder="Add tag…"
        class="w-full"
        :pt="{ root: { attrs: { id: generateUniqueId('app-tag-order-add-select') } } }"
      />
    </div>
  </DnDProvider>
</template>
