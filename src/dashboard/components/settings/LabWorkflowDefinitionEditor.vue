<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabWorkflowDefinition } from '@/shared/types/lab-workflow';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import type { LabRuleRecord } from '@/shared/types/lab-rule';
import { fetchLabRules } from '@/shared/services/platform-lab-rules.client';
import { fetchActivePlatformUsersForClient } from '@/shared/services/platform-user-client';
import { ensureWorkflowGraphDefinition } from '@/shared/utils/lab-workflow-graph-migrate';
import { isLabWorkflowDefinitionV2 } from '@/shared/utils/lab-workflow-definition';
import { labWorkflowRunPathEdgeIds } from '@/shared/utils/lab-workflow-run-path-edges';
import type {
  LabWorkflowManualRunResult,
  LabWorkflowRunNodeVisualStatus,
} from '@/shared/types/lab-workflow-run';
import type { LabWorkflowRunStepStreamEvent } from '@/shared/types/lab-events-socket-events';
import LabWorkflowGraphCanvas from './lab-workflows/LabWorkflowGraphCanvas.vue';
import LabWorkflowGraphDetailPanel from './lab-workflows/LabWorkflowGraphDetailPanel.vue';
import LabWorkflowRunPanel from './lab-workflows/LabWorkflowRunPanel.vue';
import LabWorkflowLogsPanel from './lab-workflows/LabWorkflowLogsPanel.vue';

const props = defineProps<{
  modelValue: LabWorkflowDefinition;
  catalogEntries: LabDomainEventCatalogEntry[];
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
  adminMode: boolean;
  /**
   * The persisted workflow this graph belongs to, or `null` for an unsaved draft.
   *
   * A run is executed server-side against the **stored** definition, not the in-memory edits, so an
   * unsaved graph cannot be run — the panel says so rather than running something else and
   * presenting the result as if it belonged to what is on screen.
   */
  workflowId?: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LabWorkflowDefinition];
}>();

const { generateUniqueId } = useUniqueElementId();

/** Sidebar tabs — details, run/test and logs share the right column. */
const SIDEBAR_TABS = [
  { id: 'details', label: 'Details', icon: 'pi pi-sliders-h' },
  { id: 'run', label: 'Test & run', icon: 'pi pi-play' },
  { id: 'logs', label: 'Logs', icon: 'pi pi-list' },
] as const;

const sidebarTab = ref<(typeof SIDEBAR_TABS)[number]['id']>('details');

/**
 * Picking something on the canvas means "tell me about this", so the Details tab comes forward.
 *
 * Without this, an author who last used Logs or Test & run clicks a node and nothing visibly happens:
 * the selection is registered, the panel updates — off screen. Selecting is an explicit request for
 * the inspector, so it wins over whatever tab happened to be open. Clearing the selection (pane
 * click) is deliberately ignored, so a stray click on empty canvas does not yank the author out of
 * the run panel mid-test.
 */
function onCanvasSelectionChange(): void {
  sidebarTab.value = 'details';
}

const rules = ref<LabRuleRecord[]>([]);
const rulesLoading = ref(false);
const labUsers = ref<{ label: string; value: number }[]>([]);

const graphDefinition = computed({
  get(): LabWorkflowDefinitionV2 {
    return ensureWorkflowGraphDefinition(props.modelValue);
  },
  set(value: LabWorkflowDefinitionV2) {
    emit('update:modelValue', value);
  },
});

const graphCanvasRef = ref<InstanceType<typeof LabWorkflowGraphCanvas> | null>(null);

/** Dashed edge animation on the canvas after Test / Run (cleared when the graph is edited). */
const runHighlightEdgeIds = ref<string[]>([]);

/** Node id → colour state, driven **only** by the live stream. */
const runNodeStatus = ref<Record<string, LabWorkflowRunNodeVisualStatus>>({});

/**
 * Set when a run finished without producing any stream events.
 *
 * Surfaced to the author rather than silently repaired: see `onRunComplete`.
 */
const runStreamError = ref<string | null>(null);

/** Whether any node event arrived for this run. */
let streamedDuringRun = false;

/**
 * Presentation pace, per mode.
 *
 * Streaming is honest — events arrive as nodes execute — but a preview against a local graph
 * finishes in a few milliseconds, so "live" and "all at once" are the same thing to a human. A
 * preview is therefore paced slowly enough to read: one transition per second.
 *
 * ## Why a real run still needs *some* gap
 *
 * A real run takes real time, so its events already arrive spread out and no artificial delay is
 * wanted. But "no delay" cannot mean "drain the queue synchronously": several events routinely
 * arrive in the same tick (a loop pass emits wait → code → loop with no I/O between them), and
 * applying them in one synchronous loop lets Vue paint only the **final** state. The canvas then
 * shows one pass of a three-pass loop and no visible wait, even though the run log is correct.
 *
 * A short gap per transition forces a render between events. Measured against a 6 s run, 11
 * transitions cost ~1.3 s — enough to see each pass and each wait settle, small enough not to
 * misrepresent the run.
 */
