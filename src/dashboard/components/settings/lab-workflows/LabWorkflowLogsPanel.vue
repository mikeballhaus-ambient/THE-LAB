<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import Checkbox from 'primevue/checkbox';
import {
  deleteLabWorkflowRuns,
  fetchLabWorkflowRuns,
  formatLabWorkflowTriggerType,
} from '@/shared/services/platform-lab-workflows.client';
import type { LabWorkflowRun, LabWorkflowRunStatus } from '@/shared/types/lab-workflow-run';
import LabWorkflowRunDetailDialog from './LabWorkflowRunDetailDialog.vue';

/**
 * Execution history for one workflow.
 *
 * ## Why Test and Live are separate lists
 *
 * The split is not cosmetic. A **manual** run is the author pressing Test — it proves the graph
 * evaluates, not that the trigger fires. **Live** means something real caused it (an event, the
 * clock, an inbound webhook), which is the only evidence the automation works unattended. Mixed into
 * one list, a column of green manual runs reads as "it's working in production".
 *
 * A dry-run preview leaves **no row at all** (`runForCaller` returns `runId: null` on purpose), so a
 * Test entry here is always a run that actually wrote.
 */

const props = defineProps<{
  workflowId: string | null;
}>();

const { generateUniqueId } = useUniqueElementId();

type LogsSubtab = 'test' | 'live';

const activeSubtab = ref<LogsSubtab>('live');
const runs = ref<LabWorkflowRun[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const selectedRunId = ref<string | null>(null);
const detailVisible = ref(false);

/**
 * Run ids ticked for deletion.
 *
 * A `Set` rather than an array so "is this row selected?" stays O(1) while rendering hundreds of
 * rows, and so the bulk action is naturally de-duplicated.
 */
const checkedRunIds = ref<Set<string>>(new Set());
const deleting = ref(false);
const deleteError = ref<string | null>(null);

const hasCheckedRuns = computed(() => checkedRunIds.value.size > 0);

/**
 * Select-all state for the checkbox above the list.
 *
 * `indeterminate` is what makes this honest: with 2 of 15 rows ticked, a checkbox showing "empty"
 * would imply nothing was selected and a full tick would imply everything was. The tri-state is the
 * only correct reading.
 */
const allChecked = computed(() => runs.value.length > 0 && checkedRunIds.value.size >= runs.value.length);
const someChecked = computed(() => checkedRunIds.value.size > 0 && !allChecked.value);

function toggleAll(next: boolean): void {
  checkedRunIds.value = next ? new Set(runs.value.map((run) => run.id)) : new Set();
}

function isChecked(runId: string): boolean {
  return checkedRunIds.value.has(runId);
}

function toggleChecked(runId: string, next: boolean): void {
  const updated = new Set(checkedRunIds.value);
  if (next) {
    updated.add(runId);
  } else {
    updated.delete(runId);
  }
  checkedRunIds.value = updated;
}

function clearChecked(): void {
  checkedRunIds.value = new Set();
}

/**
 * Delete every ticked run.
 *
 * Cleared **before** the reload so a selection cannot survive into a list that no longer contains
 * those ids — a stale tick would make the button act on rows that are already gone.
 */
async function deleteSelected(): Promise<void> {
  const workflowId = props.workflowId;
  if (!workflowId || !hasCheckedRuns.value) {
    return;
  }
  deleting.value = true;
  deleteError.value = null;
  const ids = [...checkedRunIds.value];
  try {
    await deleteLabWorkflowRuns(workflowId, ids);
    clearChecked();
    await load();
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'Could not delete the selected runs';
  } finally {
    deleting.value = false;
  }
}

const runKind = computed<'manual' | 'live'>(() =>
  activeSubtab.value === 'test' ? 'manual' : 'live',
);

const emptyText = computed(() =>
  activeSubtab.value === 'test'
    ? 'No test runs yet. Use Test & run to try this workflow.'
    : 'No live runs yet. This workflow has not fired from an event, schedule, or webhook.',
);

/** Guards against a slow response for a previous subtab overwriting the current list. */
let requestToken = 0;

async function load(): Promise<void> {
  const workflowId = props.workflowId;
  if (!workflowId) {
    runs.value = [];
    return;
  }
  const token = ++requestToken;
  loading.value = true;
  error.value = null;
  try {
    const rows = await fetchLabWorkflowRuns(workflowId, { kind: runKind.value, limit: 200 });
    if (token !== requestToken) {
      return;
    }
    // A reload replaces the list, so any tick that survived would point at a row the user can no
    // longer see — and the bulk action would then act on ids that are not on screen.
    clearChecked();
    runs.value = rows;
  } catch (e) {
    if (token !== requestToken) {
      return;
    }
    runs.value = [];
    error.value = e instanceof Error ? e.message : 'Could not load runs';
  } finally {
    if (token === requestToken) {
      loading.value = false;
    }
  }
}

onMounted(() => void load());

watch(
  () => [props.workflowId, runKind.value] as const,
  () => void load(),
);

function openDetail(run: LabWorkflowRun): void {
  selectedRunId.value = run.id;
  detailVisible.value = true;
}

function statusLabel(status: LabWorkflowRunStatus): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'succeeded':
      return 'Succeeded';
    case 'partial':
      return 'Partial';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    default:
      return status;
  }
}

