<script setup lang="ts">

import { computed } from 'vue';

import Badge from 'primevue/badge';

import Button from 'primevue/button';

import Select from 'primevue/select';

import { DnDProvider } from '@vue-dnd-kit/core';

import type { IDragEvent } from '@vue-dnd-kit/core';

import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

import type { ConnectorTicket } from '../composables/useHelpDeskApi';

import type { KanbanBoard, KanbanBoardColumn } from '../../shared/types/kanban-board.types';

import { KANBAN_FIELD_OPTIONS } from '../../shared/types/kanban-board.types';

import {

  groupTicketsByBoardColumns,

  KANBAN_UNMAPPED_COLUMN_ID,

  readTicketFieldValue,

} from '../../shared/utils/kanban-board-utils';

import { priorityLabel, statusLabel } from '../../shared/utils/dashboard-aggregates';

import KanbanDndColumn from './kanban/KanbanDndColumn.vue';

import KanbanDndTicket from './kanban/KanbanDndTicket.vue';



const props = defineProps<{

  tickets: ConnectorTicket[];

  boards: KanbanBoard[];

  selectedBoardId: number | null;

  loading: boolean;

  boardsLoading: boolean;

}>();



const emit = defineEmits<{

  (e: 'update:selectedBoardId', id: number | null): void;

  (e: 'manage-boards'): void;

  (e: 'move', payload: { id: number; column: KanbanBoardColumn }): void;

}>();



const { generateUniqueId } = useUniqueElementId();



const selectedBoard = computed(

  () => props.boards.find(b => b.id === props.selectedBoardId) ?? props.boards[0] ?? null,

);



const boardOptions = computed(() =>

  props.boards.map(b => ({

    label: b.name,

    value: b.id,

  })),

);



const displayColumns = computed((): { id: string; label: string; column?: KanbanBoardColumn }[] => {

  const board = selectedBoard.value;

  if (!board) {

    return [];

  }

  const cols: { id: string; label: string; column?: KanbanBoardColumn }[] = board.columns.map(c => ({
    id: c.id,
    label: c.label,
    column: c,
  }));

  const grouped = groupTicketsByBoardColumns(board, props.tickets);

  if ((grouped.get(KANBAN_UNMAPPED_COLUMN_ID)?.length ?? 0) > 0) {

    cols.push({ id: KANBAN_UNMAPPED_COLUMN_ID, label: 'Unmapped', column: undefined });

  }

  return cols;

});



const ticketsByColumnId = computed(() => {

  const board = selectedBoard.value;

  if (!board) {

    return new Map<string, ConnectorTicket[]>();

  }

  return groupTicketsByBoardColumns(board, props.tickets);

});



const fieldHint = computed(() => {

  const key = selectedBoard.value?.fieldKey;

  if (!key) {

    return '';

  }

  return KANBAN_FIELD_OPTIONS.find(o => o.value === key)?.label ?? key;

});



function prioritySeverity(priority: string): 'secondary' | 'info' | 'warn' | 'danger' {

  if (priority === 'urgent') return 'danger';

  if (priority === 'high') return 'warn';

  if (priority === 'medium') return 'info';

  return 'secondary';

}



function cardSubtitle(ticket: ConnectorTicket): string {

  const board = selectedBoard.value;

  if (!board || board.fieldKey === 'status') {

    return statusLabel(ticket.status);

  }

  if (board.fieldKey === 'priority') {

    return priorityLabel(ticket.priority);

  }

  const v = readTicketFieldValue(ticket, 'assigneeId');

  return v === '__unassigned__' ? 'Unassigned' : v;

}



function onBoardSelect(id: number | null): void {

  emit('update:selectedBoardId', id);

}



function onColumnDrop(

  column: KanbanBoardColumn | undefined,

  columnId: string,

  event: IDragEvent,

): void {

  if (columnId === KANBAN_UNMAPPED_COLUMN_ID || !column) {

    return;

  }

  const raw = event.draggedItems[0]?.data;

  const id = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);

  if (Number.isNaN(id)) {

    return;

  }

  const board = selectedBoard.value;

  const ticket = props.tickets.find(t => t.id === id);

  if (!board || !ticket) {

    return;

  }

  const current = readTicketFieldValue(ticket, board.fieldKey);

  if (current === column.value) {

    return;

  }

  emit('move', { id, column });

}

</script>



