<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { fetchLabWorkflowRunDetail } from '@/shared/services/platform-lab-workflows.client';
import type { LabWorkflowRun, LabWorkflowRunStep } from '@/shared/types/lab-workflow-run';

/**
 * Full logging detail for one workflow run.
 *
 * The dialog is a **non-Forms-Builder form** in the AGENTS.md sense, so it must reuse the
 * integration-form chrome rather than invent its own: `lab-app-dialog lab-form-runtime` on the root,
 * the six chrome tokens defined on that root, and a raised header/footer over a recessed body.
 * PrimeVue teleports to `<body>`, so every rule below is `:global()` — a scoped selector or `:deep()`
 * would never match the teleported nodes.
 */

const props = defineProps<{
  visible: boolean;
  workflowId: string | null;
  runId: string | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const { generateUniqueId } = useUniqueElementId();

const run = ref<LabWorkflowRun | null>(null);
const steps = ref<LabWorkflowRunStep[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

let requestToken = 0;

async function load(): Promise<void> {
  const workflowId = props.workflowId;
  const runId = props.runId;
  if (!props.visible || !workflowId || !runId) {
    return;
  }
  const token = ++requestToken;
  loading.value = true;
  error.value = null;
  try {
    const detail = await fetchLabWorkflowRunDetail(workflowId, runId);
    if (token !== requestToken) {
      return;
    }
    run.value = detail.run;
    steps.value = detail.steps;
  } catch (e) {
    if (token !== requestToken) {
      return;
    }
    run.value = null;
    steps.value = [];
    error.value = e instanceof Error ? e.message : 'Could not load run';
  } finally {
    if (token === requestToken) {
      loading.value = false;
    }
  }
}

watch(
  () => [props.visible, props.workflowId, props.runId] as const,
  () => {
    if (props.visible) {
      void load();
      return;
    }
    run.value = null;
    steps.value = [];
    error.value = null;
  },
  { immediate: true },
);

function close(): void {
  emit('update:visible', false);
}

function formatWhen(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

/**
 * Split a step's `detail` into the payloads and everything else.
 *
 * The payloads are the part an author reads when a graph misbehaves, and they are large enough that
 * burying them in the metadata blob makes both harder to scan. `input` / `output` are lifted out and
 * rendered as their own labelled blocks; the remaining keys stay together as node facts.
 */
function splitStepDetail(detail: Record<string, unknown> | null): {
  input: unknown;
  output: unknown;
  facts: Record<string, unknown>;
} {
  if (!detail) {
    return { input: undefined, output: undefined, facts: {} };
  }
  const { input, output, ...facts } = detail;
  return { input, output, facts };
}

/** Indented JSON, or a marker explaining why a payload was cut. */
function prettyPayload(value: unknown): string {
  if (value === undefined) {
    return '';
  }
  if (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as Record<string, unknown>).truncated === true
  ) {
    const record = value as Record<string, unknown>;
    const preview = typeof record.preview === 'string' ? record.preview : '';
    const bytes = typeof record.bytes === 'number' ? record.bytes : null;
    const limit = typeof record.limitBytes === 'number' ? record.limitBytes : null;
    if (preview) {
      return `${preview}\n… (payload truncated${bytes && limit ? `: ${bytes} bytes over the ${limit}-byte cap` : ''})`;
    }
    return '… (payload too large to store)';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function prettyDetail(detail: Record<string, unknown> | null): string {
  if (!detail || Object.keys(detail).length === 0) {
    return '';
  }
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

/**
 * Human label for a step's node.
 *
 * `nodeKind` is only ever `trigger` / `action` / `rule` / `condition` / `group`, so every transform,
 * routing and side-effecting node collapses to "ACTION" — useless when scanning a run. The node's own
 * `stepKind` (`loop`, `wait`, `code`, `if_condition`, `notify_users`, …) is the distinction the reader
 * actually needs, and it is already recorded in the step detail.
 *
 * Falls back to `nodeKind` for a step recorded before `stepKind` was stamped, and for kinds that have
 * no meaningful sub-type.
 */
function stepNodeLabel(step: LabWorkflowRunStep): string {
  const detail = step.detail as Record<string, unknown> | null;
  const stepKind = typeof detail?.stepKind === 'string' ? detail.stepKind : '';
  if (stepKind) {
    return stepKind;
  }
  return step.nodeKind;
}

/** Title-cased for display: `if_condition` → `If condition`, `http_request` → `Http request`. */
function stepNodeLabelTitle(step: LabWorkflowRunStep): string {
  const label = stepNodeLabel(step);
  const spaced = label.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function prettyEnvelope(json: string | null): string {
  if (!json) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    append-to="body"
    header="Run details"
    class="lab-workflow-run-detail-dialog lab-app-dialog lab-form-runtime text-lab-general-text"
    :style="{ width: 'min(62rem, 96vw)' }"
    :pt="{
      root: { attrs: { id: generateUniqueId('lab-workflow-run-detail-dialog') } },
    }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="lab-workflow-run-detail">
      <Message v-if="!workflowId || !runId" severity="info" :closable="false">
        Select a run to see its details.
      </Message>
      <Message v-else-if="error" severity="warn" :closable="false">
        Could not load this run: {{ error }}
      </Message>
      <p v-else-if="loading" class="lab-workflow-run-detail__status">Loading run…</p>

      <template v-else-if="run">
        <section class="lab-workflow-run-detail__section lab-form-section">
          <h4 class="lab-workflow-run-detail__title lab-form-section__title"><span class="lab-form-section__step">1</span>Run</h4>
          <dl class="lab-workflow-run-detail__meta">
            <div>
              <dt>Run id</dt>
              <dd class="lab-workflow-run-detail__mono">{{ run.id }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{ run.status }}</dd>
            </div>
            <div>
              <dt>Trigger</dt>
              <dd>{{ run.triggerType }}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{{ formatWhen(run.startedAt) }}</dd>
            </div>
            <div>
              <dt>Finished</dt>
              <dd>{{ formatWhen(run.finishedAt) }}</dd>
            </div>
            <div v-if="run.eventId">
              <dt>Event id</dt>
              <dd class="lab-workflow-run-detail__mono">{{ run.eventId }}</dd>
            </div>
            <div v-if="run.mockSampleId">
              <dt>Replayed sample</dt>
              <dd class="lab-workflow-run-detail__mono">{{ run.mockSampleId }}</dd>
            </div>
          </dl>
          <p v-if="run.error" class="lab-workflow-run-detail__error">{{ run.error }}</p>
        </section>

        <section class="lab-workflow-run-detail__section lab-form-section">
          <h4 class="lab-workflow-run-detail__title lab-form-section__title"><span class="lab-form-section__step">2</span>Steps <span class="lab-workflow-run-detail__count">{{ steps.length }}</span></h4>
          <p v-if="steps.length === 0" class="lab-workflow-run-detail__status">
            No step rows. A node that never ran leaves no record — the absence is the result.
          </p>
          <ol v-else class="lab-workflow-run-detail__steps">
            <li
              v-for="step in steps"
              :key="step.id"
              class="lab-workflow-run-detail__step"
              :class="`lab-workflow-run-detail__step--${step.status}`"
            >
              <div class="lab-workflow-run-detail__step-head">
                <span class="lab-workflow-run-detail__seq">{{ step.seq }}</span>
                <!--
                  Type first, id second. The type is what the reader scans for ("which step failed?"),
                  so it leads; the GUID is supporting detail and is muted, because at full strength it
                  competed with the type for attention while carrying less meaning.
                -->
                <span class="lab-workflow-run-detail__kind">{{ stepNodeLabelTitle(step) }}</span>
                <span class="lab-workflow-run-detail__node">{{ step.nodeId }}</span>
                <span
                  class="lab-workflow-run-detail__badge"
                  :class="`lab-workflow-run-detail__badge--${step.status}`"
                >
                  {{ step.status }}
                </span>
              </div>
              <div class="lab-workflow-run-detail__step-metrics">
                <span>in {{ step.itemsInCount }}</span>
                <span>out {{ step.itemsOutCount }}</span>
                <span>{{ step.durationMs == null ? '—' : `${step.durationMs} ms` }}</span>
              </div>
              <p v-if="step.error" class="lab-workflow-run-detail__error">{{ step.error }}</p>
              <!--
                Payload in / out first, then the node's own facts. When a node misbehaves these two
                blocks answer "what did it receive" and "what did it produce" without any extra work
                from the reader.
              -->
              <div
                v-if="prettyPayload(splitStepDetail(step.detail).input)"
                class="lab-workflow-run-detail__payload"
              >
                <span class="lab-workflow-run-detail__payload-label">Input</span>
                <pre class="lab-workflow-run-detail__code">{{
                  prettyPayload(splitStepDetail(step.detail).input)
                }}</pre>
              </div>
              <div
                v-if="prettyPayload(splitStepDetail(step.detail).output)"
                class="lab-workflow-run-detail__payload"
              >
                <span class="lab-workflow-run-detail__payload-label">Output</span>
                <pre class="lab-workflow-run-detail__code">{{
                  prettyPayload(splitStepDetail(step.detail).output)
                }}</pre>
              </div>
              <pre
                v-if="prettyDetail(splitStepDetail(step.detail).facts)"
                class="lab-workflow-run-detail__code"
              >{{ prettyDetail(splitStepDetail(step.detail).facts) }}</pre>
            </li>
          </ol>
        </section>

        <section v-if="prettyEnvelope(run.envelopeJson)" class="lab-workflow-run-detail__section lab-form-section">
          <h4 class="lab-workflow-run-detail__title lab-form-section__title"><span class="lab-form-section__step">3</span>Trigger envelope</h4>
          <pre class="lab-workflow-run-detail__code">{{ prettyEnvelope(run.envelopeJson) }}</pre>
        </section>
      </template>
    </div>

    <template #footer>
      <Button
        label="Close"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('wf-run-detail-close') } } }"
        @click="close"
      />
    </template>
  </Dialog>
</template>

<style>
/*
 * Chrome copied from `.lab-integration-dialog` in lab-form-runtime.css so this dialog is visually
 * identical to the Forms Builder dialogs. These are `:global`-equivalent (unscoped) because the
 * dialog is teleported outside this component's scope.
 */
.lab-workflow-run-detail-dialog.lab-app-dialog {
  display: flex;
  flex-direction: column;
  max-height: 88vh;
  background: var(--lab-general-bg);
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, transparent);
  color: var(--lab-general-text);
  border-radius: 0.5rem;
  --lab-integration-chrome-bg: color-mix(
    in srgb,
    var(--lab-prime-surface-800) 22%,
    var(--lab-general-bg)
  );
  --lab-integration-body-bg: color-mix(
    in srgb,
    var(--lab-general-bg) 72%,
    var(--lab-prime-surface-500)
  );
  --lab-integration-field-bg: var(--lab-integration-chrome-bg);
  --lab-integration-field-border: color-mix(
    in srgb,
    var(--lab-general-border) 65%,
    var(--lab-prime-surface-700)
  );
  --lab-form-control-bg: var(--lab-integration-chrome-bg);
  --lab-form-control-border: var(--lab-integration-field-border);
}

.lab-workflow-run-detail-dialog.lab-app-dialog .p-dialog-header {
  flex-shrink: 0;
  padding: 0.85rem 1.25rem;
  color: var(--lab-general-text);
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg);
}

.lab-workflow-run-detail-dialog.lab-app-dialog .p-dialog-title {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.lab-workflow-run-detail-dialog.lab-app-dialog .p-dialog-content {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
  /* Scroll the body, not the dialog: the header and footer strips stay put, which is what makes a
     long step list usable — the Close button is always reachable. */
  overflow-y: auto;
  color: var(--lab-general-text);
  background: var(--lab-integration-body-bg);
}

.lab-workflow-run-detail-dialog.lab-app-dialog .p-dialog-footer {
  flex-shrink: 0;
  margin: 0;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg);
}

/* Body padding matches the integration form grid (1rem 1.25rem), not the dialog content padding. */
.lab-workflow-run-detail {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1rem 1.25rem;
}

/*
 * Sections use the canonical `lab-form-section` card (rail + tinted surface + numbered badge). Only
 * the inner layout belongs here: the card margin is dropped because the dialog body already spaces
 * with a flex `gap`.
 */
.lab-workflow-run-detail__section.lab-form-section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-bottom: 0;
}

