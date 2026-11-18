<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { Socket } from 'socket.io-client';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  formCheckboxPt,
  formSelectPt,
  withFormControlRootId,
} from '@/shared/forms/form-control-pt';
import {
  armLabWorkflowListen,
  deleteLabWorkflowMockSample,
  disarmLabWorkflowListen,
  fetchLabWorkflowListen,
  fetchLabWorkflowMockSamples,
  fetchLabWorkflowRequiredApps,
  prepareLabWorkflowRequiredApps,
  runLabWorkflow,
} from '@/shared/services/platform-lab-workflows.client';
import type { LabWorkflowRequiredAppStatus } from '@/shared/types/lab-workflow-required-apps';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabDomainEventPublishInput } from '@/shared/types/schemas/lab-domain-event-schema';
import {
  LAB_EVENTS_SOCKET,
  type LabWorkflowRunStepStreamEvent,
} from '@/shared/types/lab-events-socket-events';
import { connectLabEventsSocket } from '@/shared/composables/useLabNotifications';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import type {
  LabWorkflowManualRunResult,
  LabWorkflowManualRunStep,
} from '@/shared/types/lab-workflow-run';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { labWorkflowGraphNodeLabel } from '@/shared/utils/lab-workflow-graph-labels';
import type { LabWorkflowMockSample } from '@/shared/types/lab-workflow-mock-sample';
import type { ArmedWorkflowListen } from '@/shared/types/lab-workflow-listen';
import LabWorkflowTriggerEventBadge from './LabWorkflowTriggerEventBadge.vue';
import {
  listWorkflowTriggerTestScenarios,
  workflowTriggerPayloadSummaryEntries,
} from '@/shared/utils/lab-workflow-trigger-test-scenarios';

/**
 * Run / Test panel (W5a + W5b).
 *
 * ## One button, and a checkbox that means what it says
 *
 * The panel used to have **two** buttons — Test (always `dryRun: true`) and Run for real (enabled
 * only once a checkbox was ticked). That read as two independent actions, so ticking "Also send
 * notifications and write data" and then pressing **Test** looked like it should send, and quietly
 * did nothing. The checkbox was wired to `:disabled` on the *other* button; nothing in the UI said
 * so. Now the checkbox **is** the mode: it decides `dryRun`, the button label says which mode is
 * live, and pressing it always does what the label says.
 *
 * Preview stays the default and sending is still opt-in, which was the whole point of the old
 * checkbox — a checkbox that must be *ticked* also shows the current state of the panel to an
 * author who forgot, which a confirm dialog does not.
 *
 * ## Why "Test with…" sits next to Test
 *
 * A dry run against a synthesised empty payload answers "does the graph hold together". It cannot
 * answer "does it work with the shape my webhook actually sends" — the author does not know that
 * shape until they have seen it once. A saved sample is how that shape becomes reusable, and W5c's
 * listen captures will land in the same list.
 *
 * ## Why results and validation issues share one panel
 *
 * "Does this graph work?" and "is this graph even valid?" are the same question to the person
 * looking at it. They arrive from two sources — the run response and the validator — but showing
 * them apart would mean checking two places for one answer.
 */

const props = defineProps<{
  workflowId: string | null;
  /** The trigger node id — a sample is scoped to the trigger whose shape it describes. */
  triggerNodeId?: string | null;
  triggerEventType?: string | null;
  catalogEntries?: LabDomainEventCatalogEntry[];
  graphDefinition?: LabWorkflowDefinitionV2 | null;
  /**
   * Set when the run produced no stream events. Rendered as an error, never repaired: a blank canvas
   * would otherwise be indistinguishable from a stream that silently stopped working.
   */
  runStreamError?: string | null;
}>();

const emit = defineEmits<{
  /**
   * The run's mode, so the canvas knows whether to pace its narration.
   *
   * A preview is paced (the graph finishes in milliseconds and needs to be watchable); a real run is
   * not (it has already written data, and delaying the reveal misrepresents how long it took).
   */
  'run-started': [event: { dryRun: boolean }];
  'run-complete': [result: LabWorkflowManualRunResult | null];
  /** One node transition, streamed live while the run executes. */
  'run-step': [event: LabWorkflowRunStepStreamEvent];
}>();

const { generateUniqueId } = useUniqueElementId();

const running = ref(false);
const result = ref<LabWorkflowManualRunResult | null>(null);
const error = ref<string | null>(null);
const allowSideEffects = ref(false);

const reallyRunId = generateUniqueId('wf-run-allow-side-effects');
const reallyRunControlId = generateUniqueId('wf-run-allow-side-effects-control');
const payloadDetailsId = generateUniqueId('wf-run-payload-details');

const samples = ref<LabWorkflowMockSample[]>([]);
const samplesLoading = ref(false);
const selectedPick = ref<string | null>(null);
const sampleError = ref<string | null>(null);
const sampleDeleteBusyId = ref<string | null>(null);

/** Payload detail is click-to-open: the sample value is rarely what the author is checking. */
const showPayloadDetails = ref(false);

const listen = ref<ArmedWorkflowListen | null>(null);
const listenBusy = ref(false);
const listenError = ref<string | null>(null);
const listenAllowSideEffects = ref(false);

