<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import LabWorkflowCodeEditor from './LabWorkflowCodeEditor.vue';
import type { CapturedPayloadField } from '@/shared/utils/lab-workflow-captured-payload-fields';
import { buildCodeNodeExample } from '@/shared/utils/lab-workflow-code-example';

/**
 * Editor for the `code` step.
 *
 * ## The contract, stated once
 *
 * A function taking the **item array** and returning it. `items` is always an array, even for a single
 * webhook call — a trigger wraps the payload in one item, so a body of `{"stepValue": 1}` arrives as
 * `[{ stepValue: 1 }]`. Each `item` is that payload object.
 *
 * The starter code is written as a block (`{ … return items.map(…) }`) rather than a one-liner so the
 * author can see where per-item logic goes. See {@link buildCodeNodeExample}.
 */

const props = defineProps<{
  source: string;
  /** Fields from the most recent captured payload. Empty until something has been captured. */
  payloadPaths?: CapturedPayloadField[];
  blockKey: string;
}>();

const emit = defineEmits<{
  'update:source': [source: string];
}>();

const { generateUniqueId } = useUniqueElementId();
const editorRef = ref<InstanceType<typeof LabWorkflowCodeEditor> | null>(null);
const expandedRef = ref<InstanceType<typeof LabWorkflowCodeEditor> | null>(null);
/**
 * Expanded editing surface.
 *
 * The node sits in a ~360px sidebar, which is enough to *see* the code and not enough to *write* it.
 * Expanding gives the same string a full-width modal with room for the line that caused the error,
 * without inventing a second editing model — both editors bind to `props.source`.
 */
const expanded = ref(false);

const hasPayload = computed(() => (props.payloadPaths ?? []).length > 0);

/**
 * The first numeric field, which is what an "increment" example needs to make sense.
 *
 * Derived from the capture, never a literal: if nothing numeric arrived, there is nothing to
 * increment and the example returns the item untouched instead of naming a field that does not exist.
 */
const numericField = computed(
  () => (props.payloadPaths ?? []).find((field) => field.type === 'number')?.path ?? null,
);

function insertExample(): void {
  emit('update:source', buildCodeNodeExample({ incrementField: numericField.value }));
}

/** Insert into whichever surface is active, so the modal behaves like the inline editor. */
function insertField(path: string): void {
  if (expanded.value) {
    expandedRef.value?.insertSnippet(`item.${path}`);
    return;
  }
  editorRef.value?.insertSnippet(`item.${path}`);
}
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <p class="m-0 text-xs text-lab-general-text-muted">
      A function that receives the items and returns them. Each item is the payload object itself —
      spread it (<code>{ ...item }</code>) to keep the incoming fields. No network, no filesystem, no
      imports.
    </p>

    <div class="relative">
      <LabWorkflowCodeEditor
        ref="editorRef"
        :model-value="source"
        :payload-paths="payloadPaths ?? []"
        :block-key="blockKey"
        @update:model-value="(next) => emit('update:source', next)"
      />
      <!--
        Expand affordance. The sidebar is ~360px wide, which is enough to read the code and cramped
        for writing it; this opens the same string in a full modal rather than a second editor.
      -->
      <Button
        :id="generateUniqueId(`wf-code-expand-${blockKey}`)"
        icon="pi pi-expand"
        size="small"
        text
        severity="secondary"
        class="!absolute !right-1 !top-1"
        aria-label="Expand code editor"
        title="Expand"
        @click="expanded = true"
      />
    </div>

    <div v-if="hasPayload" class="flex flex-wrap items-center gap-1">
      <span class="text-[0.7rem] text-lab-general-text-muted">Insert a field:</span>
      <Button
        v-for="field in payloadPaths"
        :key="`code-path-${field.path}`"
        :id="generateUniqueId(`wf-code-path-${blockKey}-${field.path}`)"
        :label="field.path"
        size="small"
        text
        class="font-mono text-[0.7rem]"
        :title="`${field.path} (${field.type})`"
        @click="insertField(field.path)"
      />
    </div>
    <p v-else class="m-0 text-[0.7rem] text-lab-general-text-muted">
      Capture a payload first — run the workflow once or POST to its test URL — and its fields become
      insertable here.
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <Button
        :id="generateUniqueId(`wf-code-example-${blockKey}`)"
        label="Insert example"
        size="small"
        text
        @click="insertExample"
      />
      <span v-if="numericField" class="text-[0.7rem] text-lab-general-text-muted">
        Increments <code>{{ numericField }}</code>, the first numeric field in the capture.
      </span>
    </div>

    <!--
      Expanded editor. `maximize` on a near full-screen dialog rather than a bespoke overlay: the code
      needs width and height, and every other dialog in the designer already looks like this one.
    -->
    <!--
      Chrome follows the integration-form dialogs (`.lab-integration-dialog`): chrome-tinted header
      with a bottom border, recessed body, footer strip. A hand-built dialog that does not match that
      treatment is the one thing the project rules call out explicitly, and it also fixes a real
      defect — the title sat at 1.06rem against the panel's 0.7rem section headings, so the modal read
      as a *different* surface than the panel that opened it.
    -->
    <Dialog
      :visible="expanded"
      modal
      maximize
      append-to="body"
      header="Code"
      class="lab-integration-dialog lab-form-runtime lab-workflow-code-dialog text-lab-general-text"
      :pt="{
        root: { attrs: { id: generateUniqueId('wf-code-dialog') } },
        mask: { class: 'lab-app-dialog' },
        content: { class: 'lab-workflow-code-dialog__content' },
      }"
      @update:visible="(open: boolean) => (expanded = open)"
    >
      <div class="lab-workflow-code-dialog__body">
        <p class="lab-workflow-code-dialog__lead">
          A function that receives the items and returns them.
          <code>items</code> is always an array — one webhook call is one item.
        </p>

        <LabWorkflowCodeEditor
          ref="expandedRef"
          :model-value="source"
          :payload-paths="payloadPaths ?? []"
          :block-key="`${blockKey}-expanded`"
          class="lab-workflow-code-dialog__editor"
          @update:model-value="(next) => emit('update:source', next)"
        />

        <div class="lab-workflow-code-dialog__fields">
          <template v-if="hasPayload">
            <span class="lab-workflow-code-dialog__fields-label">Insert a field:</span>
            <Button
              v-for="field in payloadPaths"
              :key="`code-path-xl-${field.path}`"
              :id="generateUniqueId(`wf-code-path-xl-${blockKey}-${field.path}`)"
              :label="field.path"
              size="small"
              text
              class="font-mono text-[0.7rem]"
              :title="`${field.path} (${field.type})`"
              @click="insertField(field.path)"
            />
          </template>
          <span v-else class="lab-workflow-code-dialog__fields-label">
            Capture a payload to get insertable field names.
          </span>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <Button
            :id="generateUniqueId('wf-code-dialog-close')"
            label="Done"
            size="small"
            @click="expanded = false"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
