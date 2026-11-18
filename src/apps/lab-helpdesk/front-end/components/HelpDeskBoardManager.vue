<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Badge from 'primevue/badge';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import { fetchLabIntegrationBindings } from '@/shared/integration/fetch-lab-integration-bindings';
import { HELP_DESK_APP_REGISTRY_ID } from '../../shared/constants/app-scope';
import {
  KANBAN_BOARD_INTEGRATION_SLOTS,
  type KanbanBoardIntegrationSlot,
} from '../../shared/constants/kanban-integration-slots';
import type { KanbanBoard } from '../../shared/types/kanban-board.types';
import { KANBAN_FIELD_OPTIONS } from '../../shared/types/kanban-board.types';

const props = defineProps<{
  visible: boolean;
  boards: KanbanBoard[];
  hostAppId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'open-slot', payload: { slot: KanbanBoardIntegrationSlot; boardId?: number }): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const enabledIntegrationSlots = ref<Set<string>>(new Set());
const bindingsChecked = ref(false);

const hostAppIdResolved = computed(() => props.hostAppId?.trim() || HELP_DESK_APP_REGISTRY_ID);

const hasBoards = computed(() => props.boards.length > 0);

function hasIntegrationSlot(slot: string): boolean {
  return enabledIntegrationSlots.value.has(slot);
}

function fieldKeyLabel(board: KanbanBoard): string {
  return KANBAN_FIELD_OPTIONS.find((o) => o.value === board.fieldKey)?.label ?? board.fieldKey;
}

async function loadEnabledSlotsFromRegistry(): Promise<void> {
  bindingsChecked.value = false;
  try {
    const rows = (await fetchLabIntegrationBindings(hostAppIdResolved.value)) ?? [];
    const next = new Set<string>();
    for (const slot of Object.values(KANBAN_BOARD_INTEGRATION_SLOTS)) {
      if (rows.some((row) => row.enabled && row.slot === slot)) {
        next.add(slot);
      }
    }
    enabledIntegrationSlots.value = next;
  } catch {
    enabledIntegrationSlots.value = new Set();
  } finally {
    bindingsChecked.value = true;
  }
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      void loadEnabledSlotsFromRegistry();
    }
  },
);

function onNewBoardClick(): void {
  emit('open-slot', { slot: KANBAN_BOARD_INTEGRATION_SLOTS.create });
}

function onEditBoardClick(boardId: number): void {
  emit('open-slot', { slot: KANBAN_BOARD_INTEGRATION_SLOTS.edit, boardId });
}

function requestDeleteBoard(board: KanbanBoard): void {
  if (board.isSystem) {
    return;
  }
  emit('open-slot', { slot: KANBAN_BOARD_INTEGRATION_SLOTS.delete, boardId: board.id });
}

