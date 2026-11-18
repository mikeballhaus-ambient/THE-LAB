<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formInputTextPt, formSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';
import type { LabWorkflowTriggerMappingRow } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowWebhookMode } from '@/shared/types/lab-workflow-webhook';
import {
  adoptLabWorkflowWebhookShape,
  createLabWorkflowWebhook,
  fetchLabWorkflowWebhooks,
  regenerateLabWorkflowWebhookSecrets,
  type LabWorkflowWebhookDto,
} from '@/shared/services/platform-lab-webhooks.client';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { copyPlainTextToClipboard } from '@/shared/utils/copy-plain-text';
import { diffPayloadShapes, payloadShapesMatch } from '@/shared/utils/lab-workflow-payload-shape';
import {
  suggestedMappingFromShape,
  unresolvedMappingPaths,
  validateTriggerMapping,
} from '@/shared/utils/lab-workflow-trigger-mapping';

/**
 * Output mapping for a dynamic-payload trigger (phase 37).
 *
 * Three jobs, in the order an author actually does them:
 *
 * 1. **Get a URL.** Creating a hook mints a test/live pair. Both URLs stay visible afterwards, and
 *    regenerate is an explicit action because it invalidates whatever a caller is already using.
 * 2. **Learn the shape.** The test endpoint is armed, a caller posts, and the capture becomes the list
 *    of paths this panel offers.
 * 3. **Map.** Rows go `from` (observed) → `to` (the name downstream nodes should use).
 *
 * ## The divergence prompt
 *
 * A capture whose **shape** differs from `mappingSource` raises a Keep/Adopt question. Shape, not
 * values — {@link payloadShapesMatch} ignores values, so `stepValue` going 1 → 2 never prompts. If it
 * did, the author would learn to dismiss the warning.
 *
 * **Adopt never auto-remaps.** It replaces the source shape and leaves rows whose `from` vanished
 * unresolved, which blocks save. Guessing at intent would silently change what a `to` means.
 */

const props = defineProps<{
  workflowId: string | null;
  triggerNodeId: string | null;
  triggerEventType: string | null;
  mapping: LabWorkflowTriggerMappingRow[];
}>();

const emit = defineEmits<{
  'update:mapping': [value: LabWorkflowTriggerMappingRow[]];
}>();

const { generateUniqueId } = useUniqueElementId();

const loading = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);
const hooks = ref<LabWorkflowWebhookDto[]>([]);
/** Set right after create/regenerate, so the panel can confirm the URLs below are the fresh pair. */
const justMinted = ref(false);
const copiedMode = ref<'test' | 'live' | null>(null);
const selectedHookId = ref<string | null>(null);
/**
 * Which regeneration is awaiting confirmation, if any.
 *
 * A `window.confirm` here was wrong on three counts: it blocks the whole tab, it renders the browser's
 * own chrome inside a themed dialog, and its OK/Cancel labels invert the safe default for a destructive
 * action. This drives a themed dialog instead, with the irreversible choice labelled explicitly.
 */
const pendingRegenerate = ref<'test' | 'live' | 'all' | null>(null);
const adoptMode = ref<LabWorkflowWebhookMode>('test');
/** Set when a shape became the mapping source this session, so the panel can show the suggestions. */
const adoptedPaths = ref<string[]>([]);

const hook = computed<LabWorkflowWebhookDto | null>(
  () => hooks.value.find((row) => row.id === selectedHookId.value) ?? null,
);

/** Base for the copyable URLs — the platform backend the panel is already talking to. */
const webhookBaseUrl = computed(() => resolvePlatformBackendUrlForClient().replace(/\/$/, ''));

/**
 * The two callable URLs, or `null` when that mode's secret is not recoverable.
 *
 * `null` is rendered as "regenerate to get a URL" rather than a guessed path: a URL built from a
 * placeholder would look callable and answer `401`, which is worse than showing nothing.
 */
