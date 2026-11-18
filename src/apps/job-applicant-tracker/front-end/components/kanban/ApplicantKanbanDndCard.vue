<script setup lang="ts">
import { useTemplateRef } from 'vue';
import Button from 'primevue/button';
import { makeDraggable } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import type { Applicant } from '../../../shared/types';

const props = defineProps<{
  applicant: Applicant;
  appliedLabel: string;
}>();

const emit = defineEmits<{
  edit: [id: number];
  delete: [id: number];
}>();

const { generateUniqueId } = useUniqueElementId();
const dragRef = useTemplateRef<HTMLElement>('dragRef');

const { isDragging } = makeDraggable(dragRef, {
  data: () => props.applicant.id,
});
</script>

<template>
  <article
    class="lab-app-kanban-card applicant-kanban-card"
    :class="{ 'opacity-50': isDragging }"
    :id="generateUniqueId(`applicant-item-${applicant.id}`)"
  >
    <div
      ref="dragRef"
      class="applicant-kanban-card__drag cursor-grab active:cursor-grabbing touch-none select-none min-w-0"
      :id="generateUniqueId(`applicant-drag-${applicant.id}`)"
    >
      <p class="text-sm font-medium text-lab-general-text m-0 line-clamp-2">{{ applicant.name }}</p>
      <p class="applicant-kanban-card__meta text-[11px] m-0 mt-1 truncate" :title="applicant.role">
        {{ applicant.role || 'No role' }}
      </p>
      <div class="flex items-center justify-between gap-1 mt-2 min-w-0">
        <span class="applicant-kanban-card__meta text-[10px] truncate" :title="applicant.email">
          {{ applicant.email || '—' }}
        </span>
        <span class="applicant-kanban-card__id text-[10px] tabular-nums shrink-0">#{{ applicant.id }}</span>
      </div>
      <p class="applicant-kanban-card__meta text-[10px] m-0 mt-1">{{ appliedLabel }}</p>
    </div>

    <div class="applicant-kanban-card__actions flex items-center justify-end gap-1 min-w-0">
      <Button
        icon="pi pi-pencil"
        size="small"
        severity="secondary"
        text
        :pt="labRecordActionButtonPt(generateUniqueId, 'applicant', 'edit', applicant.id, applicant.name)"
        @click="emit('edit', applicant.id)"
      />
      <Button
        icon="pi pi-trash"
        size="small"
        severity="danger"
        text
        :pt="labRecordActionButtonPt(generateUniqueId, 'applicant', 'delete', applicant.id, applicant.name)"
        @click="emit('delete', applicant.id)"
      />
    </div>
  </article>
</template>