const listenRealRunId = generateUniqueId('wf-listen-allow-side-effects');
const listenRealRunControlId = generateUniqueId('wf-listen-allow-side-effects-control');

const prepareAppsBeforeTestId = generateUniqueId('wf-run-prepare-apps');
const prepareAppsBeforeTestControlId = generateUniqueId('wf-run-prepare-apps-control');

const requiredApps = ref<LabWorkflowRequiredAppStatus[]>([]);
const requiredAppsLoading = ref(false);
const requiredAppsError = ref<string | null>(null);
const prepareAppsBeforeTest = ref(true);
const preparingApps = ref(false);

/** Seconds left on the arm, so "waiting" has a visible end rather than an indefinite spinner. */
const listenSecondsLeft = ref(0);
let listenTicker: ReturnType<typeof setInterval> | null = null;

const canAct = computed(() => Boolean(props.workflowId) && !running.value);

/** Errors block a save, so they are worth surfacing before the run too. */
const blockingIssues = computed(() =>
  (result.value?.issues ?? []).filter((issue) => issue.severity === 'error'),
);

const warningIssues = computed(() =>
  (result.value?.issues ?? []).filter((issue) => issue.severity === 'warning'),
);

/**
 * Whether this trigger fires from a webhook delivery rather than the event bus.
 *
 * `sourceAppId` is the precise signal; `dynamicPayload` is checked as well because a webhook is the
 * only trigger whose shape is caller-defined, so either alone identifies it. Used only to explain
 * what Listen is waiting for — an event trigger waits passively, a webhook waits for *someone to call
 * the URL*.
 */
const isWebhookTrigger = computed(() => {
  const eventType = props.triggerEventType ?? '';
  const entry = (props.catalogEntries ?? []).find((row) => row.eventType === eventType);
  return entry?.sourceAppId === 'platform-webhook' || entry?.dynamicPayload === true;
});

const builtinScenarios = computed(() =>
  listWorkflowTriggerTestScenarios(props.triggerEventType ?? '', props.catalogEntries ?? []),
);

/** Samples for the trigger being edited — a workflow may have more than one trigger later. */
const samplesForTrigger = computed(() => {
  const triggerId = props.triggerNodeId;
  if (!triggerId) {
    return samples.value;
  }
  return samples.value.filter((sample) => sample.triggerNodeId === triggerId);
});

const samplePickerGroups = computed(() => {
  const groups: { label: string; items: { label: string; value: string }[] }[] = [];
  if (builtinScenarios.value.length) {
    groups.push({
      label: 'Ready-made samples',
      items: builtinScenarios.value.map((scenario) => ({
        label: scenario.name,
        value: `builtin:${scenario.id}`,
      })),
    });
  }
  if (samplesForTrigger.value.length) {
    groups.push({
      label: 'Your saved samples',
      items: samplesForTrigger.value.map((sample) => ({
        label: sample.capturedAt
          ? `${sample.name} · captured ${sample.capturedAt.slice(0, 10)}`
          : sample.name,
        value: `saved:${sample.id}`,
      })),
    });
  }
  return groups;
});

const flatSampleOptions = computed(() =>
  samplePickerGroups.value.flatMap((group) => group.items),
);

const selectedBuiltinScenario = computed(() => {
  const pick = selectedPick.value;
  if (!pick?.startsWith('builtin:')) {
    return null;
  }
  const id = pick.slice('builtin:'.length);
  return builtinScenarios.value.find((scenario) => scenario.id === id) ?? null;
});

const selectedScenarioLead = computed(() => selectedBuiltinScenario.value?.lead ?? null);

const selectedEnvelopePreview = computed(() => {
  if (selectedBuiltinScenario.value) {
    return selectedBuiltinScenario.value.buildEnvelope();
  }
  const pick = selectedPick.value;
  if (!pick?.startsWith('saved:')) {
    return null;
  }
  const sampleId = pick.slice('saved:'.length);
  const sample = samples.value.find((row) => row.id === sampleId);
  if (!sample) {
    return null;
  }
  try {
    return JSON.parse(sample.envelopeJson) as LabDomainEventPublishInput;
  } catch {
    return null;
  }
});

const payloadSummaryEntries = computed(() => {
  const envelope = selectedEnvelopePreview.value;
  if (!envelope) {
    return [];
  }
  return workflowTriggerPayloadSummaryEntries(envelope, props.catalogEntries ?? []);
});

const payloadSummaryFieldCount = computed(() => {
  if (!selectedEnvelopePreview.value) {
    return 0;
  }
  return payloadSummaryEntries.value.length || 1;
});

/** Expanded step indices in the result list. Collapsed by default. */
const expandedStepIndexes = ref(new Set<number>());

function isStepExpanded(index: number): boolean {
  return expandedStepIndexes.value.has(index);
}

function toggleStepExpanded(index: number): void {
  const next = new Set(expandedStepIndexes.value);
  if (next.has(index)) {
    next.delete(index);
  } else {
    next.add(index);
  }
  expandedStepIndexes.value = next;
}