function statusIcon(status: LabWorkflowRunStatus): string {
  switch (status) {
    case 'running':
      return 'pi pi-spin pi-spinner';
    case 'succeeded':
      return 'pi pi-check-circle';
    case 'partial':
      return 'pi pi-exclamation-circle';
    case 'failed':
      return 'pi pi-times-circle';
    case 'skipped':
      return 'pi pi-minus-circle';
    default:
      return 'pi pi-circle';
  }
}

/** Compact single-line timestamp — hundreds of rows, so the date is abbreviated. */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fullWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function formatDuration(run: LabWorkflowRun): string {
  if (!run.finishedAt) {
    return run.status === 'running' ? 'running…' : '—';
  }
  const ms = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}
</script>

<template>
  <div class="lab-workflow-logs lab-workflow-sidebar__body" :id="generateUniqueId('lab-workflow-logs')">
    <Tabs
      v-model:value="activeSubtab"
      class="lab-workflow-logs__tabs"
      :pt="{ root: { attrs: { id: generateUniqueId('wf-logs-tabs') } } }"
    >
      <TabList>
        <Tab
          value="test"
          :pt="{ root: { attrs: { id: generateUniqueId('wf-logs-tab-test') } } }"
        >
          <i class="pi pi-play" aria-hidden="true" />
          <span>Test</span>
        </Tab>
        <Tab
          value="live"
          :pt="{ root: { attrs: { id: generateUniqueId('wf-logs-tab-live') } } }"
        >
          <i class="pi pi-bolt" aria-hidden="true" />
          <span>Live</span>
        </Tab>
      </TabList>

      <TabPanels>
        <TabPanel value="test">
          <div class="lab-workflow-logs__panel">
            <Message v-if="!workflowId" severity="info" :closable="false">
              Save this workflow to see its execution history.
            </Message>
            <Message v-else-if="error" severity="warn" :closable="false">
              Could not load runs: {{ error }}
            </Message>
            <p v-else-if="loading && runs.length === 0" class="lab-workflow-logs__empty">
              Loading runs…
            </p>
            <p v-else-if="runs.length === 0" class="lab-workflow-logs__empty">{{ emptyText }}</p>

            <!--
              Selection header: select-all on the left, bulk delete on the right.
              The delete button lives here rather than in the tab strip so it sits beside the control
              that produces the selection, and because the strip already carries the parent tabs, the
              sub-tabs and Refresh.
            -->
            <div v-if="runs.length > 0" class="lab-workflow-logs__select-all">
              <Checkbox
                :model-value="allChecked"
                binary
                :indeterminate="someChecked"
                :input-id="generateUniqueId('wf-logs-check-all-test')"
                aria-label="Select all runs"
                @update:model-value="(v) => toggleAll(v === true)"
              />
              <span>Select all</span>
              <Button
                v-if="hasCheckedRuns"
                :label="`Delete ${checkedRunIds.size}`"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                rounded
                :loading="deleting"
                :id="generateUniqueId('wf-logs-delete-selected-test')"
                aria-label="Delete selected runs"
                class="lab-workflow-logs__delete-selected"
                @click="deleteSelected"
              />
            </div>

            <!--
              Line items, not cards. A workflow can retain hundreds of runs, and a card per run puts
              roughly six on screen; one rule-separated line fits three times as many and still keeps
              status, time, trigger and duration scannable in fixed columns.

              No bullet glyph: the status is already carried by the icon and the row title, and a
              marker beside every row only competed with the checkbox for the same sliver of space.
            -->
            <ul v-if="runs.length > 0" class="lab-workflow-logs__list">
              <li v-for="run in runs" :key="run.id" class="lab-workflow-logs__row">
                <Checkbox
                  :model-value="isChecked(run.id)"
                  binary
                  :input-id="generateUniqueId(`wf-logs-check-${run.id}`)"
                  :aria-label="`Select run from ${fullWhen(run.startedAt)}`"
                  class="lab-workflow-logs__check"
                  @update:model-value="(v) => toggleChecked(run.id, v === true)"
                />
                <button
                  type="button"
                  class="lab-workflow-logs__row-btn"
                  :id="generateUniqueId(`wf-logs-row-${run.id}`)"
                  :title="`${statusLabel(run.status)} · ${fullWhen(run.startedAt)} — open details`"
                  @click="openDetail(run)"
                >
                  <i
                    :class="[statusIcon(run.status), `lab-workflow-logs__icon--${run.status}`]"
                    class="lab-workflow-logs__icon"
                    aria-hidden="true"
                  />
                  <span class="lab-workflow-logs__when">{{ formatWhen(run.startedAt) }}</span>
                  <span class="lab-workflow-logs__trigger">
                    {{ formatLabWorkflowTriggerType(run.triggerType) }}
                  </span>
                  <span class="lab-workflow-logs__duration">{{ formatDuration(run) }}</span>
                  <i class="pi pi-angle-right lab-workflow-logs__chevron" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </div>
        </TabPanel>
        <TabPanel value="live">
          <div class="lab-workflow-logs__panel">
            <Message v-if="!workflowId" severity="info" :closable="false">
              Save this workflow to see its execution history.
            </Message>
            <Message v-else-if="error" severity="warn" :closable="false">
              Could not load runs: {{ error }}
            </Message>
            <p v-else-if="loading && runs.length === 0" class="lab-workflow-logs__empty">
              Loading runs…
            </p>
            <p v-else-if="runs.length === 0" class="lab-workflow-logs__empty">{{ emptyText }}</p>

            <div v-if="runs.length > 0" class="lab-workflow-logs__select-all">
              <Checkbox
                :model-value="allChecked"
                binary
                :indeterminate="someChecked"
                :input-id="generateUniqueId('wf-logs-check-all-live')"
                aria-label="Select all runs"
                @update:model-value="(v) => toggleAll(v === true)"
              />
              <span>Select all</span>
              <Button
                v-if="hasCheckedRuns"
                :label="`Delete ${checkedRunIds.size}`"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                rounded
                :loading="deleting"
                :id="generateUniqueId('wf-logs-delete-selected-live')"
                aria-label="Delete selected runs"
                class="lab-workflow-logs__delete-selected"
                @click="deleteSelected"
              />
            </div>

            <ul v-if="runs.length > 0" class="lab-workflow-logs__list">
              <li v-for="run in runs" :key="run.id" class="lab-workflow-logs__row">
                <Checkbox
                  :model-value="isChecked(run.id)"
                  binary
                  :input-id="generateUniqueId(`wf-logs-check-${run.id}`)"
                  :aria-label="`Select run from ${fullWhen(run.startedAt)}`"
                  class="lab-workflow-logs__check"
                  @update:model-value="(v) => toggleChecked(run.id, v === true)"
                />
                <button
                  type="button"
                  class="lab-workflow-logs__row-btn"
                  :id="generateUniqueId(`wf-logs-row-${run.id}`)"
                  :title="`${statusLabel(run.status)} · ${fullWhen(run.startedAt)} — open details`"
                  @click="openDetail(run)"
                >
                  <i
                    :class="[statusIcon(run.status), `lab-workflow-logs__icon--${run.status}`]"
                    class="lab-workflow-logs__icon"
                    aria-hidden="true"
                  />
                  <span class="lab-workflow-logs__when">{{ formatWhen(run.startedAt) }}</span>
                  <span class="lab-workflow-logs__trigger">
                    {{ formatLabWorkflowTriggerType(run.triggerType) }}
                  </span>
                  <span class="lab-workflow-logs__duration">{{ formatDuration(run) }}</span>
                  <i class="pi pi-angle-right lab-workflow-logs__chevron" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <Message
      v-if="deleteError"
      severity="warn"
      :closable="false"
      class="lab-workflow-logs__delete-error"
    >
      {{ deleteError }}
    </Message>

    <!-- Positioned over the tab strip: the tablist is a single a11y role, so a refresh button
         cannot live inside it without breaking that ownership. -->
    <Button
      :id="generateUniqueId('wf-logs-refresh')"
      icon="pi pi-refresh"
      size="small"
      text
      rounded
      severity="secondary"
      aria-label="Refresh runs"
      title="Refresh"
      class="lab-workflow-logs__refresh"
      :loading="loading"
      @click="load"
    />

    <LabWorkflowRunDetailDialog
      v-model:visible="detailVisible"
      :workflow-id="workflowId"
      :run-id="selectedRunId"
    />
  </div>