.lab-workflow-run-detail__title.lab-form-section__title {
  margin: 0;
}

.lab-workflow-run-detail__count {
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  border: 1px solid var(--lab-integration-field-border);
  background: var(--lab-integration-field-bg);
  color: var(--lab-general-text);
  font-size: 0.6875rem;
}

.lab-workflow-run-detail__status {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--lab-general-text-muted);
}

.lab-workflow-run-detail__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.65rem 1.25rem;
  margin: 0;
}

.lab-workflow-run-detail__meta dt {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lab-general-text-muted);
}

.lab-workflow-run-detail__meta dd {
  margin: 0.1rem 0 0;
  font-size: 0.8125rem;
  font-weight: 600;
  word-break: break-all;
}

.lab-workflow-run-detail__mono {
  font-family: var(--lab-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-weight: 400 !important;
  font-size: 0.75rem !important;
}

.lab-workflow-run-detail__error {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--lab-status-danger, #f87171);
}

.lab-workflow-run-detail__steps {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

/*
 * Numbered card per step, mirroring the numbered sections in the integration forms (a badge, a rule,
 * and a tinted surface). The left border is the status channel: it is the one piece of chrome that
 * stays readable when the body is scrolled, and it lets a long list be scanned for failures without
 * reading any text.
 */
.lab-workflow-run-detail__step {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--lab-integration-field-border);
  border-left-width: 3px;
  border-left-style: solid;
  border-left-color: var(--lab-general-border);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--lab-integration-body-bg) 70%, var(--lab-prime-surface-800));
}

