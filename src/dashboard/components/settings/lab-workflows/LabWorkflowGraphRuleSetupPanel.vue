<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { resolveLabDomainEventLabel } from '@/shared/utils/palette-display-text';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import LabWorkflowPayloadConditionFields from './LabWorkflowPayloadConditionFields.vue';
import { formInputTextPt, withFormControlRootId } from '@/shared/forms/form-control-pt';
import type { CapturedPayloadField } from '@/shared/utils/lab-workflow-captured-payload-fields';

const props = defineProps<{
  workflowTriggerEventType: string;
  name?: string;
  conditions?: LabRuleConditionV1[];
  catalogEntries: LabDomainEventCatalogEntry[];
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
  labUserOptions: { label: string; value: string }[];
  capturedPayloadFields?: CapturedPayloadField[];
}>();

const emit = defineEmits<{
  apply: [payload: { name: string; conditions: LabRuleConditionV1[] }];
}>();

const { generateUniqueId } = useUniqueElementId();

const workflowTriggerEventLabel = computed(() =>
  resolveLabDomainEventLabel(props.workflowTriggerEventType, props.catalogEntries),
);

const parseError = ref('');
const nameFieldId = generateUniqueId('wf-graph-rule-name');

const formName = ref('');
const formConditions = ref<LabRuleConditionV1[]>([]);

function syncFromProps(): void {
  parseError.value = '';
  formName.value = props.name?.trim() ?? '';
  formConditions.value = props.conditions?.length
    ? props.conditions.map((condition) => ({ ...condition }))
    : [];
}

watch(
  () => [props.name, props.conditions, props.workflowTriggerEventType] as const,
  () => syncFromProps(),
  { immediate: true, deep: true },
);

function onFormConditionsUpdate(next: LabRuleConditionV1[]): void {
  formConditions.value = next;
}

function applyToWorkflow(): void {
  parseError.value = '';
  if (!formConditions.value.length) {
    parseError.value = 'Add at least one condition';
    return;
  }
  if (!formName.value.trim()) {
    parseError.value = 'Rule name is required';
    return;
  }
  emit('apply', {
    name: formName.value.trim(),
    conditions: formConditions.value.map((condition) => ({ ...condition })),
  });
}
</script>

<template>
  <div class="mt-2 flex flex-col gap-3">
    <Message v-if="parseError" severity="error" :closable="false">{{ parseError }}</Message>
    <p class="m-0 text-xs text-lab-general-text-muted">
      Rule is stored on this workflow. It runs against
      <strong v-if="workflowTriggerEventType">{{ workflowTriggerEventLabel }}</strong
      ><span v-else>the workflow trigger event</span>.
    </p>
    <div class="lab-rules-field-row">
      <label class="lab-rules-field-label" :for="nameFieldId">Name *</label>
      <InputText
        v-model="formName"
        class="flex-1"
        placeholder="e.g. Task has assignee"
        :pt="withFormControlRootId(formInputTextPt, nameFieldId)"
      />
    </div>
    <LabWorkflowPayloadConditionFields
      :conditions="formConditions"
      :trigger-event-type="workflowTriggerEventType"
      :catalog-entries="catalogEntries"
      :integration-service-catalog="integrationServiceCatalog"
      :lab-user-options="labUserOptions"
      :captured-payload-fields="capturedPayloadFields"
      field-key-prefix="wf-graph-rule"
      @update:conditions="onFormConditionsUpdate"
    />
    <Button
      label="Apply to workflow"
      icon="pi pi-check"
      size="small"
      class="w-full"
      :pt="{ root: { attrs: { id: generateUniqueId('wf-graph-rule-apply') } } }"
      @click="applyToWorkflow"
    />
  </div>
</template>