</template>

<style scoped>
/*
 * The panel fills the sidebar body slot, so it drops that slot's padding and re-adds it inside the
 * tab panels. The body slot's own `overflow-y: auto` is turned off here because the scroll belongs to
 * the tab panel — otherwise the tab strip would scroll away with the list.
 */
.lab-workflow-logs {
  position: relative;
  /*
   * Gap from the parent tab strip above.
   *
   * On the panel root rather than the tablist: the sidebar body slot already owns that element's
   * padding, so a `padding-top` there was absorbed by it. Margin on the component root is the one
   * placement the parent cannot override.
   */
  margin-top: 0.85rem;
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.lab-workflow-logs__tabs {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
}

/* Match the parent sidebar tabs: bottom accent rule, transparent until active. */
.lab-workflow-logs__tabs :deep(.p-tablist) {
  /* Only Refresh overlays the strip now that Delete lives in the select-all row. */
  padding-right: 2.25rem;
}

.lab-workflow-logs__tabs :deep(.p-tab) {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-bottom: 2px solid transparent;
  font-size: 0.75rem;
  font-weight: 600;
}

.lab-workflow-logs__tabs :deep(.p-tab[data-p-active='true']) {
  border-bottom-color: var(--lab-accent-primary);
}

.lab-workflow-logs__tabs :deep(.p-tablist-active-bar),
.lab-workflow-logs__tabs :deep(.p-tablist [data-pc-section='activebar']) {
  display: none !important;
}

.lab-workflow-logs__tabs :deep(.p-tabpanels) {
  flex: 1 1 0;
  min-height: 0;
  padding: 0;
  background: transparent;
}

.lab-workflow-logs__tabs :deep(.p-tabpanel) {
  flex: 1 1 0;
  min-height: 0;
  padding: 0;
}

.lab-workflow-logs__refresh {
  position: absolute;
  top: 0.15rem;
  right: 0.35rem;
}

/*
 * Bulk action, right-aligned in the select-all row.
 *
 * `margin-left: auto` rather than absolute positioning: it must sit on the same baseline as the
 * select-all checkbox (which is what you are asking about), and it is only rendered when something
 * is ticked, so reserving space for it would leave a permanent gap.
 */
.lab-workflow-logs__delete-selected {
  margin-left: auto;
  font-size: 0.75rem;
}

.lab-workflow-logs__delete-error {
  margin: 0.35rem 0.75rem 0;
  font-size: 0.75rem;
}

.lab-workflow-logs__panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  min-height: 0;
  padding: 0.6rem 0.75rem;
  overflow-y: auto;
}