const missingBindingsHint = computed(() => {
  if (!bindingsChecked.value || !props.visible) {
    return null;
  }
  const required = Object.values(KANBAN_BOARD_INTEGRATION_SLOTS);
  const missing = required.filter((slot) => !hasIntegrationSlot(slot));
  if (missing.length === 0) {
    return null;
  }
  return `Provision stubs and enable bindings for: ${missing.join(', ')} (region dialogs, presentation dialog — same as tickets).`;
});
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Kanban boards"
    :class="['help-desk-board-manager', 'lab-app-dialog', 'lab-form-runtime']"
    :style="{ width: 'min(42rem, calc(100vw - 2rem))' }"
    :pt="{
      root: { attrs: { id: generateUniqueId('hd-board-manager') } },
      mask: { class: 'lab-app-dialog' },
    }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="help-desk-board-manager__body flex min-h-0 max-h-full flex-col gap-3 overflow-hidden">
      <Message
        v-if="missingBindingsHint"
        severity="warn"
        :closable="false"
        :pt="{ root: { attrs: { id: generateUniqueId('hd-board-bindings-warn') } } }"
      >
        {{ missingBindingsHint }}
      </Message>

      <section
        :id="generateUniqueId('hd-board-intro-section')"
        class="lab-form-section help-desk-board-manager__intro mb-0"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h4
              class="lab-form-section__title m-0"
              :id="generateUniqueId('hd-board-intro-title')"
            >
              <span class="lab-form-section__icon" aria-hidden="true">
                <i class="pi pi-info-circle" />
              </span>
              How boards work
            </h4>
            <p class="lab-form-section__lead mb-0 mt-2">
              Each board groups tickets into columns by a ticket property. Drag cards on the board to
              update that property.
            </p>
          </div>
          <Button
            label="New board"
            icon="pi pi-plus"
            size="small"
            class="shrink-0"
            :pt="{ root: { attrs: { id: generateUniqueId('hd-board-new') } } }"
            @click="onNewBoardClick"
          />
        </div>
      </section>

      <section
        :id="generateUniqueId('hd-board-list-section')"
        class="lab-form-section help-desk-board-manager__list mb-0 flex min-h-0 flex-col"
      >
        <h4
          class="lab-form-section__title m-0"
          :id="generateUniqueId('hd-board-list-title')"
        >
          <span class="lab-form-section__icon" aria-hidden="true">
            <i class="pi pi-th-large" />
          </span>
          Your boards
        </h4>
        <p class="lab-form-section__lead">
          {{ boards.length }} board{{ boards.length === 1 ? '' : 's' }} configured for this workspace.
        </p>

        <p
          v-if="!hasBoards"
          class="lab-form-section__lead mb-0"
          :id="generateUniqueId('hd-board-empty')"
        >
          No boards yet. Create one to add a custom view on the Board tab.
        </p>

        <div
          :id="generateUniqueId('hd-board-list')"
          v-if="hasBoards"
          class="lab-form-section__children help-desk-board-manager__items box-border max-h-[min(22rem,50vh)] overflow-x-hidden overflow-y-auto px-[3px] pb-0.5"
          role="list"
        >
          <div v-for="board in boards" :key="board.id" role="listitem">
            <section
              :id="generateUniqueId(`hd-board-item-${board.id}`)"
              class="lab-form-section lab-form-section--nested help-desk-board-manager__item mb-0"
            >
              <div
                class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start"
              >
                <div class="min-w-0">
                  <h4
                    class="lab-form-section__title m-0 text-base font-semibold normal-case tracking-normal"
                    :id="generateUniqueId(`hd-board-name-${board.id}`)"
                  >
                    <span class="lab-form-section__icon" aria-hidden="true">
                      <i class="pi pi-table" />
                    </span>
                    {{ board.name }}
                    <Badge
                      v-if="board.isSystem"
                      value="System"
                      severity="secondary"
                      class="ml-2 align-middle text-xs"
                      :pt="{ root: { attrs: { id: generateUniqueId(`hd-board-sys-${board.id}`) } } }"
                    />
                  </h4>
                  <p
                    class="lab-form-section__lead mb-0 mt-2"
                    :id="generateUniqueId(`hd-board-meta-${board.id}`)"
                  >
                    Property:
                    <span class="text-lab-general-text">{{ fieldKeyLabel(board) }}</span>
                    ·
                    {{ board.columns.length }}
                    column{{ board.columns.length === 1 ? '' : 's' }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2 sm:justify-end shrink-0">
                  <Button
                    label="Edit"
                    icon="pi pi-pencil"
                    severity="secondary"
                    outlined
                    size="small"
                    :pt="
                      labRecordActionButtonPt(
                        generateUniqueId,
                        'hd-board',
                        'edit',
                        board.id,
                        board.name,
                      )
                    "
                    @click="onEditBoardClick(board.id)"
                  />
                  <Button
                    label="Delete"
                    icon="pi pi-trash"
                    severity="danger"
                    outlined
                    size="small"
                    :disabled="board.isSystem"
                    :title="
                      board.isSystem
                        ? 'Default system boards cannot be deleted'
                        : 'Delete this board'
                    "
                    :pt="
                      labRecordActionButtonPt(
                        generateUniqueId,
                        'hd-board',
                        'delete',
                        board.id,
                        board.name,
                      )
                    "
                    @click="requestDeleteBoard(board)"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  </Dialog>
</template>

<style scoped>
.help-desk-board-manager__item.lab-form-section {
  border: 1px solid color-mix(in srgb, var(--lab-card-border, var(--lab-general-border)) 88%, var(--lab-general-border));
  border-left-width: 3px;
  border-left-color: color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 90%, transparent);
  background: color-mix(
    in srgb,
    var(--lab-surface-card, var(--lab-general-bg)) 82%,
    var(--lab-general-border)
  );
  box-shadow: 0 1px 2px color-mix(in srgb, var(--lab-general-border) 35%, transparent);
}
</style>

<style>
/* Dialog teleports to body — scoped styles cannot reach the shell. */
.help-desk-board-manager.lab-app-dialog.p-dialog {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: min(92vh, 44rem);
  background: var(--lab-general-bg);
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, transparent);
  border-radius: 0.5rem;
  box-shadow:
    0 20px 40px color-mix(in srgb, black 42%, transparent),
    0 0 0 1px color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  --lab-integration-chrome-bg: color-mix(in srgb, var(--lab-general-bg) 92%, var(--lab-general-border));
  --lab-integration-body-bg: color-mix(in srgb, var(--lab-general-bg) 96%, var(--lab-general-text) 4%);
  --lab-integration-field-bg: var(--lab-form-control-bg, var(--lab-general-bg));
  --lab-integration-field-border: var(--lab-form-control-border, var(--lab-general-border));
  --lab-form-control-bg: color-mix(in srgb, var(--lab-general-bg) 88%, var(--lab-general-border));
  --lab-form-control-border: var(--lab-general-border);
}

.help-desk-board-manager.lab-app-dialog .p-dialog-header {
  flex-shrink: 0;
  padding: 0.85rem 1.25rem;
  background: var(--lab-integration-chrome-bg);
  border-bottom: 1px solid var(--lab-integration-field-border);
  border-radius: 0.5rem 0.5rem 0 0;
}

.help-desk-board-manager.lab-app-dialog .p-dialog-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  padding: 1rem 1.25rem 1.25rem;
  background: var(--lab-integration-body-bg);
  border-radius: 0 0 0.5rem 0.5rem;
}

.help-desk-board-manager.lab-app-dialog .p-dialog-header-actions .p-button {
  color: var(--lab-general-text-muted);
}
</style>