/** Icon per outcome, so the collapsed list can be scanned without opening anything. */
function runStepStatusIcon(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'pi pi-check-circle';
    case 'failed':
      return 'pi pi-times-circle';
    case 'skipped':
      return 'pi pi-minus-circle';
    default:
      return 'pi pi-circle';
  }
}

function runStepStatusIconClass(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'text-green-400';
    case 'failed':
      return 'text-red-400';
    case 'skipped':
      return 'text-lab-general-text-muted';
    default:
      return 'text-lab-general-text-muted';
  }
}

function runStepTitle(nodeId: string): string {
  const node = props.graphDefinition?.nodes.find((row) => row.id === nodeId);
  if (!node) {
    return 'Workflow step';
  }
  return labWorkflowGraphNodeLabel(node, { catalogEntries: props.catalogEntries ?? [] });
}

function runStepSummaryLines(step: LabWorkflowManualRunStep): string[] {
  const detail = step.detail as Record<string, unknown> | null;
  if (!detail) {
    return [];
  }
  if (detail.deferred === true && typeof detail.resumeAt === 'string') {
    // Phase 36: the run genuinely paused. Saying *when* it continues keeps "running" in the status
    // tag from being read as "still executing".
    return [
      `Suspended — the run continues at ${detail.resumeAt}.`,
      'The remaining nodes run later, on the platform clock (within a minute of that instant).',
    ];
  }
  if (step.nodeKind === 'trigger') {
    const fields = detail.sampleFields;
    if (fields && typeof fields === 'object') {
      const lines = Object.entries(fields as Record<string, string>).map(
        ([key, value]) => `${key}: ${value}`,
      );
      if (lines.length) {
        return ['Event data used for this test:', ...lines];
      }
    }
    return ['Workflow started with the selected sample.'];
  }
  if (detail.stepKind === 'if_condition') {
    if (detail.matched === true) {
      return ['Condition passed (Yes branch).'];
    }
    if (detail.matched === false) {
      return ['Condition did not pass (No branch).'];
    }
  }
  if (detail.matched === true) {
    return ['Matched — continued on the Yes / match path.'];
  }
  if (detail.matched === false) {
    return ['Did not match — continued on the No path.'];
  }
  if (detail.dryRun === true && Array.isArray(detail.wouldNotifyUserIds)) {
    const ids = detail.wouldNotifyUserIds as number[];
    if (ids.length) {
      return [`Would notify user id: ${ids.join(', ')} (nothing sent in preview).`];
    }
    return ['No recipient resolved for this notification in preview.'];
  }
  if (typeof detail.conditionError === 'string') {
    return ['Could not check linked record — treated as No.', detail.conditionError];
  }
  return [];
}

function statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'danger';
    case 'partial':
      return 'warn';
    default:
      return 'info';
  }
}

function requiredAppReadinessLabel(row: LabWorkflowRequiredAppStatus): string {
  switch (row.readiness) {
    case 'ready':
      return row.hosting === 'platform_backend' ? 'Ready (platform)' : 'Running';
    case 'stopped':
      return 'Not running';
    case 'disabled':
      return 'Disabled in catalog';
    case 'browser_only':
      return 'Browser app';
    default:
      return 'Unknown';
  }
}

function requiredAppDotStyle(row: LabWorkflowRequiredAppStatus): Record<string, string> {
  let color = 'var(--lab-general-text-muted)';
  if (row.readiness === 'ready' || row.readiness === 'browser_only') {
    color = 'var(--lab-success, #22c55e)';
  } else if (row.readiness === 'stopped') {
    color = 'var(--lab-warning, #eab308)';
  } else if (row.readiness === 'disabled') {
    color = 'var(--lab-danger, #ef4444)';
  }
  return { backgroundColor: color };
}

const launchableAppsNeedingStart = computed(() =>
  requiredApps.value.filter((row) => row.launchable && row.readiness !== 'ready'),
);

async function loadRequiredApps(): Promise<void> {
  if (!props.workflowId) {
    requiredApps.value = [];
    return;
  }
  requiredAppsLoading.value = true;
  requiredAppsError.value = null;
  try {
    const summary = await fetchLabWorkflowRequiredApps(props.workflowId);
    requiredApps.value = summary.apps;
  } catch (err) {
    requiredAppsError.value = err instanceof Error ? err.message : 'Could not load apps for this workflow';
    requiredApps.value = [];
  } finally {
    requiredAppsLoading.value = false;
  }
}

/**
 * Start the catalog apps this graph needs.
 *
 * Called by the explicit "Start required apps" button and by both mode checkboxes: ticking either
 * one means the next action genuinely talks to an app server, so the app comes up now rather than
 * mid-run. Repeated ticks are cheap — the backend health-checks before launching and returns
 * immediately for apps that are already healthy.
 *
 * Returns whether every launchable app is ready, so the Listen path can refuse to arm against
 * stopped servers.
 */
async function startRequiredApps(): Promise<boolean> {
  if (!props.workflowId) {
    return false;
  }
  preparingApps.value = true;
  requiredAppsError.value = null;
  try {
    const result = await prepareLabWorkflowRequiredApps(props.workflowId);
    requiredApps.value = result.apps;
    if (!result.allLaunchableReady && result.message) {
      requiredAppsError.value = result.message;
    }
    return result.allLaunchableReady;
  } catch (err) {
    requiredAppsError.value = err instanceof Error ? err.message : 'Could not start required apps';
    return false;
  } finally {
    preparingApps.value = false;
  }
}