const RUN_PREVIEW_PACE_MS = 1000;
const RUN_REAL_PACE_MS = 120;

interface QueuedRunStep {
  nodeId: string;
  status: LabWorkflowRunNodeVisualStatus;
}

/** Events waiting to be shown, in arrival order. */
let stepQueue: QueuedRunStep[] = [];
let paceTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Whether the current run is a rehearsal, so narration is paced.
 *
 * The doc comment on `RUN_PREVIEW_PACE_MS` always said "previews only", but nothing ever told this
 * component which mode it was in — so every run, preview or real, was paced at one transition per
 * second. For a real run that is actively wrong: it took 6 real seconds and the canvas still showed
 * a queue, which reads as "the waits did not happen" and as nodes never settling.
 *
 * A real run is never paced. It has already written data, so the events are a record, not a show.
 */
let paceNarration = false;
/** Nodes already displayed, in display order, so edges light progressively. */
let displayedNodeIds = new Set<string>();

function stopPacing(): void {
  if (paceTimer !== null) {
    clearTimeout(paceTimer);
    paceTimer = null;
  }
}

function clearRunVisuals(): void {
  stopPacing();
  stepQueue = [];
  displayedNodeIds = new Set();
  runHighlightEdgeIds.value = [];
  runNodeStatus.value = {};
  runStreamError.value = null;
}

/** Light up edges between the nodes already settled, so the path grows with the narration. */
function refreshRunHighlightEdges(): void {
  // Positions come from the displayed order, which is the queue's order — not the graph's node
  // array. Only `nodeId` is read by the path helper, so the rest is a minimal placeholder.
  const orderedNodeIds = [...displayedNodeIds];
  runHighlightEdgeIds.value = labWorkflowRunPathEdgeIds(
    graphDefinition.value.edges,
    orderedNodeIds.map((nodeId) => ({
      nodeId,
      nodeKind: '',
      status: 'succeeded' as const,
      itemsInCount: 0,
      itemsOutCount: 0,
      durationMs: 0,
      detail: null,
      error: null,
    })),
  );
}

/**
 * Show one queued transition and schedule the next.
 *
 * Edges are recomputed from the displayed order rather than the raw step list, because the queue may
 * be mid-drain and the two would otherwise disagree about which segment is currently lit.
 */
function drainStepQueue(): void {
  if (paceTimer !== null) {
    return;
  }
  const next = stepQueue.shift();
  if (!next) {
    // Drained. The queue has shown everything the stream sent; the panel owns the recorded outcome.
    return;
  }
  applyQueuedStep(next);
  // Both modes yield to the renderer between transitions; only the gap differs. Draining
  // synchronously for a real run collapsed same-tick events into one paint.
  paceTimer = setTimeout(() => {
    paceTimer = null;
    drainStepQueue();
  }, paceNarration ? RUN_PREVIEW_PACE_MS : RUN_REAL_PACE_MS);
}

function applyQueuedStep(step: QueuedRunStep): void {
  runNodeStatus.value = { ...runNodeStatus.value, [step.nodeId]: step.status };
  if (step.status !== 'running') {
    displayedNodeIds.add(step.nodeId);
    refreshRunHighlightEdges();
  }
}

/**
 * Apply every remaining queued step immediately.
 *
 * ## Why the pacing queue must be flushed at the end
 *
 * Previews are paced at one transition per second so the narration is watchable. A real run finishes
 * in a fraction of that, so at the moment the run completes there are usually several transitions
 * still queued — and any node whose `running` is already applied but whose settled event is still in
 * the queue stays painted blue indefinitely, because nothing forces the queue to drain.
 *
 * That is exactly the "second IF / loop never turned green" report: the node ran and succeeded, the
 * event was received, and it was simply never displayed.
 *
 * Draining synchronously (rather than waiting) is correct here: the run is over, so there is nothing
 * left to narrate — the remaining events are just the final states of nodes that already finished.
 */
function flushStepQueue(): void {
  stopPacing();
  while (stepQueue.length > 0) {
    const next = stepQueue.shift();
    if (next) {
      applyQueuedStep(next);
    }
  }
}