const testUrl = computed<string | null>(() =>
  hook.value?.testSecret
    ? `${webhookBaseUrl.value}/api/hooks/workflows/${hook.value.slug}/${hook.value.testSecret}`
    : null,
);
const liveUrl = computed<string | null>(() =>
  hook.value?.liveSecret
    ? `${webhookBaseUrl.value}/api/hooks/workflows/${hook.value.slug}/${hook.value.liveSecret}`
    : null,
);

const mappingValidation = computed(() => validateTriggerMapping(props.mapping));

const rows = computed<LabWorkflowTriggerMappingRow[]>(() => props.mapping ?? []);

/**
 * The capture the Adopt select currently points at.
 *
 * `latestTestShape` carries the fields; `latestLiveShape` only carries a timestamp, so a live
 * selection has no field list to offer. Returning null there is honest — the panel then says "no
 * capture yet" instead of silently falling back to the test shape and labelling it live.
 */
const capturedShape = computed<{ fields: { path: string; type: string }[] } | null>(() => {
  if (adoptMode.value === 'live') {
    return liveShapeAvailable.value ? { fields: [] } : null;
  }
  return hook.value?.latestTestShape ?? null;
});

/** A live capture exists, but the API only reports when it happened. */
const liveShapeAvailable = computed(() => Boolean(hook.value?.latestLiveShape));

/** Paths from whichever capture the Adopt select points at — the shape the author is working from. */
const capturedPathOptions = computed<string[]>(() =>
  (capturedShape.value?.fields ?? []).map((field) => field.path),
);

/**
 * Paths the mapping editor offers as `from` suggestions.
 *
 * Adopted paths first (the mapping's declared source), then whatever the selected capture observed.
 * Previously this always read `latestTestShape`, so choosing "Live capture" above had no effect on
 * the suggestions — the select looked meaningful and was not.
 */
const sourcePathOptions = computed<string[]>(() => {
  const fromAdopt = adoptedPaths.value;
  return [...new Set([...fromAdopt, ...capturedPathOptions.value])].sort();
});

/**
 * Rows whose `from` the current shape no longer contains.
 *
 * Non-empty blocks save. This is what makes Adopt safe: the author is told exactly which rows need a
 * new source rather than discovering it at run time when a field silently never appears.
 */
const unresolvedPaths = computed(() => {
  const shape = capturedShape.value;
  if (!shape) {
    return [];
  }
  const payload: Record<string, unknown> = {};
  for (const field of shape.fields) {
    // The value is irrelevant — only path presence matters, and `null` is a present value here.
    payload[field.path] = null;
  }
  return unresolvedMappingPaths(payload, props.mapping);
});

/** Whether the latest capture's shape differs from the one the mapping was authored from. */
const divergence = computed(() => {
  const sourceJson = hook.value?.mappingSourceJson;
  const capture = hook.value?.latestTestShape;
  if (!sourceJson || !capture) {
    return null;
  }
  let source: unknown;
  try {
    source = JSON.parse(sourceJson);
  } catch {
    return null;
  }
  const shape: Record<string, unknown> = {};
  for (const field of capture.fields) {
    shape[field.path] = null;
  }
  if (payloadShapesMatch(source, shape)) {
    return null;
  }
  return diffPayloadShapes(source, shape);
});