<template>

  <div class="help-desk-kanban flex flex-col gap-3 min-h-0" :id="generateUniqueId('hd-kanban-root')">

    <div class="flex flex-wrap items-center gap-2 justify-between">

      <div class="flex flex-wrap items-center gap-2 min-w-0">

        <label class="text-sm text-lab-general-text-muted shrink-0" :id="generateUniqueId('hd-board-select-label')">Board</label>

        <Select

          :model-value="selectedBoard?.id ?? null"

          :options="boardOptions"

          option-label="label"

          option-value="value"

          placeholder="Select board"

          class="min-w-[12rem]"

          :loading="boardsLoading"

          :disabled="boardsLoading || boardOptions.length === 0"

          :pt="{ root: { attrs: { id: generateUniqueId('hd-board-select') } } }"

          @update:model-value="onBoardSelect"

        />

        <Button

          label="Manage boards"

          icon="pi pi-cog"

          size="small"

          outlined

          severity="secondary"

          :pt="{ root: { attrs: { id: generateUniqueId('hd-manage-boards') } } }"

          @click="emit('manage-boards')"

        />

      </div>

      <p v-if="fieldHint" class="text-xs text-lab-general-text-muted m-0">

        Columns map to <span class="text-lab-general-text">{{ fieldHint }}</span>

      </p>

    </div>



    <p v-if="loading || boardsLoading" class="text-sm text-lab-general-text-muted m-0">Loading board…</p>

    <p v-else-if="!selectedBoard" class="text-sm text-lab-general-text-muted m-0">

      No boards configured. Create one with Manage boards.

    </p>

    <DnDProvider v-else>

      <div

        class="flex gap-3 overflow-x-auto pb-2 min-h-[14rem]"

        :id="generateUniqueId('hd-kanban-columns')"

      >

        <div

          v-for="colDef in displayColumns"

          :key="colDef.id"

          class="kanban-column lab-app-kanban-column"

          :class="{ 'opacity-80': colDef.id === KANBAN_UNMAPPED_COLUMN_ID }"

        >

          <div class="flex items-center justify-between gap-1 px-1">

            <span class="text-xs font-semibold text-lab-general-text uppercase tracking-wide truncate">

              {{ colDef.label }}

            </span>

            <span class="text-xs text-lab-general-text-muted tabular-nums">

              {{ ticketsByColumnId.get(colDef.id)?.length ?? 0 }}

            </span>

          </div>

          <KanbanDndColumn

            v-if="colDef.id !== KANBAN_UNMAPPED_COLUMN_ID"

            @drop="onColumnDrop(colDef.column, colDef.id, $event)"

          >

            <KanbanDndTicket

              v-for="ticket in ticketsByColumnId.get(colDef.id)"

              :key="ticket.id"

              :ticket="ticket"

              :priority-severity="prioritySeverity"

              :priority-label="priorityLabel"

              :card-subtitle="cardSubtitle(ticket)"

            />

            <p

              v-if="(ticketsByColumnId.get(colDef.id)?.length ?? 0) === 0"

              class="lab-app-kanban-drop-hint"

            >

              Drop here

            </p>

          </KanbanDndColumn>

          <div v-else class="flex flex-col gap-2 min-h-[6rem]">

            <div

              v-for="ticket in ticketsByColumnId.get(colDef.id)"

              :key="ticket.id"

              class="kanban-card lab-app-kanban-card"

            >

              <p class="text-sm font-medium text-lab-general-text m-0 line-clamp-2">{{ ticket.subject }}</p>

              <div class="flex items-center justify-between gap-1 mt-2">

                <Badge

                  :severity="prioritySeverity(ticket.priority)"

                  :value="priorityLabel(ticket.priority)"

                  class="text-[10px]!"

                />

                <span class="text-[10px] text-lab-general-text-muted truncate max-w-[5rem]" :title="cardSubtitle(ticket)">

                  {{ cardSubtitle(ticket) }}

                </span>

              </div>

              <span class="text-[10px] text-lab-general-text-muted tabular-nums">#{{ ticket.id }}</span>

            </div>

            <p

              v-if="(ticketsByColumnId.get(colDef.id)?.length ?? 0) === 0"

              class="lab-app-kanban-drop-hint"

            >

              No unmapped tickets

            </p>

          </div>

        </div>

      </div>

    </DnDProvider>

    <p v-if="selectedBoard" class="text-xs text-lab-general-text-muted m-0">

      Drag cards between columns to update the board property. Tickets that do not match a column appear under Unmapped.

    </p>

  </div>

</template>