.lab-workflow-logs__empty {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--lab-general-text-muted);
}

/* Select-all row. Sits above the list with its own gap so it reads as a control, not a first row. */
.lab-workflow-logs__select-all {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.25rem 0.35rem;
  margin-bottom: 0.15rem;
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 22%, transparent);
  font-size: 0.75rem;
  color: var(--lab-general-text-muted);
}

.lab-workflow-logs__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/*
 * Rows are separated by a rule rather than a border per item, so adjacent rows do not double up and
 * the list keeps a single visual rhythm at any length.
 */
.lab-workflow-logs__row + .lab-workflow-logs__row {
  border-top: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 22%, transparent);
}

/*
 * Four fixed-ish columns plus a flexible trigger, not six. The sidebar is ~22rem wide, so a separate
 * text status column pushed the timestamp into wrapping; the status icon already carries the outcome,
 * and the row `title` spells it out. Tabular figures keep the timestamps aligned between rows.
 */
/*
 * Row is a flex line: checkbox, then the clickable body. The body keeps the grid so its columns stay
 * aligned across rows regardless of checkbox width.
 */
.lab-workflow-logs__row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.lab-workflow-logs__check {
  flex: 0 0 auto;
  /* Nudge to optically centre against the text baseline rather than the grid cell. */
  margin-top: -0.05rem;
}

.lab-workflow-logs__row-btn {
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
  grid-template-columns: 0.9rem auto 1fr auto 0.6rem;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  padding: 0.4rem 0.25rem;
  border: none;
  border-radius: 0.25rem;
  background: transparent;
  color: var(--lab-general-text);
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
}

.lab-workflow-logs__row-btn:hover {
  background: color-mix(in srgb, var(--lab-button-bg) 30%, transparent);
}

.lab-workflow-logs__row-btn:focus-visible {
  outline: 2px solid var(--lab-accent-primary);
  outline-offset: -2px;
}

.lab-workflow-logs__icon {
  font-size: 0.8125rem;
  justify-self: center;
}

.lab-workflow-logs__icon--succeeded {
  color: var(--lab-status-success, #4ade80);
}

.lab-workflow-logs__icon--failed {
  color: var(--lab-status-danger, #f87171);
}

.lab-workflow-logs__icon--partial {
  color: var(--lab-status-warning, #fbbf24);
}

.lab-workflow-logs__icon--skipped,
.lab-workflow-logs__icon--running {
  color: var(--lab-general-text-muted);
}

.lab-workflow-logs__when {
  font-variant-numeric: tabular-nums;
  color: var(--lab-general-text);
  white-space: nowrap;
}

.lab-workflow-logs__trigger {
  color: var(--lab-general-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lab-workflow-logs__duration {
  color: var(--lab-general-text-muted);
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.lab-workflow-logs__chevron {
  font-size: 0.6875rem;
  color: var(--lab-general-text-muted);
}
</style>
