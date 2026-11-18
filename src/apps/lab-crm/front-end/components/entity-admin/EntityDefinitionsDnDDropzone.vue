<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { makeDroppable } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
import type { EntityDefinition } from '../../../shared/types/entity.types';
import EntityDefinitionDnDRow from './EntityDefinitionDnDRow.vue';

const props = defineProps<{
  definitions: EntityDefinition[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  reorder: [definitions: EntityDefinition[]];
  edit: [definition: EntityDefinition];
  delete: [definition: EntityDefinition];
}>();

const listRef = useTemplateRef<HTMLElement>('listRef');

makeDroppable(
  listRef,
  {
    events: {
      onDrop(e: IDragEvent) {
        const result = e.helpers.suggestSort('vertical');
        if (!result) {
          return;
        }
        const srcItems = e.draggedItems[0]?.items as EntityDefinition[] | undefined;
        if (!srcItems || srcItems !== props.definitions) {
          return;
        }
        emit('reorder', result.sourceItems as EntityDefinition[]);
      },
    },
  },
  () => props.definitions,
);
</script>

<template>
  <div ref="listRef" class="entity-definitions-dnd-dropzone relative flex flex-col min-h-[4rem]">
    <TransitionGroup name="entity-def-list">
      <EntityDefinitionDnDRow
        v-for="(def, index) in definitions"
        :key="def.entityKey"
        :definition="def"
        :index="index"
        :items="definitions"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </TransitionGroup>
    <p
      v-if="!loading && definitions.length === 0"
      class="text-sm text-lab-general-text-muted m-0 p-4 text-center"
    >
      No entity models yet.
    </p>
  </div>
</template>

<style scoped>
.entity-def-list-move {
  transition: transform 0.25s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.entity-def-list-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}
</style>