async function load(): Promise<void> {
  if (!props.workflowId) {
    hooks.value = [];
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    hooks.value = await fetchLabWorkflowWebhooks(props.workflowId);
    if (!selectedHookId.value && hooks.value.length > 0) {
      selectedHookId.value = hooks.value[0].id;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load webhook triggers';
    hooks.value = [];
  } finally {
    loading.value = false;
  }
}

async function createHook(): Promise<void> {
  if (!props.workflowId || !props.triggerNodeId || !props.triggerEventType) {
    error.value = 'Add a trigger node with an event type first.';
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const created = await createLabWorkflowWebhook(props.workflowId, {
      name: 'Webhook trigger',
      triggerNodeId: props.triggerNodeId,
      eventType: props.triggerEventType,
    });
    selectedHookId.value = created.webhook.id;
    justMinted.value = true;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not create a webhook trigger';
  } finally {
    busy.value = false;
  }
}

async function adoptShape(): Promise<void> {
  if (!props.workflowId || !hook.value) {
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const result = await adoptLabWorkflowWebhookShape(
      props.workflowId,
      hook.value.id,
      adoptMode.value,
    );
    adoptedPaths.value = result.fields.map((field) => field.path);
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not adopt the captured shape';
  } finally {
    busy.value = false;
  }
}

/** Replace the mapping with identity rows for the observed shape. Never happens implicitly. */
function suggestRows(): void {
  const shape = capturedShape.value;
  if (!shape || shape.fields.length === 0) {
    return;
  }
  const payload: Record<string, unknown> = {};
  for (const field of shape.fields) {
    payload[field.path] = null;
  }
  emit('update:mapping', suggestedMappingFromShape(payload));
}

function addRow(): void {
  emit('update:mapping', [...rows.value, { from: '', to: '' }]);
}

function updateRow(index: number, patch: Partial<LabWorkflowTriggerMappingRow>): void {
  emit(
    'update:mapping',
    rows.value.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  );
}

function removeRow(index: number): void {
  emit(
    'update:mapping',
    rows.value.filter((_, i) => i !== index),
  );
}

/** Label for whichever regeneration the dialog is asking about. */
const pendingRegenerateLabel = computed(() => {
  const mode = pendingRegenerate.value;
  if (mode === 'all') {
    return 'both URLs';
  }
  return mode ? `the ${mode} URL` : 'this URL';
});

/** Ask for confirmation; the actual work happens in {@link confirmRegenerate}. */
function regenerate(mode: 'test' | 'live' | 'all'): void {
  if (!props.workflowId || !hook.value) {
    return;
  }
  pendingRegenerate.value = mode;
}

/**
 * Replace one or both secrets. Explicit, because the previous URL stops working immediately.
 *
 * Confirmed through a themed dialog rather than `window.confirm`: the action is irreversible for
 * whoever is already calling the URL, so the buttons name the outcome ("Regenerate" / "Keep them")
 * instead of the browser's generic OK / Cancel, where OK is the destructive choice.
 */
async function confirmRegenerate(): Promise<void> {
  const mode = pendingRegenerate.value;
  if (!mode || !props.workflowId || !hook.value) {
    return;
  }
  pendingRegenerate.value = null;
  busy.value = true;
  error.value = null;
  try {
    await regenerateLabWorkflowWebhookSecrets(props.workflowId, hook.value.id, mode);
    justMinted.value = true;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not regenerate the endpoint URLs';
  } finally {
    busy.value = false;
  }
}

async function copyUrl(mode: 'test' | 'live'): Promise<void> {
  const value = mode === 'test' ? testUrl.value : liveUrl.value;
  if (!value) {
    return;
  }
  if (await copyPlainTextToClipboard(value)) {
    copiedMode.value = mode;
    window.setTimeout(() => {
      if (copiedMode.value === mode) {
        copiedMode.value = null;
      }
    }, 1500);
  }
}

onMounted(load);
watch(() => props.workflowId, load);
</script>

<template>
  <div
    class="lab-workflow-trigger-mapping"
    :id="generateUniqueId('wf-trigger-mapping')"
  >
    <p class="m-0 mb-3 text-xs text-lab-general-text-muted">
      A webhook's payload is chosen by the caller, so the fields are learned by capturing one. Map the
      observed paths onto the names your workflow should use.
    </p>

    <Message v-if="error" severity="error" :closable="false" class="mb-2 text-xs">
      {{ error }}
    </Message>

    <!-- No hook yet -->
    <div v-if="!loading && hooks.length === 0" class="flex flex-col items-start gap-2">
      <p class="m-0 text-xs text-lab-general-text-muted">
        This trigger has no endpoint yet. Create one to get a test URL and a live URL.
      </p>
      <Button
        :id="generateUniqueId('wf-webhook-create')"
        label="Create webhook endpoint"
        icon="pi pi-link"
        size="small"
        :loading="busy"
        :disabled="!workflowId || !triggerNodeId"
        @click="createHook"
      />
    </div>

    <template v-if="hooks.length > 0">
      <!-- 1 — Which endpoint, and how callers are trusted -->
      <section class="lab-form-section lab-form-section--nested">
        <h4 class="lab-form-section__title">
          <span class="lab-form-section__icon"><i class="pi pi-link" aria-hidden="true" /></span>
          Endpoint
        </h4>
        <p class="lab-form-section__lead">
          The address callers post to. A workflow can have several, each firing this same trigger.
        </p>

        <Select
          :model-value="selectedHookId"
          :options="hooks"
          option-label="slug"
          option-value="id"
          class="mt-1 w-full"
          :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-webhook-select-field'))"
          @update:model-value="(value) => (selectedHookId = value ?? null)"
        />

        <p v-if="hook" class="m-0 mt-1 text-[0.7rem] text-lab-general-text-muted">
          <span v-if="hook.signed">Signed (HMAC verified).</span>
          <span v-else class="text-lab-danger">
            Unsigned — anyone with the live URL can trigger this workflow.
          </span>
        </p>
      </section>

      <!--
        2 — The two callable URLs. Always visible while a hook is selected: a secret shown only once is
        a secret the author loses by closing a dialog, so regeneration is an explicit, confirmed action.
      -->
      <section v-if="hook" class="lab-form-section lab-form-section--nested">
        <h4 class="lab-form-section__title">
          <span class="lab-form-section__icon"><i class="pi pi-external-link" aria-hidden="true" /></span>
          URLs
        </h4>
        <p class="lab-form-section__lead">
          {{
            justMinted
              ? 'New URLs — the previous ones no longer work.'
              : 'POST one of these to run the workflow. The secret in the path decides test vs live.'
          }}
        </p>

        <div class="lab-workflow-trigger-url">
          <div class="lab-workflow-trigger-url__head">
            <span class="lab-workflow-trigger-url__mode lab-workflow-trigger-url__mode--test">Test</span>
            <span class="lab-workflow-trigger-url__hint">Preview only — nothing is sent or written.</span>
          </div>
          <div v-if="testUrl" class="flex items-start gap-1">
            <code class="min-w-0 flex-1 break-all text-[0.7rem] text-lab-general-text">{{ testUrl }}</code>
            <Button
              :id="generateUniqueId('wf-webhook-copy-test')"
              :label="copiedMode === 'test' ? 'Copied' : 'Copy'"
              size="small"
              text
              @click="copyUrl('test')"
            />
          </div>
          <p v-else class="m-0 text-[0.7rem] text-lab-danger">
            No test URL — this endpoint has no recoverable test secret. Regenerate it below.
          </p>
        </div>

        <div class="lab-workflow-trigger-url">
          <div class="lab-workflow-trigger-url__head">
            <span class="lab-workflow-trigger-url__mode lab-workflow-trigger-url__mode--live">Live</span>
            <span class="lab-workflow-trigger-url__hint">Runs for real — treat the URL as a credential.</span>
          </div>
          <div v-if="liveUrl" class="flex items-start gap-1">
            <code class="min-w-0 flex-1 break-all text-[0.7rem] text-lab-general-text">{{ liveUrl }}</code>
            <Button
              :id="generateUniqueId('wf-webhook-copy-live')"
              :label="copiedMode === 'live' ? 'Copied' : 'Copy'"
              size="small"
              text
              @click="copyUrl('live')"
            />
          </div>
          <p v-else class="m-0 text-[0.7rem] text-lab-danger">
            No live URL — this endpoint has no recoverable live secret. Regenerate it below.
          </p>
        </div>

        <div class="mt-2 flex flex-wrap gap-1">
          <Button
            :id="generateUniqueId('wf-webhook-regenerate-test')"
            label="Regenerate test"
            size="small"
            text
            :loading="busy"
            @click="regenerate('test')"
          />
          <Button
            :id="generateUniqueId('wf-webhook-regenerate-live')"
            label="Regenerate live"
            size="small"
            text
            :loading="busy"
            @click="regenerate('live')"
          />
          <Button
            :id="generateUniqueId('wf-webhook-regenerate-all')"
            label="Regenerate both"
            size="small"
            text
            severity="danger"
            :loading="busy"
            @click="regenerate('all')"
          />
        </div>
        <p class="m-0 mt-1 text-[0.65rem] text-lab-general-text-muted">
          Regenerating replaces the secret immediately — anything already calling that URL stops working.
        </p>
      </section>

      <!-- Divergence prompt -->
      <Message v-if="divergence" severity="warn" :closable="false" class="mt-2 text-xs">
        <span class="block font-medium">The incoming shape changed.</span>
        <span v-if="divergence.added.length" class="block">
          Added: {{ divergence.added.join(', ') }}
        </span>
        <span v-if="divergence.removed.length" class="block">
          Removed: {{ divergence.removed.join(', ') }}
        </span>
        <span v-if="divergence.retyped.length" class="block">
          Type changed:
          {{ divergence.retyped.map((row) => `${row.path} (${row.from} → ${row.to})`).join(', ') }}
        </span>
        <span class="mt-1 block text-lab-general-text-muted">
          Keep the current mapping, or adopt the new shape and re-point any rows whose source is gone.
        </span>
      </Message>

      <!-- 3 — Learn the shape from a real call, then map it -->
      <section class="lab-form-section lab-form-section--nested">
        <h4 class="lab-form-section__title">
          <span class="lab-form-section__icon"><i class="pi pi-download" aria-hidden="true" /></span>
          Capture the shape
        </h4>
        <p class="lab-form-section__lead">
          POST a sample body to the test URL, then adopt what arrived. Adopting replaces the mapping
          source — it never re-points existing rows for you.
        </p>

        <div class="mt-1 flex flex-wrap items-center gap-2">
          <Select
            v-model="adoptMode"
            :options="[{ label: 'Test capture', value: 'test' }, { label: 'Live capture', value: 'live' }]"
            option-label="label"
            option-value="value"
            class="w-[9rem]"
            :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-webhook-adopt-mode'))"
          />
          <Button
            :id="generateUniqueId('wf-webhook-adopt')"
            label="Adopt captured shape"
            size="small"
            outlined
            :loading="busy"
            :disabled="!hook"
            @click="adoptShape"
          />
          <Button
            :id="generateUniqueId('wf-webhook-suggest')"
            label="Use observed paths"
            size="small"
            text
            :disabled="(capturedShape?.fields.length ?? 0) === 0"
            @click="suggestRows"
          />
        </div>

        <!-- Say why a live selection offers nothing rather than leaving a disabled button unexplained. -->
        <p
          v-if="adoptMode === 'live' && liveShapeAvailable"
          class="m-0 mt-1 text-[0.65rem] text-lab-general-text-muted"
        >
          A live call was captured, but its fields are not listed here — the platform records when it
          happened, not what arrived. Adopt it to use its shape as the mapping source.
        </p>
        <p
          v-else-if="adoptMode === 'live'"
          class="m-0 mt-1 text-[0.65rem] text-lab-general-text-muted"
        >
          No live call captured yet. POST a body to the live URL, then adopt it.
        </p>

        <Message v-if="unresolvedPaths.length" severity="error" :closable="false" class="mt-2 text-xs">
          {{ unresolvedPaths.length }} row(s) point at a field the current shape does not contain
          ({{ unresolvedPaths.join(', ') }}). Re-point them before saving.
        </Message>
      </section>

      <!-- 4 — The mapping itself -->
      <section class="lab-form-section lab-form-section--nested">
        <h4 class="lab-form-section__title">
          <span class="lab-form-section__icon"><i class="pi pi-sitemap" aria-hidden="true" /></span>
          Output mapping
        </h4>
        <p class="lab-form-section__lead">
          <template v-if="rows.length === 0">
            No mapping — the payload passes through unchanged and every field reaches downstream nodes.
          </template>
          <template v-else>
            Only mapped fields survive; anything unmapped is dropped.
          </template>
        </p>

        <div
          v-for="(row, index) in rows"
          :key="`map-${index}`"
          class="mt-1 flex items-center gap-1"
        >
          <Select
            :model-value="row.from"
            :options="sourcePathOptions"
            editable
            placeholder="from"
            class="min-w-0 flex-1"
            :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-map-from-${index}`))"
            @update:model-value="(value) => updateRow(index, { from: String(value ?? '') })"
          />
          <span class="text-xs text-lab-general-text-muted">→</span>
          <InputText
            :model-value="row.to"
            placeholder="to"
            class="min-w-0 flex-1"
            :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-map-to-${index}`))"
            @update:model-value="(value) => updateRow(index, { to: String(value ?? '') })"
          />
          <Button
            :id="generateUniqueId(`wf-map-remove-${index}`)"
            icon="pi pi-times"
            size="small"
            text
            severity="danger"
            aria-label="Remove mapping row"
            @click="removeRow(index)"
          />
        </div>

        <div class="mt-2 flex flex-wrap gap-2">
          <Button
            :id="generateUniqueId('wf-map-add')"
            label="Add row"
            icon="pi pi-plus"
            size="small"
            text
            @click="addRow"
          />
        </div>

        <p v-if="!mappingValidation.valid" class="m-0 mt-1 text-xs text-lab-danger">
          <span v-if="mappingValidation.duplicateTargets.length">
            Two rows write {{ mappingValidation.duplicateTargets.join(', ') }} — give each a distinct name.
          </span>
          <span v-if="mappingValidation.incomplete">
            {{ mappingValidation.incomplete }} row(s) are missing a side.
          </span>
        </p>
      </section>
    </template>

    <p v-if="loading" class="mt-2 mb-0 text-xs text-lab-general-text-muted">Loading endpoints…</p>

    <!--
      Themed confirmation. Deliberately not `window.confirm`: that blocks the tab, draws browser chrome
      inside a styled dialog, and labels the destructive action "OK".
    -->
    <Dialog
      :visible="pendingRegenerate !== null"
      modal
      append-to="body"
      header="Regenerate endpoint URLs"
      class="lab-form-runtime w-full max-w-md text-lab-general-text"
      :pt="{
        root: { attrs: { id: generateUniqueId('wf-webhook-regenerate-dialog') } },
        mask: { class: 'lab-app-dialog' },
      }"
      @update:visible="(open: boolean) => !open && (pendingRegenerate = null)"
    >
      <p class="m-0 text-sm text-lab-general-text">
        Regenerate {{ pendingRegenerateLabel }}?
      </p>
      <p class="m-0 mt-2 text-xs text-lab-general-text-muted">
        The current secret is replaced immediately. Anything already calling the old URL will start
        receiving <code>401 Unauthorized</code> — you would need to give those callers the new one.
      </p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            :id="generateUniqueId('wf-webhook-regenerate-cancel')"
            label="Keep them"
            size="small"
            text
            severity="secondary"
            @click="pendingRegenerate = null"
          />
          <Button
            :id="generateUniqueId('wf-webhook-regenerate-confirm')"
            label="Regenerate"
            size="small"
            severity="danger"
            :loading="busy"
            @click="confirmRegenerate"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
