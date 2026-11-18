<script setup lang="ts">
import { useTemplateRef } from 'vue';
import Badge from 'primevue/badge';
import { makeDraggable } from '@vue-dnd-kit/core';
import type { ConnectorTicket } from '../../composables/useHelpDeskApi';

const props = defineProps<{
  ticket: ConnectorTicket;
  prioritySeverity: (priority: ConnectorTicket['priority']) => 'secondary' | 'info' | 'warn' | 'danger';
  priorityLabel: (priority: ConnectorTicket['priority']) => string;
  cardSubtitle: string;
}>();

const cardRef = useTemplateRef<HTMLElement>('cardRef');

const { isDragging } = makeDraggable(cardRef, {
  data: () => props.ticket.id,
});
</script>

<template>
  <div
    ref="cardRef"
    class="kanban-card lab-app-kanban-card cursor-grab active:cursor-grabbing touch-none select-none"
    :class="{ 'opacity-40': isDragging }"
  >
    <p class="text-sm font-medium text-lab-general-text m-0 line-clamp-2">{{ ticket.subject }}</p>
    <div class="flex items-center justify-between gap-1 mt-2">
      <Badge
        :severity="prioritySeverity(ticket.priority)"
        :value="priorityLabel(ticket.priority)"
        class="text-[10px]!"
      />
      <span class="text-[10px] text-lab-general-text-muted truncate max-w-[5rem]" :title="cardSubtitle">
        {{ cardSubtitle }}
      </span>
    </div>
    <span class="text-[10px] text-lab-general-text-muted tabular-nums">#{{ ticket.id }}</span>
  </div>
</template>