/**
 * Either checkbox flipped on ⇒ bring the app backends up.
 *
 * Both modes need them: a real run performs connector calls, and a preview resolves them against
 * live catalog data. Only the transition to `true` triggers a launch, so unticking never starts
 * anything, and the `preparingApps` guard collapses rapid double-clicks.
 */
async function onModeToggled(enabled: boolean): Promise<void> {
  if (!enabled || preparingApps.value) {
    return;
  }
  await startRequiredApps();
}

function runStatusLabel(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'Succeeded';
    case 'failed':
      return 'Failed';
    case 'partial':
      return 'Partial';
    case 'skipped':
      return 'Skipped';
    default:
      return status;
  }
}

async function loadSamples(): Promise<void> {
  if (!props.workflowId) {
    samples.value = [];
    selectedPick.value = null;
    return;
  }
  samplesLoading.value = true;
  sampleError.value = null;
  try {
    samples.value = await fetchLabWorkflowMockSamples(props.workflowId);
    ensureDefaultSamplePick();
  } catch (err) {
    sampleError.value = err instanceof Error ? err.message : 'Could not load mock payloads';
    samples.value = [];
  } finally {
    samplesLoading.value = false;
  }
}

function ensureDefaultSamplePick(): void {
  const pick = selectedPick.value;
  if (pick && flatSampleOptions.value.some((option) => option.value === pick)) {
    return;
  }
  const firstBuiltin = builtinScenarios.value[0];
  if (firstBuiltin) {
    selectedPick.value = `builtin:${firstBuiltin.id}`;
    return;
  }
  const firstSaved = samplesForTrigger.value[0];
  if (firstSaved) {
    selectedPick.value = `saved:${firstSaved.id}`;
    return;
  }
  selectedPick.value = null;
}

async function removeSample(sampleId: string): Promise<void> {
  if (!props.workflowId) {
    return;
  }
  sampleError.value = null;
  sampleDeleteBusyId.value = sampleId;
  try {
    await deleteLabWorkflowMockSample(props.workflowId, sampleId);
    if (selectedPick.value === `saved:${sampleId}`) {
      selectedPick.value = null;
    }
    await loadSamples();
  } catch (err) {
    sampleError.value = err instanceof Error ? err.message : 'Could not delete this saved capture';
  } finally {
    sampleDeleteBusyId.value = null;
  }
}

function stopListenTicker(): void {
  if (listenTicker) {
    clearInterval(listenTicker);
    listenTicker = null;
  }
  listenSecondsLeft.value = 0;
}

/**
 * Count down locally; the server remains the authority on whether the arm is still live.
 *
 * While armed, this also polls the arm and the sample list. A capture happens **out of band** — the
 * caller POSTs the webhook, not this tab — so without polling a delivered payload would only appear
 * after a remount, which is exactly when the author is looking at the panel waiting for it.
 */
function startListenTicker(expiresAt: number): void {
  stopListenTicker();
  const tick = () => {
    listenSecondsLeft.value = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (listenSecondsLeft.value === 0) {
      // The local view expires itself rather than polling for the server's verdict: if the arm is
      // gone, showing "armed" for even a moment is the mistake this feature must not make.
      listen.value = null;
      stopListenTicker();
      return;
    }
    // One poll per second is cheap (two reads) and matches the countdown the author already sees.
    void pollWhileArmed();
  };
  tick();
  listenTicker = setInterval(tick, 1000);
}

/**
 * Notice that the arm was consumed, and surface the payload it captured.
 *
 * The arm disappears when a delivery matches it (`takeMatchingListens` removes it), so "was armed,
 * now is not" is the signal that something arrived. The captured envelope was saved as a mock sample,
 * so reloading the list makes it selectable — and selecting it immediately is the point: the author
 * pressed Listen to get a body they could replay, so making them find it in a dropdown undoes that.
 */
async function pollWhileArmed(): Promise<void> {
  if (!props.workflowId || !listen.value) {
    return;
  }
  const wasArmed = listen.value;
  const current = await fetchLabWorkflowListen(props.workflowId).catch(() => wasArmed);
  if (current) {
    return;
  }

  // The arm is gone. Whatever ended it, stop counting down.
  listen.value = null;
  stopListenTicker();

  const before = new Set(samplesForTrigger.value.map((sample) => sample.id));
  await loadSamples();
  const captured = samplesForTrigger.value.find((sample) => !before.has(sample.id));
  if (captured) {
    selectedPick.value = `saved:${captured.id}`;
  }
}

async function refreshListen(): Promise<void> {
  if (!props.workflowId) {
    listen.value = null;
    stopListenTicker();
    return;
  }
  try {
    const current = await fetchLabWorkflowListen(props.workflowId);
    listen.value = current;
    if (current) {
      startListenTicker(current.expiresAt);
    } else {
      stopListenTicker();
    }
  } catch {
    // A failed status read must not claim the workflow is armed.
    listen.value = null;
    stopListenTicker();
  }
}