/**
 * True between `run-started` and `run-complete`.
 *
 * The run response and the socket are independent channels: the HTTP call resolves when the graph
 * finishes, which can be **before** the last stream event has been delivered. Once this is false,
 * arriving events are applied immediately instead of queued — otherwise a late `succeeded` lands
 * behind the 1 s pacing timer after the flush has already run, and the node it settles sits blue
 * until that timer fires (or, if nothing else is queued, appears to never settle).
 */
let runInFlight = false;

function onRunStarted(event?: { dryRun?: boolean }): void {
  clearRunVisuals();
  streamedDuringRun = false;
  runInFlight = true;
  paceNarration = event?.dryRun === true;
}

/**
 * A node transition from the running graph — the **only** source of canvas state.
 *
 * Queued rather than applied on arrival: the graph finishes faster than a person can watch, so
 * painting each event as it lands is indistinguishable from painting them all at the end.
 */
function onRunStep(event: LabWorkflowRunStepStreamEvent): void {
  streamedDuringRun = true;
  const queued = { nodeId: event.nodeId, status: event.status };
  if (!runInFlight) {
    // A straggler: the run already ended, so there is nothing left to narrate. Apply it now rather
    // than pacing it behind events the author has already seen.
    applyQueuedStep(queued);
    return;
  }
  stepQueue.push(queued);
  drainStepQueue();
}

/**
 * Close out a run.
 *
 * There is deliberately **no fallback**: the stream is the only source of canvas state, so a run
 * that produced no events is a broken stream, and it must look broken. Synthesising an animation
 * from `result.steps` would render an identical picture whether the socket worked or not, which is
 * precisely how a silent regression survives. The run panel already shows the recorded steps, so the
 * data is not lost — only the canvas refuses to pretend.
 */
function onRunComplete(result: LabWorkflowManualRunResult | null): void {
  if (!result) {
    // The run failed to produce a result. No events are expected to follow, so stop treating
    // stragglers as narrative and let the canvas clear.
    runInFlight = false;
    clearRunVisuals();
    return;
  }
  runInFlight = false;
  if (!streamedDuringRun) {
    stopPacing();
    stepQueue = [];
    runNodeStatus.value = {};
    runHighlightEdgeIds.value = [];
    runStreamError.value =
      `No run events arrived for this ${result.dryRun ? 'preview' : 'run'}. ` +
      'The canvas is left blank because the live stream is the only source of node status — ' +
      'see the step list below for what executed.';
    return;
  }
  runStreamError.value = null;
  runInFlight = false;
  // The run is over, so any transitions still queued are final states that must be shown — a node
  // whose `running` was applied but whose `succeeded` is still queued would otherwise stay blue.
  flushStepQueue();
  reconcileUnsettledNodes(result);
  /*
   * Stop the edge animation now the run has finished.
   *
   * `runHighlightEdgeIds` marks the path *in flight*; leaving it set meant the dashed animation kept
   * running on every edge of the last run until the graph was edited or another run started. The node
   * colours are the record of the outcome, so the travelling dashes have nothing left to indicate.
   */
  runHighlightEdgeIds.value = [];
}

/**
 * Settle any node the stream left `running`, using the run response.
 *
 * ## Why this is not the "synthesised animation" the comment below forbids
 *
 * That rule protects against faking *narration*: if no events arrived, the canvas must not invent a
 * replay from `result.steps`, because an identical picture would hide a broken socket. This is the
 * opposite situation — events did arrive, they painted the graph, and the stream then dropped one
 * during the tail of the run, leaving a node pulsing blue forever while the run history says it
 * succeeded.
 *
 * The response is explicitly documented as the source of truth for **final state**, and that is all
 * this uses it for: the terminal status of nodes still mid-flight. It cannot fabricate an animation,
 * because every node it touches is already being displayed with a status.
 *
 * Without it, a lost tail event is unrecoverable in the UI — the only remedy is to run again.
 */
function reconcileUnsettledNodes(result: LabWorkflowManualRunResult): void {
  const settledFromRun = new Map<string, LabWorkflowRunNodeVisualStatus>();
  for (const step of result.steps) {
    settledFromRun.set(step.nodeId, step.status);
  }
  let changed = false;
  const next = { ...runNodeStatus.value };
  for (const [nodeId, status] of Object.entries(next)) {
    if (status !== 'running') {
      continue;
    }
    const settled = settledFromRun.get(nodeId);
    if (!settled) {
      continue;
    }
    next[nodeId] = settled;
    displayedNodeIds.add(nodeId);
    changed = true;
  }
  if (!changed) {
    return;
  }
  runNodeStatus.value = next;
  refreshRunHighlightEdges();
}

watch(
  () => graphDefinition.value,
  () => {
    clearRunVisuals();
  },
  { deep: true },
);

