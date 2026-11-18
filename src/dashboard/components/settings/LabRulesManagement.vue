<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import Message from 'primevue/message';
import LabRulesEditorSection from './lab-rules/LabRulesEditorSection.vue';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabRuleDefinitionV1, LabRuleRecord, LabRuleScope } from '@/shared/types/lab-rule';
import { parseLabRuleDefinition } from '@/shared/types/schemas/lab-rule-schema';
import {
  createLabRule,
  deleteLabRule,
  fetchLabRules,
  updateLabRule,
} from '@/shared/services/platform-lab-rules.client';
import { fetchLabDomainEventCatalog } from '@/shared/services/platform-lab-events.client';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import { createDefaultLabRuleDefinition } from '@/shared/utils/lab-rule-defaults';
import { getRuleTriggerEventTypes } from '@/shared/utils/lab-rule-trigger';
import { findCatalogEntryByEventType } from '@/shared/services/lab-domain-event-catalog';
import LabRuleDefinitionEditor from './LabRuleDefinitionEditor.vue';
import {
  formCheckboxPt,
  formInputNumberPt,
  formInputTextPt,
  formSelectPt,
  withFormControlRootId,
} from '@/shared/forms/form-control-pt';
import { fetchActivePlatformUsersForClient } from '@/shared/services/platform-user-client';
import {
  buildPlatformUserNameMap,
  formatPlatformUserDisplayName,
  labAutomationOwnerColumnLabel,
} from '@/shared/utils/lab-automation-owner-display';
import LabRecordRowActions from '@/shared/ui/LabRecordRowActions.vue';
import { labRecordActionRootAttrs } from '@/shared/constants/lab-record-automation';