async function arm(): Promise<void> {
  if (!props.workflowId) {
    return;
  }
  listenBusy.value = true;
  listenError.value = null;
  try {
    // A capture that is allowed to run for real will execute the graph, so the apps it needs must be
    // up before the event arrives — not after. Refuse to arm rather than open a listening window
    // that is guaranteed to fail mid-flight.
    if (listenAllowSideEffects.value) {
      const ready = await startRequiredApps();
      if (!ready) {
        listenError.value =
          'Required apps are not ready. Start them, then arm the capture again.';
        return;
      }
    }
    const result = await armLabWorkflowListen(props.workflowId, {
      dryRun: !listenAllowSideEffects.value,
    });
    listen.value = result.listen;
    startListenTicker(result.listen.expiresAt);
  } catch (err) {
    listenError.value = err instanceof Error ? err.message : 'Could not arm this workflow';
  } finally {
    listenBusy.value = false;
  }
}

async function cancelListen(): Promise<void> {
  if (!props.workflowId) {
    return;
  }
  listenBusy.value = true;
  listenError.value = null;
  try {
    await disarmLabWorkflowListen(props.workflowId);
    listen.value = null;
    stopListenTicker();
  } catch (err) {
    listenError.value = err instanceof Error ? err.message : 'Could not cancel listening';
  } finally {
    listenBusy.value = false;
  }
}

async function execute(dryRun: boolean): Promise<void> {
  if (!props.workflowId) {
    return;
  }
  const pick = selectedPick.value;
  if (!pick) {
    error.value = 'Choose a sample situation first.';
    return;
  }
  let envelope: LabDomainEventPublishInput | undefined;
  let mockSampleId: string | null = null;
  if (pick.startsWith('builtin:')) {
    const scenarioId = pick.slice('builtin:'.length);
    const scenario = builtinScenarios.value.find((row) => row.id === scenarioId);
    if (!scenario) {
      error.value = 'That sample is no longer available. Pick another one.';
      return;
    }
    envelope = scenario.buildEnvelope();
  } else if (pick.startsWith('saved:')) {
    mockSampleId = pick.slice('saved:'.length);
  } else {
    error.value = 'Choose a sample situation first.';
    return;
  }
  running.value = true;
  error.value = null;
  // Connect before the request so the first `running` event is not missed.
  ensureRunStreamSocket();
  emit('run-started', { dryRun });
  try {
    result.value = await runLabWorkflow(props.workflowId, {
      dryRun,
      envelope,
      mockSampleId,
      prepareApps: dryRun ? prepareAppsBeforeTest.value : true,
    });
    void loadRequiredApps();
    emit('run-complete', result.value);
  } catch (err) {
    result.value = null;
    error.value = err instanceof Error ? err.message : 'Could not run this workflow';
    emit('run-complete', null);
  } finally {
    running.value = false;
  }
}

onMounted(() => {
  ensureDefaultSamplePick();
  void loadSamples();
  void refreshListen();
  void loadRequiredApps();
});

/**
 * Live run stream.
 *
 * The run HTTP call does not resolve until every node has executed, so a canvas that only reacts to
 * the response can never animate *during* the run. The backend emits one `running` and one settled
 * event per node to this user's room while it executes; those are forwarded to the canvas as they
 * arrive. The response stays the source of truth for the final state — the stream is narration, and
 * a dropped socket must not leave the canvas showing a half-coloured graph.
 */
const runStreamSocket = shallowRef<Socket | null>(null);

function handleRunStepEvent(event: LabWorkflowRunStepStreamEvent): void {
  if (event.workflowId !== props.workflowId) {
    return;
  }
  emit('run-step', event);
}

function ensureRunStreamSocket(): void {
  if (runStreamSocket.value) {
    if (!runStreamSocket.value.connected) {
      runStreamSocket.value.connect();
    }
    return;
  }
  try {
    const socket = connectLabEventsSocket(resolvePlatformBackendUrlForClient());
    socket.on(LAB_EVENTS_SOCKET.WORKFLOW_RUN_STEP, handleRunStepEvent);
    socket.connect();
    runStreamSocket.value = socket;
  } catch {
    // Streaming is an enhancement: a socket failure must not block running the workflow.
    runStreamSocket.value = null;
  }
}

function teardownRunStreamSocket(): void {
  const socket = runStreamSocket.value;
  if (!socket) {
    return;
  }
  socket.off(LAB_EVENTS_SOCKET.WORKFLOW_RUN_STEP, handleRunStepEvent);
  socket.disconnect();
  runStreamSocket.value = null;
}

onMounted(ensureRunStreamSocket);

onBeforeUnmount(() => {
  // The ticker is local only; the arm itself expires server-side, so nothing is left live.
  stopListenTicker();
  teardownRunStreamSocket();
});

watch(
  () => props.workflowId,
  () => {
    selectedPick.value = null;
    void loadSamples();
    void refreshListen();
    void loadRequiredApps();
  },
);

watch(
  () => [props.triggerEventType, props.catalogEntries] as const,
  () => {
    ensureDefaultSamplePick();
  },
  { deep: true },
);
</script>