onBeforeUnmount(stopPacing);

/** Pull node positions (and viewport) from Vue Flow into the v-model before save. */
function flushWorkflowDefinition(): LabWorkflowDefinition {
  const snapshot = graphCanvasRef.value?.exportGraphDefinition();
  if (snapshot) {
    emit('update:modelValue', snapshot);
    return snapshot;
  }
  return props.modelValue;
}

defineExpose({ flushWorkflowDefinition });

const triggerNode = computed(() => {
  const trigger = graphDefinition.value.nodes.find((node) => node.kind === 'trigger');
  return trigger?.kind === 'trigger' ? trigger : null;
});

const triggerNodeId = computed(() => triggerNode.value?.id ?? null);

onMounted(() => {
  if (!isLabWorkflowDefinitionV2(props.modelValue)) {
    emit('update:modelValue', ensureWorkflowGraphDefinition(props.modelValue));
  }
  rulesLoading.value = true;
  void fetchLabRules()
    .then((list) => {
      rules.value = list;
    })
    .catch(() => {
      rules.value = [];
    })
    .finally(() => {
      rulesLoading.value = false;
    });
  void fetchActivePlatformUsersForClient()
    .then((users) => {
      labUsers.value = users.map((user) => ({
        label: user.name ? `${user.name} (${user.email ?? user.userId})` : String(user.userId),
        value: user.userId,
      }));
    })
    .catch(() => {
      labUsers.value = [];
    });
});
</script>

<template>
  <div
    class="lab-workflow-definition-editor"
    :id="generateUniqueId('lab-workflow-definition-editor')"
  >
    <div class="lab-workflow-graph-workspace">
      <LabWorkflowGraphCanvas
        ref="graphCanvasRef"
        class="lab-workflow-graph-canvas-host"
        v-model="graphDefinition"
        :workflow-id="workflowId ?? null"
        :catalog-entries="catalogEntries"
        :integration-service-catalog="integrationServiceCatalog"
        :rules="rules"
        :rules-loading="rulesLoading"
        :lab-users="labUsers"
        :admin-mode="adminMode"
        :run-highlight-edge-ids="runHighlightEdgeIds"
        :run-node-status="runNodeStatus"
        @rule-created="(rule) => (rules = [...rules, rule])"
        @selection-change="onCanvasSelectionChange"
      >
        <!--
          Right sidebar tabs. Details and Test & run share the column and are never both visible;
          the canvas hands over its detail-panel bindings instead of rendering the panel itself, so
          the tab body is the only thing in this column.
        -->
        <template #sidebar="{ detailPanelProps, detailPanelHandlers }">
          <div class="lab-workflow-sidebar">
            <div class="lab-workflow-sidebar__tabs" role="tablist">
              <button
                v-for="tab in SIDEBAR_TABS"
                :key="tab.id"
                :id="generateUniqueId(`wf-sidebar-tab-${tab.id}`)"
                type="button"
                role="tab"
                class="lab-workflow-sidebar__tab"
                :class="{ 'is-active': sidebarTab === tab.id }"
                :aria-selected="sidebarTab === tab.id"
                @click="sidebarTab = tab.id"
              >
                <i :class="tab.icon" aria-hidden="true" />
                <span>{{ tab.label }}</span>
              </button>
            </div>
            <LabWorkflowGraphDetailPanel
              v-if="sidebarTab === 'details'"
              class="lab-workflow-sidebar__body"
              v-bind="detailPanelProps"
              @update:node="detailPanelHandlers.onUpdateNode"
              @update:edge="detailPanelHandlers.onUpdateEdge"
              @delete:node="detailPanelHandlers.onDeleteNode"
              @delete:edge="detailPanelHandlers.onDeleteEdge"
            />
            <!-- Adding `lab-workflow-sidebar__body` here too would double the body padding: the
                 panel owns that class itself so it can switch the slot's scroll off and let the tab
                 panel do the scrolling. -->
            <LabWorkflowLogsPanel
              v-else-if="sidebarTab === 'logs'"
              :workflow-id="workflowId ?? null"
            />
            <LabWorkflowRunPanel
              v-else
              class="lab-workflow-sidebar__body"
              :workflow-id="workflowId ?? null"
              :trigger-node-id="triggerNodeId"
              :trigger-event-type="triggerNode?.eventType ?? null"
              :catalog-entries="catalogEntries"
              :graph-definition="graphDefinition"
              :run-stream-error="runStreamError"
              @run-started="onRunStarted"
              @run-complete="onRunComplete"
              @run-step="onRunStep"
            />
          </div>
        </template>
      </LabWorkflowGraphCanvas>
    </div>
  </div>
</template>
