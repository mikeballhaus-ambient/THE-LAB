<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import Button from 'primevue/button';
import { makeDraggable } from '@vue-dnd-kit/core';
import type { IPlacement } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import type { EntityDefinition } from '../../../shared/types/entity.types';
import EntityIcon from '../EntityIcon.vue';

const props = defineProps<{
  definition: EntityDefinition;
  index: number;
  items: EntityDefinition[];
}>();

const emit = defineEmits<{
  edit: [definition: EntityDefinition];
  delete: [definition: EntityDefinition];
}>();

const { generateUniqueId } = useUniqueElementId();
const rowRef = useTemplateRef<HTMLElement>('rowRef');

const { isDragging, isDragOver } = makeDraggable(rowRef, {}, () => [props.index, props.items]);

const placement = computed<IPlacement | undefined>(() => isDragOver.value);
</script>

<template>
  <div
    ref="rowRef"
    class="entity-definition-dnd-row relative grid grid-cols-[2rem_1fr_1.2fr_1fr_5rem_4rem_6rem] gap-2 items-center px-3 py-2 border-b border-lab-general-border bg-lab-general-bg even:bg-lab-general-bg-muted/45 cursor-grab active:cursor-grabbing touch-none select-none"
    :class="{ 'opacity-40': isDragging }"
    :id="generateUniqueId(`crm-entity-dnd-row-${definition.entityKey}`)"
  >
    <div
      v-if="placement?.top"
      class="absolute left-2 right-2 h-0.5 bg-lab-accent-primary rounded pointer-events-none -top-0.5 z-10"
      aria-hidden="true"
    />
    <div
      v-if="placement?.bottom"
      class="absolute left-2 right-2 h-0.5 bg-lab-accent-primary rounded pointer-events-none -bottom-0.5 z-10"
      aria-hidden="true"
    />
    <span class="text-lab-general-text-muted pi pi-bars" aria-hidden="true" />
    <span class="text-sm font-mono text-lab-general-text-muted truncate">{{ definition.entityKey }}</span>
    <EntityIcon :icon="definition.icon" size="sm" class="min-w-0">
      {{ definition.name }}
    </EntityIcon>
    <div class="flex items-center gap-2 min-w-0">
      <EntityIcon :icon="definition.icon" size="lg" />
      <span class="text-xs text-lab-general-text-muted font-mono truncate">{{ definition.icon ?? 'pi-database' }}</span>
    </div>
    <span class="text-sm text-lab-general-text-muted tabular-nums">{{ definition.properties.length }}</span>
    <span class="text-sm text-lab-general-text-muted">{{ definition.isSystem ? 'Yes' : 'No' }}</span>
    <div class="flex gap-2 justify-end" @pointerdown.stop>
      <Button
        icon="pi pi-pencil"
        size="small"
        text
        rounded
        severity="secondary"
        :pt="
          labRecordActionButtonPt(
            generateUniqueId,
            'crm-entity-admin',
            'edit',
            definition.entityKey,
            definition.name,
          )
        "
        @click="emit('edit', definition)"
      />
      <Button
        v-if="!definition.isSystem"
        icon="pi pi-trash"
        size="small"
        text
        rounded
        severity="danger"
        :pt="
          labRecordActionButtonPt(
            generateUniqueId,
            'crm-entity-admin',
            'delete',
            definition.entityKey,
            definition.name,
          )
        "
        @click="emit('delete', definition)"
      />
    </div>
  </div>
</template>
