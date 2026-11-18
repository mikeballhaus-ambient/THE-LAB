<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { LabIntegrationSurface } from '@/shared/integration';
import type { KanbanBoard, KanbanBoardColumn } from '../shared/types/kanban-board.types';
import { HELP_DESK_APP_REGISTRY_ID } from '../shared/constants/app-scope';
import { columnValueToTicketPatch } from '../shared/utils/kanban-board-utils';
import { useHelpDeskApi } from './composables/useHelpDeskApi';
import HelpDeskMetrics from './components/HelpDeskMetrics.vue';
import HelpDeskTicketListTab from './components/HelpDeskTicketListTab.vue';
import HelpDeskKanbanTab from './components/HelpDeskKanbanTab.vue';
import HelpDeskBoardManager from './components/HelpDeskBoardManager.vue';
import type { KanbanBoardIntegrationSlot } from '../shared/constants/kanban-integration-slots';
import type { ConnectorTicket } from './composables/useHelpDeskApi';

interface Props {
  serverUrl?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

const integrationSurfaceRef = ref<InstanceType<typeof LabIntegrationSurface> | null>(null);
const selectedTicketId = ref<number | null>(null);
const selectedBoardIdForIntegration = ref<number | null>(null);
const integrationContext = computed((): Record<string, unknown> => {
  const ctx: Record<string, unknown> = {};
  if (selectedTicketId.value != null) {
    ctx.ticketId = selectedTicketId.value;
  }
  if (selectedBoardIdForIntegration.value != null) {
    ctx.boardId = selectedBoardIdForIntegration.value;
  }
  return ctx;
});

const activeViewTab = ref<'list' | 'board'>('list');
const tickets = ref<Awaited<ReturnType<ReturnType<typeof useHelpDeskApi>['fetchTickets']>>>([]);
const boards = ref<KanbanBoard[]>([]);
const selectedBoardId = ref<number | null>(null);
const loading = ref(false);
const boardsLoading = ref(false);
const error = ref<string | null>(null);
const showBoardManager = ref(false);

const api = computed(() => {
  const url = props.serverUrl?.trim();
  return url ? useHelpDeskApi(url) : null;
});

const serverUrlForIntegration = computed(() => props.serverUrl?.trim() ?? '');

async function refreshTickets(): Promise<void> {
  if (!api.value) {
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    tickets.value = await api.value.fetchTickets();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load tickets';
    tickets.value = [];
  } finally {
    loading.value = false;
  }
}

async function refreshBoards(): Promise<void> {
  if (!api.value) {
    return;
  }
  boardsLoading.value = true;
  try {
    boards.value = await api.value.fetchKanbanBoards();
    if (selectedBoardId.value == null && boards.value.length > 0) {
      selectedBoardId.value = boards.value[0].id;
    } else if (
      selectedBoardId.value != null
      && !boards.value.some((b) => b.id === selectedBoardId.value)
    ) {
      selectedBoardId.value = boards.value[0]?.id ?? null;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load boards';
    boards.value = [];
  } finally {
    boardsLoading.value = false;
  }
}

async function refresh(): Promise<void> {
  await Promise.all([refreshTickets(), refreshBoards()]);
}

function openCreateTicket(): void {
  selectedTicketId.value = null;
  integrationSurfaceRef.value?.openSlot('ticket.create.dialog');
}

function openEditTicket(ticket: ConnectorTicket): void {
  selectedTicketId.value = ticket.id;
  integrationSurfaceRef.value?.openSlot('ticket.edit.dialog');
}

function openDeleteTicket(ticket: ConnectorTicket): void {
  selectedTicketId.value = ticket.id;
  integrationSurfaceRef.value?.openSlot('ticket.delete.dialog');
}

async function onIntegrationSuccess(payload: { slot: string }): Promise<void> {
  if (
    payload.slot === 'ticket.create.dialog'
    || payload.slot === 'ticket.edit.dialog'
    || payload.slot === 'ticket.delete.dialog'
  ) {
    selectedTicketId.value = null;
    await refreshTickets();
    return;
  }
  if (
    payload.slot === 'kanban.board.create.dialog'
    || payload.slot === 'kanban.board.edit.dialog'
    || payload.slot === 'kanban.board.delete.dialog'
  ) {
    selectedBoardIdForIntegration.value = null;
    await refreshBoards();
    return;
  }
}

function openKanbanBoardSlot(payload: { slot: KanbanBoardIntegrationSlot; boardId?: number }): void {
  selectedBoardIdForIntegration.value = payload.boardId ?? null;
  integrationSurfaceRef.value?.openSlot(payload.slot);
}

function openManageBoards(): void {
  showBoardManager.value = true;
}


async function onKanbanMove(payload: { id: number; column: KanbanBoardColumn }): Promise<void> {
  if (!api.value) {
    return;
  }
  const board = boards.value.find((b) => b.id === selectedBoardId.value);
  if (!board) {
    return;
  }
  const patch = columnValueToTicketPatch(board.fieldKey, payload.column.value);
  const previous = tickets.value.slice();
  const idx = tickets.value.findIndex((t) => t.id === payload.id);
  if (idx >= 0) {
    const row = tickets.value[idx];
    if (patch.status !== undefined) {
      row.status = patch.status;
    }
    if (patch.priority !== undefined) {
      row.priority = patch.priority;
    }
    if (patch.assigneeId !== undefined) {
      row.assigneeId = patch.assigneeId;
    }
  }
  try {
    await api.value.updateTicket(payload.id, {
      status: patch.status,
      priority: patch.priority,
      assigneeId: patch.assigneeId,
    });
  } catch (err) {
    tickets.value = previous;
    error.value = err instanceof Error ? err.message : 'Failed to update ticket';
  }
}

onMounted(() => {
  void refresh();
});
</script>

<template>
  <div
    class="help-desk-app app-loaded-container text-lab-general-text flex flex-col gap-4 min-h-0 h-full overflow-auto lab-app-body"
    :id="generateUniqueId('help-desk-root')"
  >
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <h1 class="text-lg font-semibold m-0 text-lab-general-text" :id="generateUniqueId('help-desk-title')">
        Help Desk
      </h1>
      <Button
        label="New ticket"
        icon="pi pi-plus"
        size="small"
        :pt="{ root: { attrs: { id: generateUniqueId('help-desk-new-ticket') } } }"
        @click="openCreateTicket"
      />
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <HelpDeskMetrics :tickets="tickets" :loading="loading">
      <template #charts>
        <LabIntegrationSurface
          v-if="serverUrlForIntegration"
          ref="integrationSurfaceRef"
          :host-app-id="HELP_DESK_APP_REGISTRY_ID"
          surface-id="help-desk.workspace"
          :server-url="serverUrlForIntegration"
          :context="integrationContext"
          :inline-region-ids="['reports.grid']"
          @integration-success="onIntegrationSuccess"
          @integration-cancel="selectedBoardIdForIntegration = null; selectedTicketId = null"
        />
      </template>
    </HelpDeskMetrics>

    <div class="lab-app-inset-tabs min-w-0">
      <Tabs
        v-model:value="activeViewTab"
        class="lab-platform-catalog-tabs help-desk-view-tabs flex flex-col min-h-0"
        :pt="{ root: { id: generateUniqueId('help-desk-view-tabs'), class: 'flex flex-col! min-h-0' } }"
      >
        <TabList>
          <Tab
            value="list"
            :pt="{ root: { id: generateUniqueId('help-desk-tab-list') } }"
          >
            <span class="flex items-center gap-2">
              <i class="pi pi-list" aria-hidden="true"></i>
              List
            </span>
          </Tab>
          <Tab
            value="board"
            :pt="{ root: { id: generateUniqueId('help-desk-tab-board') } }"
          >
            <span class="flex items-center gap-2">
              <i class="pi pi-th-large" aria-hidden="true"></i>
              Board
            </span>
          </Tab>
        </TabList>
        <TabPanels pt:root="mt-3!">
          <TabPanel value="list">
            <HelpDeskTicketListTab
              :tickets="tickets"
              :loading="loading"
              @edit="openEditTicket"
              @delete="openDeleteTicket"
            />
          </TabPanel>
          <TabPanel value="board">
            <HelpDeskKanbanTab
              :tickets="tickets"
              :boards="boards"
              :selected-board-id="selectedBoardId"
              :loading="loading"
              :boards-loading="boardsLoading"
              @update:selected-board-id="selectedBoardId = $event"
              @manage-boards="openManageBoards"
              @move="onKanbanMove"
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <HelpDeskBoardManager
      v-model:visible="showBoardManager"
      :boards="boards"
      :host-app-id="HELP_DESK_APP_REGISTRY_ID"
      @open-slot="openKanbanBoardSlot"
    />
  </div>
</template>