const props = defineProps<{
  adminMode: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const rules = ref<LabRuleRecord[]>([]);
const userNameById = ref(new Map<number, string>());
const ownerUserOptions = ref<{ label: string; value: number }[]>([]);
const catalogEntries = ref<LabDomainEventCatalogEntry[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingId = ref<string | null>(null);
const parseError = ref('');

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

const title = computed(() =>
  props.adminMode ? 'Lab rules (admin)' : 'My automation rules',
);

const enabledCheckboxId = generateUniqueId('lab-rules-enabled');
const enabledCheckboxControlId = generateUniqueId('lab-rules-enabled-control');
const scopeFieldId = generateUniqueId('lab-rules-scope');
const ownerFieldId = generateUniqueId('lab-rules-owner');
const nameFieldId = generateUniqueId('lab-rules-name');
const descFieldId = generateUniqueId('lab-rules-desc');
const priorityFieldId = generateUniqueId('lab-rules-priority');
const dialogScrollRef = ref<HTMLElement | null>(null);

function resetDialogScroll(): void {
  void nextTick(() => {
    if (dialogScrollRef.value) {
      dialogScrollRef.value.scrollTop = 0;
    }
  });
}

watch(dialogVisible, (visible) => {
  if (visible) {
    resetDialogScroll();
  }
});

async function loadCatalog(): Promise<void> {
  try {
    const catalog = await fetchLabDomainEventCatalog();
    catalogEntries.value = catalog.entries;
  } catch {
    catalogEntries.value = [];
  }
}

async function loadAdminUserDirectory(): Promise<void> {
  if (!props.adminMode) {
    userNameById.value = new Map();
    ownerUserOptions.value = [];
    return;
  }
  try {
    const users = await fetchActivePlatformUsersForClient();
    userNameById.value = buildPlatformUserNameMap(users);
    ownerUserOptions.value = users
      .map((user) => ({ label: formatPlatformUserDisplayName(user), value: user.userId }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    userNameById.value = new Map();
    ownerUserOptions.value = [];
  }
}

function ownerLabelForRule(rule: LabRuleRecord): string {
  return labAutomationOwnerColumnLabel(rule.scope, rule.ownerUserId, userNameById.value);
}

async function loadRules(): Promise<void> {
  loading.value = true;
  try {
    rules.value = await fetchLabRules(props.adminMode ? undefined : undefined);
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: err instanceof Error ? err.message : 'Could not load rules',
      life: 6000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadAdminUserDirectory();
  void loadCatalog();
  void loadRules();
});

function defaultEventTypes(): string[] {
  const first = catalogEntries.value[0]?.eventType;
  if (first) {
    return [first];
  }
  return getRuleTriggerEventTypes(createDefaultLabRuleDefinition().trigger);
}

function openCreate(): void {
  dialogMode.value = 'create';
  editingId.value = null;
  parseError.value = '';
  form.value = {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    scope: props.adminMode ? 'global' : 'user',
    ownerUserId: null,
    enabled: true,
    priority: 100,
    definition: createDefaultLabRuleDefinition(defaultEventTypes()),
  };
  dialogVisible.value = true;
  resetDialogScroll();
}

function openEdit(rule: LabRuleRecord): void {
  dialogMode.value = 'edit';
  editingId.value = rule.id;
  parseError.value = '';
  form.value = {
    id: rule.id,
    name: rule.name,
    description: rule.description ?? '',
    scope: rule.scope,
    ownerUserId: rule.ownerUserId,
    enabled: rule.enabled,
    priority: rule.priority,
    definition: { ...rule.definition },
  };
  dialogVisible.value = true;
  resetDialogScroll();
}

async function saveDialog(): Promise<void> {
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

  try {
    if (dialogMode.value === 'create') {
      await createLabRule({
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
    } else if (editingId.value) {
      const patch: Record<string, unknown> = {
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        enabled: form.value.enabled,
        priority: form.value.priority,
        definition,
      };
      if (props.adminMode) {
        patch.scope = form.value.scope;
        if (form.value.scope === 'user') {
          patch.ownerUserId = form.value.ownerUserId;
        }
      }
      await updateLabRule(editingId.value, patch);
    }
    dialogVisible.value = false;
    await loadRules();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : 'Could not save rule',
      life: 6000,
    });
  }
}

async function removeRule(rule: LabRuleRecord): Promise<void> {
  try {
    await deleteLabRule(rule.id);
    await loadRules();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: err instanceof Error ? err.message : 'Could not delete',
      life: 6000,
    });
  }
}
</script>

<template>
  <div class="lab-rules-management min-h-0 p-4 text-lab-general-text">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-lg font-semibold text-lab-general-text">{{ title }}</h2>
        <p class="text-sm text-lab-general-text-muted">
          When an app publishes a lab domain event, matching rules run on the platform backend.
        </p>
      </div>
      <Button
        :id="generateUniqueId('lab-rules-create')"
        label="New rule"
        icon="pi pi-plus"
        :pt="{
          root: {
            attrs: labRecordActionRootAttrs('create', 'new', 'New rule'),
          },
        }"
        @click="openCreate"
      />
    </div>

    <DataTable :value="rules" :loading="loading" size="small" class="text-lab-general-text">
      <Column field="name" header="Name" />
      <Column v-if="adminMode" field="scope" header="Scope" />
      <Column v-if="adminMode" header="Owner">
        <template #body="{ data }">
          {{ ownerLabelForRule(data) }}
        </template>
      </Column>
      <Column field="enabled" header="Enabled">
        <template #body="{ data }">
          {{ data.enabled ? 'Yes' : 'No' }}
        </template>
      </Column>
      <Column field="priority" header="Priority" />
      <Column header="Events">
        <template #body="{ data }">
          {{
            getRuleTriggerEventTypes(data.definition?.trigger ?? {})
              .map((t) => findCatalogEntryByEventType(t, catalogEntries)?.label ?? t)
              .join(', ')
          }}
        </template>
      </Column>
      <Column header="Actions">
        <template #body="{ data }">
          <LabRecordRowActions
            :record-id="data.id"
            :record-name="data.name"
            id-prefix="lab-rules"
            @edit="openEdit(data)"
            @delete="removeRule(data)"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="dialogMode === 'create' ? 'Create rule' : 'Edit rule'"
      class="lab-rules-dialog lab-form-runtime"
      :style="{ width: 'min(44rem, 96vw)' }"
      :pt="{
        root: { attrs: { id: generateUniqueId('lab-rules-dialog') } },
        content: { class: 'lab-rules-dialog-content' },
      }"
    >
      <div class="lab-rules-dialog-layout">
        <div class="lab-rules-dialog-meta">
          <Message v-if="parseError" severity="error" class="mb-3!">{{ parseError }}</Message>
          <LabRulesEditorSection
            :step="1"
            title="Rule details"
            subtitle="Name, enabled, and priority — always visible while you edit triggers below."
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
                <label class="lab-rules-field-label" :for="ownerFieldId">Owner</label>
                <Select
                  v-model="form.ownerUserId"
                  class="flex-1"
                  :options="ownerUserOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select lab user"
                  :pt="withFormControlRootId(formSelectPt, ownerFieldId)"
                />
              </div>
              <div class="lab-rules-field-row">
                <label class="lab-rules-field-label" :for="nameFieldId">Name *</label>
                <InputText
                  v-model="form.name"
                  class="flex-1"
                  placeholder="e.g. Notify on new task"
                  :pt="withFormControlRootId(formInputTextPt, nameFieldId)"
                />
              </div>
              <div class="lab-rules-field-row lab-rules-field-row--start">
                <label class="lab-rules-field-label pt-2" :for="descFieldId">Description</label>
                <InputText
                  v-model="form.description"
                  class="flex-1"
                  placeholder="What this rule evaluates"
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
                <span class="text-xs text-lab-general-text-muted">Lower runs first</span>
                <div class="ml-auto flex items-center gap-2">
                  <Checkbox
                    v-model="form.enabled"
                    binary
                    :input-id="enabledCheckboxId"
                    :pt="withFormControlRootId(formCheckboxPt, enabledCheckboxControlId)"
                  />
                  <label class="text-sm text-lab-general-text" :for="enabledCheckboxId">Rule enabled</label>
                </div>
              </div>
            </div>
          </LabRulesEditorSection>
        </div>

        <div ref="dialogScrollRef" class="lab-rules-dialog-scroll">
          <LabRuleDefinitionEditor
            v-model="form.definition"
            :catalog-entries="catalogEntries"
            :rule-scope="form.scope"
          />
        </div>
      </div>
      <template #footer>
        <Button
          :id="generateUniqueId('lab-rules-cancel')"
          label="Cancel"
          text
          @click="dialogVisible = false"
        />
        <Button
          :id="generateUniqueId('lab-rules-save')"
          label="Save"
          @click="saveDialog"
        />
      </template>
    </Dialog>
  </div>
</template>
