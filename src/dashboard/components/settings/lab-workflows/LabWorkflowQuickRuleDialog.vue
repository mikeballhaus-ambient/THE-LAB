<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { resolveLabDomainEventLabel } from '@/shared/utils/palette-display-text';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabRuleDefinitionV1, LabRuleRecord, LabRuleScope } from '@/shared/types/lab-rule';
import { parseLabRuleDefinition } from '@/shared/types/schemas/lab-rule-schema';
import { createLabRule } from '@/shared/services/platform-lab-rules.client';
import { createDefaultLabRuleDefinition } from '@/shared/utils/lab-rule-defaults';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import LabRuleDefinitionEditor from '../LabRuleDefinitionEditor.vue';
import LabRulesEditorSection from '../lab-rules/LabRulesEditorSection.vue';
import {
  formCheckboxPt,
  formInputNumberPt,
  formInputTextPt,
  formSelectPt,
  withFormControlRootId,
} from '@/shared/forms/form-control-pt';

const props = defineProps<{
  visible: boolean;
  workflowTriggerEventType: string;
  catalogEntries: LabDomainEventCatalogEntry[];
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
  adminMode: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  created: [rule: LabRuleRecord];
  cancel: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const workflowTriggerEventLabel = computed(() =>
  resolveLabDomainEventLabel(props.workflowTriggerEventType, props.catalogEntries),
);

const parseError = ref('');
const saving = ref(false);
let closedAfterSave = false;

const scopeOptions = [
  { label: 'Global', value: 'global' as LabRuleScope },
  { label: 'User', value: 'user' as LabRuleScope },
];

const form = ref({
  id: '',
  name: '',
  description: '',
  scope: 'user' as LabRuleScope,
  ownerUserId: null as number | null,
  enabled: true,
  priority: 100,
  definition: createDefaultLabRuleDefinition() as LabRuleDefinitionV1,
});

const enabledCheckboxId = generateUniqueId('wf-quick-rule-enabled');
const enabledCheckboxControlId = generateUniqueId('wf-quick-rule-enabled-control');
const scopeFieldId = generateUniqueId('wf-quick-rule-scope');
const ownerFieldId = generateUniqueId('wf-quick-rule-owner');
const nameFieldId = generateUniqueId('wf-quick-rule-name');
const descFieldId = generateUniqueId('wf-quick-rule-desc');
const priorityFieldId = generateUniqueId('wf-quick-rule-priority');

function resetForm(): void {
  parseError.value = '';
  const eventTypes = props.workflowTriggerEventType
    ? [props.workflowTriggerEventType]
    : undefined;
  form.value = {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    scope: props.adminMode ? 'global' : 'user',
    ownerUserId: null,
    enabled: true,
    priority: 100,
    definition: createDefaultLabRuleDefinition(eventTypes),
  };
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      resetForm();
    }
  },
);

function onVisibleUpdate(visible: boolean): void {
  emit('update:visible', visible);
  if (!visible && !closedAfterSave) {
    emit('cancel');
  }
  if (!visible) {
    closedAfterSave = false;
  }
}

