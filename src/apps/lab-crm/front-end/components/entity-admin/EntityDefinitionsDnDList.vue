<script setup lang="ts">
import { DnDProvider } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { EntityDefinition } from '../../../shared/types/entity.types';
import EntityDefinitionsDnDDropzone from './EntityDefinitionsDnDDropzone.vue';

defineProps<{
  definitions: EntityDefinition[];
  loading?: boolean;
  reordering?: boolean;
}>();

const emit = defineEmits<{
  reorder: [definitions: EntityDefinition[]];
  edit: [definition: EntityDefinition];
  delete: [definition: EntityDefinition];
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <DnDProvider>
    <div
      class="entity-definitions-dnd-list rounded-lg border border-lab-general-border/80 overflow-hidden"
      :class="{ 'opacity-60 pointer-events-none': loading || reordering }"
      :id="generateUniqueId('crm-entity-admin-table')"
    >
      <div
        class="grid grid-cols-[2rem_1fr_1.2fr_1fr_5rem_4rem_6rem] gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-lab-general-text-muted bg-lab-general-bg-muted/60 border-b border-lab-general-border/80"
      >
        <span />
        <span>Key</span>
        <span>Name</span>
        <span>Icon</span>
        <span>Properties</span>
        <span>System</span>
        <span class="text-right">Actions</span>
      </div>
      <EntityDefinitionsDnDDropzone
        :definitions="definitions"
        :loading="loading"
        @reorder="emit('reorder', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </DnDProvider>
</template>