<template>
  <!--
    Panel root has no top rule: `.lab-workflow-run-panel.lab-workflow-sidebar__body` in
    platform-catalog-app.css sets `border-top: none` (the panel fills the body slot directly), and
    that selector outranks any `border-t` utility. Separators live on the inner blocks instead.
  -->
  <div class="lab-workflow-run-panel pt-3" :id="generateUniqueId('lab-workflow-run-panel')">
    <!--
      Primary actions first: the thing you came to press is never below the fold. Two independent
      actions, two columns — left runs the chosen sample, right arms a capture of the next real
      trigger.

      Separators come from `.lab-workflow-run-panel__*` in platform-catalog-app.css. Utilities did
      not paint here; that file is unlayered and already owns the `border-top: none` reset.
    -->
    <div class="lab-workflow-run-panel__actions grid grid-cols-1 sm:grid-cols-2">
      <div class="lab-workflow-run-panel__column flex flex-col items-start gap-2 p-2">
        <div class="flex flex-wrap items-center gap-2">
          <Button
            :id="generateUniqueId('wf-run-test')"
            :label="allowSideEffects ? 'Run for real' : 'Test (safe preview)'"
            :icon="allowSideEffects ? 'pi pi-bolt' : 'pi pi-play'"
            size="small"
            :severity="allowSideEffects ? undefined : 'secondary'"
            :outlined="!allowSideEffects"
            :loading="running"
            :disabled="!canAct || !selectedPick"
            :title="
              allowSideEffects
                ? 'Run this workflow now, notifying people and writing data for real'
                : 'Walk through the workflow without notifying anyone or writing data'
            "
            @click="execute(!allowSideEffects)"
          />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox
            v-model="allowSideEffects"
            binary
            :input-id="reallyRunId"
            :pt="withFormControlRootId(formCheckboxPt, reallyRunControlId)"
            @update:model-value="onModeToggled"
          />
          <label class="text-xs text-lab-general-text-muted" :for="reallyRunId">
            Also send notifications and write data
          </label>
        </div>
        <span v-if="!workflowId" class="text-xs text-lab-general-text-muted">
          Save the workflow first.
        </span>
      </div>

      <div class="lab-workflow-run-panel__column flex flex-col items-start gap-2 p-2">
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-if="!listen"
            :id="generateUniqueId('wf-listen-arm')"
            label="Listen"
            icon="pi pi-clock"
            size="small"
            outlined
            :loading="listenBusy"
            :disabled="!workflowId || !triggerNodeId"
            title="Arm for the next real trigger without enabling the workflow"
            @click="arm"
          />
          <Button
            v-else
            :id="generateUniqueId('wf-listen-cancel')"
            label="Cancel listening"
            icon="pi pi-times"
            size="small"
            text
            severity="danger"
            :loading="listenBusy"
            @click="cancelListen"
          />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox
            v-model="listenAllowSideEffects"
            binary
            :input-id="listenRealRunId"
            :pt="withFormControlRootId(formCheckboxPt, listenRealRunControlId)"
            @update:model-value="onModeToggled"
          />
          <label class="text-xs text-lab-general-text-muted" :for="listenRealRunId">
            Let the capture really run
          </label>
        </div>
      </div>
    </div>

    <!--
      Only meaningful when there is something to pick. A dynamic-payload trigger (a webhook) has no
      ready-made samples, so the picker, the app checklist and the payload summary would all render
      empty or misleading — the run button beside this block is disabled for the same reason. Kept
      visible while loading so the section does not flash in and out during the fetch.
    -->
    <div
      v-if="samplesLoading || flatSampleOptions.length > 0"
      class="lab-workflow-run-panel__section mt-3"
    >
      <p v-if="triggerEventType" class="m-0 mb-3 flex flex-wrap items-center gap-1.5 text-xs text-lab-general-text-muted">
        <span>Trigger:</span>
        <LabWorkflowTriggerEventBadge
          :event-type="triggerEventType"
          :catalog-entries="catalogEntries ?? []"
        />
      </p>
      <p class="m-0 mb-3 text-sm text-lab-general-text">
        Choose a sample situation below, then run it to see which path your workflow takes.
        <template v-if="allowSideEffects">
          <strong>Notifications and writes are ON</strong> — this run is real.
        </template>
        <template v-else>
          It previews by default; tick the box above to notify people and write data for real.
        </template>
      </p>
      <label class="block text-xs font-medium text-lab-general-text">
        Sample situation
      </label>
      <Select
        :model-value="selectedPick"
        :options="samplePickerGroups"
        option-label="label"
        option-value="value"
        option-group-label="label"
        option-group-children="items"
        :loading="samplesLoading"
        :disabled="!flatSampleOptions.length"
        placeholder="Choose a sample…"
        class="mt-1 w-full"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-run-sample'))"
        @update:model-value="(value) => (selectedPick = value ?? null)"
      />
      <p v-if="!flatSampleOptions.length" class="mt-1 text-xs text-lab-general-text-muted">
        Add a trigger event on the canvas to see ready-made samples here.
      </p>
      <p v-else-if="selectedScenarioLead" class="mt-2 text-xs text-lab-general-text-muted">
        {{ selectedScenarioLead }}
      </p>

      <div v-if="samplesForTrigger.length" class="mt-3">
        <p class="m-0 text-xs font-medium text-lab-general-text">Saved captures</p>
        <p class="m-0 mt-1 text-xs text-lab-general-text-muted">
          From Listen or manual saves. Delete ones you no longer need for testing.
        </p>
        <ul class="mt-2 mb-0 list-none space-y-1 p-0">
          <li
            v-for="sample in samplesForTrigger"
            :key="sample.id"
            class="flex items-center gap-2 rounded-md bg-[color-mix(in_srgb,var(--lab-general-bg)_70%,var(--lab-general-border))] px-2 py-1.5"
          >
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left text-xs text-lab-general-text hover:underline"
              :class="
                selectedPick === `saved:${sample.id}` ? 'font-medium text-lab-accent' : undefined
              "
              :title="sample.name"
              @click="selectedPick = `saved:${sample.id}`"
            >
              {{ sample.name }}
            </button>
            <Button
              :id="generateUniqueId(`wf-run-capture-delete-${sample.id}`)"
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              aria-label="Delete this saved capture"
              :loading="sampleDeleteBusyId === sample.id"
              :disabled="sampleDeleteBusyId !== null && sampleDeleteBusyId !== sample.id"
              @click="removeSample(sample.id)"
            />
          </li>
        </ul>
      </div>

      <div
        v-if="workflowId && (requiredApps.length || requiredAppsLoading)"
        class="lab-workflow-run-panel__rule"
        aria-hidden="true"
      />
      <!--
        Tinted surface instead of a bordered box: at this size a full outline competes with the run
        buttons and reads as a nested card. A faint fill groups the same content without drawing a
        frame around it.
      -->
      <div
        v-if="workflowId && (requiredApps.length || requiredAppsLoading)"
        class="mt-3 rounded-md bg-[color-mix(in_srgb,var(--lab-general-bg)_70%,var(--lab-general-border))] p-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs font-medium text-lab-general-text">Apps this workflow uses</span>
          <Button
            v-if="launchableAppsNeedingStart.length"
            :id="generateUniqueId('wf-run-prepare-apps-btn')"
            label="Start required apps"
            icon="pi pi-server"
            size="small"
            text
            :loading="preparingApps"
            :disabled="!canAct"
            @click="startRequiredApps"
          />
        </div>
        <p v-if="requiredAppsLoading" class="mt-2 mb-0 text-xs text-lab-general-text-muted">
          Checking apps…
        </p>
        <ul v-else-if="requiredApps.length" class="mt-2 mb-0 list-none space-y-1 p-0">
          <li
            v-for="row in requiredApps"
            :key="row.appId"
            class="flex items-center gap-2 text-xs text-lab-general-text-muted"
          >
            <span
              class="inline-block h-2 w-2 shrink-0 rounded-full"
              :style="requiredAppDotStyle(row)"
              aria-hidden="true"
            />
            <span class="text-lab-general-text">{{ row.name }}</span>
            <span>· {{ requiredAppReadinessLabel(row) }}</span>
          </li>
        </ul>
        <p v-else class="mt-2 mb-0 text-xs text-lab-general-text-muted">
          No catalog apps need to be running for this workflow.
        </p>
        <p v-if="requiredAppsError" class="mt-2 mb-0 text-xs text-lab-danger">
          {{ requiredAppsError }}
        </p>
        <div v-if="requiredApps.some((row) => row.launchable)" class="mt-2 flex items-center gap-2">
          <Checkbox
            v-model="prepareAppsBeforeTest"
            binary
            :input-id="prepareAppsBeforeTestId"
            :pt="withFormControlRootId(formCheckboxPt, prepareAppsBeforeTestControlId)"
          />
          <label class="text-xs text-lab-general-text-muted" :for="prepareAppsBeforeTestId">
            Start required apps before each run
          </label>
        </div>
      </div>

      <div v-if="selectedEnvelopePreview" class="mt-2">
        <Button
          :id="generateUniqueId('wf-run-payload-toggle')"
          :label="`What this sample includes (${payloadSummaryFieldCount})`"
          :icon="showPayloadDetails ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
          size="small"
          text
          severity="secondary"
          :aria-expanded="showPayloadDetails"
          :aria-controls="payloadDetailsId"
          @click="showPayloadDetails = !showPayloadDetails"
        />
        <dl
          v-if="showPayloadDetails && payloadSummaryEntries.length"
          :id="payloadDetailsId"
          class="lab-workflow-run-panel__payload-detail"
        >
          <template v-for="(row, index) in payloadSummaryEntries" :key="`payload-field-${index}`">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </template>
        </dl>
        <p
          v-else-if="showPayloadDetails"
          :id="payloadDetailsId"
          class="lab-workflow-run-panel__payload-detail-empty"
        >
          No payload fields in this sample.
        </p>
      </div>
    </div>

    <Message v-if="runStreamError" severity="error" :closable="false" class="mt-2 text-xs">
      {{ runStreamError }}
    </Message>

    <Message v-if="listenError" severity="error" :closable="false" class="mt-2 text-xs">
      {{ listenError }}
    </Message>

    <Message v-if="listen" severity="info" :closable="false" class="mt-2 text-xs">
      <span class="block font-medium">
        Listening for <code>{{ listen.triggerEventType }}</code> — {{ listenSecondsLeft }}s left
      </span>
      <span class="mt-1 block text-lab-general-text-muted">
        <template v-if="listen.dryRun">
          This capture will <strong>not</strong> notify anyone or write data. It is saved as a sample
          you can reuse for testing.
        </template>
        <template v-else>
          This capture <strong>will</strong> run for real — it can notify people and write data.
        </template>
      </span>
      <!--
        A webhook has no event to wait for, so tell the author the actual next action. Without this the
        banner reads like a passive wait and they never send the request.
      -->
      <span v-if="isWebhookTrigger" class="mt-1 block text-lab-general-text-muted">
        Waiting for a call to this trigger's <strong>test</strong> or <strong>live</strong> URL. The
        mode of that call decides whether the run is a preview — this checkbox only starts the apps
        the workflow needs beforehand.
      </span>
    </Message>

    <Message v-if="error" severity="error" :closable="false" class="mt-2 text-xs">
      {{ error }}
    </Message>
    <Message v-if="sampleError" severity="error" :closable="false" class="mt-2 text-xs">
      {{ sampleError }}
    </Message>
    <p v-if="selectedPick?.startsWith('saved:')" class="mt-2 text-xs text-lab-general-text-muted">
      Using a saved capture.
    </p>

    <template v-if="result">
      <div class="mt-3 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h4 class="m-0 text-sm font-medium text-lab-general-text">
            {{ result.dryRun ? 'Test result' : 'Run result' }}
          </h4>
          <p v-if="result.dryRun" class="m-0 mt-0.5 text-xs text-lab-general-text-muted">
            Preview only — nothing was sent.
          </p>
          <p v-if="result.runId" class="m-0 mt-0.5 text-xs text-lab-general-text-muted">
            Saved to history ({{ result.runId.slice(0, 8) }}).
          </p>
          <p v-else-if="!result.dryRun" class="m-0 mt-0.5 text-xs text-lab-general-text-muted">
            Not saved to history.
          </p>
        </div>
        <Tag
          class="shrink-0"
          :value="runStatusLabel(result.status)"
          :severity="statusSeverity(result.status)"
        />
      </div>

      <Message v-if="result.reason" severity="warn" :closable="false" class="mt-2 text-xs">
        {{ result.reason }}
      </Message>

      <Message
        v-for="issue in blockingIssues"
        :key="`err-${issue.code}-${issue.targetId ?? 'none'}`"
        severity="error"
        :closable="false"
        class="mt-2 text-xs"
      >
        {{ issue.message }}
      </Message>
      <Message
        v-for="issue in warningIssues"
        :key="`warn-${issue.code}-${issue.targetId ?? 'none'}`"
        severity="warn"
        :closable="false"
        class="mt-2 text-xs"
      >
        {{ issue.message }}
      </Message>

      <p v-if="result.steps.length === 0" class="mt-3 text-xs text-lab-general-text-muted">
        No nodes executed.
      </p>
      <!--
        Each step is a disclosure, collapsed by default. A ten-node graph otherwise pushes the run
        summary off-screen, and most steps only need their outcome, not their payload. The icon
        carries the outcome so the list can be scanned without expanding anything.
      -->
      <ul v-else class="mt-3 flex list-none flex-col gap-1 p-0">
        <li
          v-for="(step, stepIndex) in result.steps"
          :key="`${step.nodeId}-${stepIndex}`"
          class="rounded border border-lab-general-border text-xs"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 px-2 py-1 text-left"
            :id="generateUniqueId(`wf-run-step-${stepIndex}`)"
            :aria-expanded="isStepExpanded(stepIndex)"
            :aria-controls="`wf-run-step-body-${generateUniqueId(`body-${stepIndex}`)}`"
            @click="toggleStepExpanded(stepIndex)"
          >
            <i
              :class="[runStepStatusIcon(step.status), runStepStatusIconClass(step.status)]"
              aria-hidden="true"
            />
            <span class="flex-1 font-medium text-lab-general-text">
              {{ runStepTitle(step.nodeId) }}
            </span>
            <i
              class="pi text-lab-general-text-muted"
              :class="
                isStepExpanded(stepIndex) ? 'pi-chevron-down' : 'pi-chevron-right'
              "
              aria-hidden="true"
            />
          </button>
          <div
            v-if="isStepExpanded(stepIndex)"
            class="border-t border-lab-general-border/60 px-2 py-1"
            :id="`wf-run-step-body-${generateUniqueId(`body-${stepIndex}`)}`"
          >
            <p v-if="step.error" class="m-0 text-lab-general-text-muted">{{ step.error }}</p>
            <ul
              v-if="runStepSummaryLines(step).length"
              class="m-0 list-disc pl-4 text-lab-general-text-muted"
            >
              <li v-for="(line, lineIndex) in runStepSummaryLines(step)" :key="`step-line-${lineIndex}`">
                {{ line }}
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