.lab-workflow-run-detail__step--succeeded {
  border-left-color: var(--lab-status-success, #4ade80);
}

.lab-workflow-run-detail__step--failed {
  border-left-color: var(--lab-status-danger, #f87171);
}

.lab-workflow-run-detail__step--skipped {
  border-left-color: var(--lab-general-text-muted);
}

.lab-workflow-run-detail__step-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lab-workflow-run-detail__seq {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  border-radius: 999px;
  border: 1px solid var(--lab-integration-field-border);
  background: var(--lab-integration-chrome-bg);
  color: var(--lab-general-text);
  font-size: 0.6875rem;
  font-weight: 700;
}

/*
 * The node id is supporting detail, so it is muted and small. At full strength a 36-character GUID
 * dominated the row while carrying the least meaning — the reader is scanning for the step type.
 */
.lab-workflow-run-detail__node {
  font-family: var(--lab-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.6875rem;
  color: var(--lab-general-text-muted);
  word-break: break-all;
}

/* The step type leads the row and carries full contrast. */
.lab-workflow-run-detail__kind {
  font-size: 0.75rem;
  font-weight: 700;
  /* Uppercase matches the other row-level labels in this dialog (run facts, payload headings). */
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--lab-general-text);
}

.lab-workflow-run-detail__badge {
  margin-left: auto;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--lab-integration-field-border);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--lab-general-text-muted);
}

.lab-workflow-run-detail__badge--succeeded {
  color: var(--lab-status-success, #4ade80);
  border-color: color-mix(in srgb, var(--lab-status-success, #4ade80) 45%, transparent);
}

.lab-workflow-run-detail__badge--failed {
  color: var(--lab-status-danger, #f87171);
  border-color: color-mix(in srgb, var(--lab-status-danger, #f87171) 45%, transparent);
}

.lab-workflow-run-detail__step-metrics {
  display: flex;
  gap: 0.9rem;
  font-size: 0.75rem;
  color: var(--lab-general-text-muted);
  font-variant-numeric: tabular-nums;
}

.lab-workflow-run-detail__payload {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.lab-workflow-run-detail__payload-label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--lab-general-text-muted);
}

.lab-workflow-run-detail__code {
  margin: 0;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--lab-integration-field-border);
  border-radius: 0.4rem;
  background: var(--lab-integration-field-bg);
  color: var(--lab-general-text);
  font-family: var(--lab-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.75rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