async function save(): Promise<void> {
  parseError.value = '';
  let definition: LabRuleDefinitionV1;
  try {
    definition = parseLabRuleDefinition(form.value.definition);
  } catch (err) {
    parseError.value = err instanceof Error ? err.message : 'Invalid rule definition';
    return;
  }
  if (!definition.trigger.eventTypes.length) {
    parseError.value = 'Add at least one trigger event';
    return;
  }
  if (!form.value.name.trim()) {
    parseError.value = 'Rule name is required';
    return;
  }

  saving.value = true;
  try {
    const rule = await createLabRule({
      id: form.value.id,
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      scope: props.adminMode ? form.value.scope : 'user',
      ownerUserId:
        props.adminMode && form.value.scope === 'user' ? form.value.ownerUserId : undefined,
      enabled: form.value.enabled,
      priority: form.value.priority,
      definition,
    });
    toast.add({
      severity: 'success',
      summary: 'Rule saved',
      detail: `"${rule.name}" is in the Rules Engine library.`,
      life: 4000,
    });
    closedAfterSave = true;
    emit('update:visible', false);
    emit('created', rule);
  } catch (err) {
    parseError.value = err instanceof Error ? err.message : 'Could not save rule';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Create rule for workflow"
    class="lab-rules-dialog lab-form-runtime"
    :style="{ width: 'min(44rem, 96vw)' }"
    :pt="{
      root: { attrs: { id: generateUniqueId('wf-quick-rule-dialog') } },
      content: { class: 'lab-rules-dialog-content' },
    }"
    @update:visible="onVisibleUpdate"
  >
    <div class="lab-rules-dialog-layout">
      <div class="lab-rules-dialog-meta">
        <Message v-if="parseError" severity="error" class="mb-3!">{{ parseError }}</Message>
        <p class="mb-3 text-sm text-lab-general-text-muted">
          Saves to <strong>Rules Engine</strong> and links this workflow step to the new rule.
          Trigger events default to
          <strong v-if="workflowTriggerEventType">{{ workflowTriggerEventLabel }}</strong><span v-else>this workflow’s event</span>.
        </p>
        <LabRulesEditorSection
          :step="1"
          title="Rule details"
          subtitle="Name and scope for the library entry."
          variant="details"
        >
          <div class="flex flex-col gap-3">
            <div v-if="adminMode" class="lab-rules-field-row">
              <label class="lab-rules-field-label" :for="scopeFieldId">Scope</label>
              <Select
                v-model="form.scope"
                class="min-w-[10rem] flex-1"
                :options="scopeOptions"
                option-label="label"
                option-value="value"
                :pt="withFormControlRootId(formSelectPt, scopeFieldId)"
              />
            </div>
            <div v-if="adminMode && form.scope === 'user'" class="lab-rules-field-row">
              <label class="lab-rules-field-label" :for="ownerFieldId">Owner id</label>
              <InputNumber
                v-model="form.ownerUserId"
                class="flex-1"
                :pt="withFormControlRootId(formInputNumberPt, ownerFieldId)"
              />
            </div>
            <div class="lab-rules-field-row">
              <label class="lab-rules-field-label" :for="nameFieldId">Name *</label>
              <InputText
                v-model="form.name"
                class="flex-1"
                placeholder="e.g. Task has assignee"
                :pt="withFormControlRootId(formInputTextPt, nameFieldId)"
              />
            </div>
            <div class="lab-rules-field-row lab-rules-field-row--start">
              <label class="lab-rules-field-label pt-2" :for="descFieldId">Description</label>
              <InputText
                v-model="form.description"
                class="flex-1"
                placeholder="Optional"
                :pt="withFormControlRootId(formInputTextPt, descFieldId)"
              />
            </div>
            <div class="lab-rules-field-row flex-wrap">
              <label class="lab-rules-field-label" :for="priorityFieldId">Priority</label>
              <InputNumber
                v-model="form.priority"
                class="w-[8rem]"
                :pt="withFormControlRootId(formInputNumberPt, priorityFieldId)"
              />
              <div class="ml-auto flex items-center gap-2">
                <Checkbox
                  v-model="form.enabled"
                  binary
                  :input-id="enabledCheckboxId"
                  :pt="withFormControlRootId(formCheckboxPt, enabledCheckboxControlId)"
                />
                <label class="text-sm text-lab-general-text" :for="enabledCheckboxId">Enabled</label>
              </div>
            </div>
          </div>
        </LabRulesEditorSection>
      </div>
      <div class="lab-rules-dialog-scroll">
        <LabRuleDefinitionEditor
          v-model="form.definition"
          :catalog-entries="catalogEntries"
          :integration-service-catalog="integrationServiceCatalog"
          :rule-scope="form.scope"
        />
      </div>
    </div>
    <template #footer>
      <Button
        :id="generateUniqueId('wf-quick-rule-cancel')"
        label="Cancel"
        text
        :disabled="saving"
        @click="onVisibleUpdate(false)"
      />
      <Button
        :id="generateUniqueId('wf-quick-rule-save')"
        label="Save rule"
        :loading="saving"
        @click="save"
      />
    </template>
  </Dialog>
</template>
