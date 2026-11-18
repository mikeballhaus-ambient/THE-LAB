<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabWorkflowEdgeWhen, LabWorkflowGraphEdgeV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_EDGE_WHEN_OPTIONS } from '@/shared/utils/lab-workflow-graph-edge';
import { formInputTextPt, formSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';

const props = defineProps<{
  visible: boolean;
  edge: LabWorkflowGraphEdgeV2 | null;
  sourceNodeKind: 'trigger' | 'condition' | 'rule' | 'action' | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  save: [edge: LabWorkflowGraphEdgeV2];
  remove: [edgeId: string];
}>();

const { generateUniqueId } = useUniqueElementId();

const when = ref<LabWorkflowEdgeWhen>('always');
const label = ref('');

const whenOptions = computed(() => {
  const kind = props.sourceNodeKind;
  if (kind === 'condition') {
    return LAB_WORKFLOW_EDGE_WHEN_OPTIONS.filter((o) => o.value === 'on_true' || o.value === 'on_false' || o.value === 'always');
  }
  if (kind === 'rule') {
    return LAB_WORKFLOW_EDGE_WHEN_OPTIONS.filter(
      (o) => o.value === 'on_match' || o.value === 'on_no_match' || o.value === 'always',
    );
  }
  return LAB_WORKFLOW_EDGE_WHEN_OPTIONS.filter((o) => o.value === 'always');
});

watch(
  () => props.edge,
  (edge) => {
    if (!edge) {
      return;
    }
    when.value = edge.when;
    label.value = edge.label ?? '';
  },
  { immediate: true },
);

function close(): void {
  emit('update:visible', false);
}

function save(): void {
  if (!props.edge) {
    return;
  }
  emit('save', {
    ...props.edge,
    when: when.value,
    label: label.value.trim() || undefined,
  });
  close();
}

function removeEdge(): void {
  if (!props.edge) {
    return;
  }
  emit('remove', props.edge.id);
  close();
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    append-to="body"
    header="Connection settings"
    class="lab-workflow-edge-config-dialog lab-form-runtime w-full max-w-md text-lab-general-text"
    :pt="{
      root: { attrs: { id: generateUniqueId('lab-workflow-edge-config-dialog') } },
      mask: { class: 'lab-app-dialog lab-workflow-edge-config-modal' },
    }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="m-0 text-xs text-lab-general-text-muted">
      Choose when this connection is followed during workflow execution.
    </p>
    <div class="mt-3 flex flex-col gap-2">
      <Select
        :model-value="when"
        :options="whenOptions"
        option-label="label"
        option-value="value"
        class="w-full"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId('wf-edge-when'))"
        @update:model-value="(v) => v && (when = v)"
      />
      <InputText
        v-model="label"
        placeholder="Optional label on canvas"
        class="w-full"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId('wf-edge-label'))"
      />
    </div>
    <template #footer>
      <Button
        label="Remove connection"
        severity="danger"
        text
        :pt="{ root: { attrs: { id: generateUniqueId('wf-edge-remove') } } }"
        @click="removeEdge"
      />
      <Button
        label="Cancel"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('wf-edge-cancel') } } }"
        @click="close"
      />
      <Button
        label="Save"
        :pt="{ root: { attrs: { id: generateUniqueId('wf-edge-save') } } }"
        @click="save"
      />
    </template>
  </Dialog>
</template>
