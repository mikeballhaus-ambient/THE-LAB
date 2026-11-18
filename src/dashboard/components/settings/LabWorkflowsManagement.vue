<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabWorkflowDefinition, LabWorkflowRecord, LabWorkflowScope } from '@/shared/types/lab-workflow';
import {
  getWorkflowTriggerEventType,
  isLabWorkflowDefinitionV2,
} from '@/shared/utils/lab-workflow-definition';
import { ensureWorkflowGraphDefinition } from '@/shared/utils/lab-workflow-graph-migrate';
import { validateLabWorkflowGraphForSave } from '@/shared/utils/lab-workflow-graph-validate';
import { parseLabWorkflowDefinition } from '@/shared/types/schemas/lab-workflow-schema';
import {
  createLabWorkflow,
  deleteLabWorkflow,
  fetchLabWorkflows,
  updateLabWorkflow,
} from '@/shared/services/platform-lab-workflows.client';
import { fetchLabDomainEventCatalog } from '@/shared/services/platform-lab-events.client';
import { fetchLabIntegrationServiceCatalog } from '@/shared/services/platform-lab-integrations.client';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import { createDefaultLabWorkflowDefinition } from '@/shared/utils/lab-workflow-defaults';
import LabWorkflowDefinitionEditor from './LabWorkflowDefinitionEditor.vue';
import LabWorkflowTriggerEventBadge from './lab-workflows/LabWorkflowTriggerEventBadge.vue';
import LabRecordRowActions from '@/shared/ui/LabRecordRowActions.vue';
import { labRecordActionRootAttrs } from '@/shared/constants/lab-record-automation';
import {
  formCheckboxPt,
  formInputNumberPt,
  formInputTextPt,
  formSelectPt,
  withFormControlRootId,
} from '@/shared/forms/form-control-pt';
import '@/assets/styles/platform-catalog-app.css';
import { fetchActivePlatformUsersForClient } from '@/shared/services/platform-user-client';
import {
  buildPlatformUserNameMap,
  formatPlatformUserDisplayName,
  labAutomationOwnerColumnLabel,
} from '@/shared/utils/lab-automation-owner-display';

const props = defineProps<{
  adminMode: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const workflowGraphSaveBlocked = computed((): string | null => {
  if (!dialogVisible.value) {
    return null;
  }
  const def = form.value.definition;
  if (!isLabWorkflowDefinitionV2(def)) {
    return null;
  }
  return validateLabWorkflowGraphForSave(def);
});

const workflows = ref<LabWorkflowRecord[]>([]);
const userNameById = ref(new Map<number, string>());
const ownerUserOptions = ref<{ label: string; value: number }[]>([]);
const catalogEntries = ref<LabDomainEventCatalogEntry[]>([]);
const integrationServiceCatalog = ref<LabIntegrationServiceCatalogResponse | null>(null);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingId = ref<string | null>(null);
const parseError = ref('');
const workflowEditorRef = ref<InstanceType<typeof LabWorkflowDefinitionEditor> | null>(null);

/**
 * Full-screen designer.
 *
 * A viewport-sized overlay, deliberately **not** the browser Fullscreen API: every nested dialog in
 * the designer (edge settings, quick rule, code editor, run details) is teleported to `<body>`, and
 * the API would paint the body outside the fullscreen element — those dialogs would open invisibly.
 * A fixed overlay keeps them stacked above the designer for free.
 *
 * The header meta strip travels with the overlay, so name / priority / Enabled and Save stay
 * reachable without leaving full screen.
 */
const designerFullscreen = ref(false);

watch(dialogVisible, (visible) => {
  if (!visible) {
    designerFullscreen.value = false;
  }
});

/**
 * Mirrors the mode onto `<body>` for the two rules that cannot be expressed from inside the app pane:
 * hiding the shell's quick nav / Sidecar, and dropping the sidecar's reserved right-hand padding.
 * Both live outside this component's tree, and the Sidecar is a `fixed` sibling at a higher z-index
 * than any ancestor of the editor can reach.
 */
watch(designerFullscreen, (active) => {
  document.body.classList.toggle('lab-designer-fullscreen', active);
});

/**
 * Escape leaves full screen, unless a designer dialog is open — that dialog owns Escape itself.
 *
 * Registered in the **capture** phase and stopped there, because the editor can be hosted inside the
 * Settings dialog (Settings → My workflows). That dialog also closes on Escape, so without capturing,
 * one Escape would both leave full screen *and* close Settings. Capturing means this runs first and
 * the host dialog never sees the key.
 *
 * The host mask is excluded rather than every mask being ignored, so a *nested* dialog (edge
 * settings, quick rule, code editor…) still handles its own Escape.
 */
function onDesignerFullscreenKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !designerFullscreen.value) {
    return;
  }
  const hostMask = document
    .querySelector('.lab-workflows-editor')
    ?.closest('.p-dialog-mask');
  const nestedMaskOpen = Array.from(document.querySelectorAll('.p-dialog-mask')).some(
    (mask) => mask !== hostMask,
  );
  if (nestedMaskOpen) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  designerFullscreen.value = false;
}

const scopeOptions = [
  { label: 'Global', value: 'global' as LabWorkflowScope },
  { label: 'User', value: 'user' as LabWorkflowScope },
];

const form = ref({
  id: '',
  name: '',
  description: '',
  scope: 'user' as LabWorkflowScope,
  ownerUserId: null as number | null,
  enabled: true,
  priority: 100,
  definition: createDefaultLabWorkflowDefinition() as LabWorkflowDefinition,
});

const title = computed(() =>
  props.adminMode ? 'Lab workflows (admin)' : 'My workflows',
);

const enabledCheckboxId = generateUniqueId('lab-workflows-enabled');
const enabledCheckboxControlId = generateUniqueId('lab-workflows-enabled-control');
const enabledStatusLabelId = generateUniqueId('lab-workflows-status-label');
const nameFieldId = generateUniqueId('lab-workflows-name');
const priorityFieldId = generateUniqueId('lab-workflows-priority');
const descFieldId = generateUniqueId('lab-workflows-desc');
const scopeFieldId = generateUniqueId('lab-workflows-scope');
const ownerFieldId = generateUniqueId('lab-workflows-owner');

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

function ownerLabelForWorkflow(workflow: LabWorkflowRecord): string {
  return labAutomationOwnerColumnLabel(workflow.scope, workflow.ownerUserId, userNameById.value);
}

/**
 * Graph workflows keep the trigger on a `trigger` node rather than `definition.trigger`, so the
 * list must read both shapes or newly saved workflows render an empty Event cell.
 */
function triggerEventTypeForWorkflow(workflow: LabWorkflowRecord): string {
  return getWorkflowTriggerEventType(workflow.definition) ?? '';
}

async function loadworkflows(): Promise<void> {
  loading.value = true;
  try {
    workflows.value = await fetchLabWorkflows(props.adminMode ? undefined : undefined);
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: err instanceof Error ? err.message : 'Could not load workflows',
      life: 6000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadAdminUserDirectory();
  void loadworkflows();
  void fetchLabDomainEventCatalog()
    .then((catalog) => {
      catalogEntries.value = catalog.entries;
    })
    .catch(() => {
      catalogEntries.value = [];
    });
  void fetchLabIntegrationServiceCatalog()
    .then((catalog) => {
      integrationServiceCatalog.value = catalog;
    })
    .catch(() => {
      integrationServiceCatalog.value = null;
    });
  window.addEventListener('keydown', onDesignerFullscreenKeydown, { capture: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onDesignerFullscreenKeydown, { capture: true });
  document.body.classList.remove('lab-designer-fullscreen');
});

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
    definition: createDefaultLabWorkflowDefinition(),
  };
  dialogVisible.value = true;
}

function openEdit(workflow: LabWorkflowRecord): void {
  dialogMode.value = 'edit';
  editingId.value = workflow.id;
  parseError.value = '';
  form.value = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? '',
    scope: workflow.scope,
    ownerUserId: workflow.ownerUserId,
    enabled: workflow.enabled,
    priority: workflow.priority,
    definition: ensureWorkflowGraphDefinition(workflow.definition),
  };
  dialogVisible.value = true;
}

async function saveDialog(): Promise<void> {
  parseError.value = '';
  await nextTick();
  const flushed = workflowEditorRef.value?.flushWorkflowDefinition();
  if (flushed) {
    form.value.definition = flushed;
  }
  let definition: LabWorkflowDefinition;
  try {
    definition = parseLabWorkflowDefinition(form.value.definition);
  } catch (err) {
    parseError.value = err instanceof Error ? err.message : 'Invalid workflow definition';
    return;
  }

  if (isLabWorkflowDefinitionV2(definition)) {
    const graphError = validateLabWorkflowGraphForSave(definition);
    if (graphError) {
      parseError.value = graphError;
      return;
    }
  } else {
    const incompleteRule = definition.steps.some(
      (step) => step.kind === 'rule_ref' && !step.ruleId,
    );
    if (incompleteRule) {
      parseError.value = 'Finish or remove “New rule” placeholders on the canvas before saving.';
      return;
    }
  }

  try {
    let saved: LabWorkflowRecord | undefined;
    if (dialogMode.value === 'create') {
      saved = await createLabWorkflow({
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
      saved = await updateLabWorkflow(editingId.value, patch);
    }
    if (saved) {
      form.value.definition = ensureWorkflowGraphDefinition(saved.definition);
    }
    if (dialogMode.value === 'create') {
      dialogMode.value = 'edit';
      editingId.value = form.value.id;
    }
    await loadworkflows();
    toast.add({
      severity: 'success',
      summary: 'Workflow saved',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : 'Could not save workflow',
      life: 6000,
    });
  }
}

async function removeworkflow(workflow: LabWorkflowRecord): Promise<void> {
  try {
    await deleteLabWorkflow(workflow.id);
    await loadworkflows();
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
  <div class="lab-workflows-management text-lab-general-text" :class="{ 'is-editing': dialogVisible }">
    <!-- List view. Padding lives here (not on the tab panel) so the editor can run edge-to-edge. -->
    <div v-if="!dialogVisible" class="lab-workflows-list p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-lab-general-text">{{ title }}</h2>
          <p class="text-sm text-lab-general-text-muted">
            When something happens in a connected app, run a sequence of checks and actions—notify
            people, update records, or request approvals. Reuse rules you have already saved in the
            lab.
          </p>
        </div>
        <Button
          :id="generateUniqueId('lab-workflows-create')"
          label="New workflow"
          icon="pi pi-plus"
          :pt="{
            root: {
              attrs: labRecordActionRootAttrs('create', 'new', 'New workflow'),
            },
          }"
          @click="openCreate"
        />
      </div>

      <DataTable :value="workflows" :loading="loading" size="small" class="text-lab-general-text">
        <Column field="name" header="Name">
          <template #body="{ data }">
            <div class="flex flex-col">
              <span>{{ data.name }}</span>
              <span
                v-if="data.description?.trim()"
                class="text-xs text-lab-general-text-muted"
              >
                {{ data.description }}
              </span>
            </div>
          </template>
        </Column>
        <Column v-if="adminMode" field="scope" header="Scope" />
        <Column v-if="adminMode" header="Owner">
          <template #body="{ data }">
            {{ ownerLabelForWorkflow(data) }}
          </template>
        </Column>
        <Column field="enabled" header="Enabled">
          <template #body="{ data }">
            {{ data.enabled ? 'Yes' : 'No' }}
          </template>
        </Column>
        <Column field="priority" header="Priority" />
        <Column header="Event">
          <template #body="{ data }">
            <LabWorkflowTriggerEventBadge
              :event-type="triggerEventTypeForWorkflow(data)"
              :catalog-entries="catalogEntries"
            />
          </template>
        </Column>
        <Column header="Actions" class="lab-workflows-list__actions-col">
          <template #body="{ data }">
            <LabRecordRowActions
              :record-id="data.id"
              :record-name="data.name"
              id-prefix="lab-workflows"
              @edit="openEdit(data)"
              @delete="removeworkflow(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!--
      Edit view. Not a modal, and not a panel underneath the table either: the graph canvas needs
      the whole view. The list is replaced rather than stacked, so the canvas gets every pixel below
      the header instead of whatever the table left over. This is a view swap, not a modal — there is
      no mask, no focus trap, and Close/Cancel return to the list.
    -->
    <section
      v-else
      class="lab-workflows-editor lab-workflows-dialog lab-form-runtime"
      :class="{ 'is-designer-fullscreen': designerFullscreen }"
      :id="generateUniqueId('lab-workflows-dialog')"
      :aria-label="dialogMode === 'create' ? 'Create workflow' : 'Edit workflow'"
    >
      <header class="lab-workflows-editor-header mb-1">
        <div class="flex flex-col w-full">
          <div class="flex justify-between">
            <div class="lab-workflows-editor-heading">
              <h3 class="m-0 text-base font-semibold text-lab-general-text">
                {{ dialogMode === 'create' ? 'Create workflow' : 'Edit workflow' }}
              </h3>
              <!--
                Bare icon, no button chrome, sitting with the title it belongs to. A native <button>
                rather than a clickable <i>: stripping the chrome is purely visual, and an <i> would lose
                focusability, Enter/Space activation and the accessible name `aria-label` supplies.
              -->
              <button
                :id="generateUniqueId('lab-workflows-fullscreen')"
                type="button"
                class="lab-workflows-editor-icon-btn"
                :aria-label="designerFullscreen ? 'Exit full screen' : 'Full screen'"
                :aria-pressed="designerFullscreen"
                :title="designerFullscreen ? 'Exit full screen (Esc)' : 'Full screen designer'"
                @click="designerFullscreen = !designerFullscreen"
              >
                <i
                  class="pi"
                  :class="designerFullscreen ? 'pi-window-minimize' : 'pi-window-maximize'"
                  aria-hidden="true"
                />
              </button>
            </div>
            <div class="lab-workflows-editor-actions">
              <Button :id="generateUniqueId('lab-workflows-cancel-top')" label="Cancel" text size="small"
                @click="dialogVisible = false" />
              <Button :id="generateUniqueId('lab-workflows-save-top')" label="Save" size="small"
                :disabled="workflowGraphSaveBlocked !== null" :title="workflowGraphSaveBlocked ?? undefined"
                @click="saveDialog" />
            </div>
          </div>
          <!--
          Scope/owner, then the single meta row. Lives in the header so workflow identity and the
          save controls share one band instead of occupying a strip of canvas height.
        -->
          <div class="lab-workflows-dialog-meta">
            <div v-if="adminMode" class="lab-rules-field-row">
              <label class="lab-rules-field-label" :for="scopeFieldId">Scope</label>
              <Select v-model="form.scope" class="min-w-[10rem] flex-1" :options="scopeOptions" option-label="label"
                option-value="value" :pt="withFormControlRootId(formSelectPt, scopeFieldId)" />
            </div>
            <div v-if="adminMode && form.scope === 'user'" class="lab-rules-field-row">
              <label class="lab-rules-field-label" :for="ownerFieldId">Owner</label>
              <Select v-model="form.ownerUserId" class="flex-1" :options="ownerUserOptions" option-label="label"
                option-value="value" placeholder="Select lab user"
                :pt="withFormControlRootId(formSelectPt, ownerFieldId)" />
            </div>
            <!--
            Single meta row. Labels sit inline against their control rather than stacked above —
            stacked labels cost a full line each, and this row sits directly above the canvas where
            every pixel of height comes out of the graph.
          -->
            <div class="lab-workflows-meta-row">
              <label class="lab-workflows-meta-label" :for="nameFieldId">Name</label>
              <InputText v-model="form.name" class="lab-workflows-meta-name" placeholder="e.g. Notify on new task"
                :pt="withFormControlRootId(formInputTextPt, nameFieldId)" />
              <label class="lab-workflows-meta-label" :for="descFieldId">Description</label>
              <InputText v-model="form.description" class="lab-workflows-meta-desc"
                placeholder="Optional summary for admins" :pt="withFormControlRootId(formInputTextPt, descFieldId)" />
              <label class="lab-workflows-meta-label" :for="priorityFieldId">Priority</label>
              <InputNumber v-model="form.priority" class="lab-workflows-meta-priority"
                :pt="withFormControlRootId(formInputNumberPt, priorityFieldId)" />
              <div class="lab-workflows-meta-status">
                <Checkbox v-model="form.enabled" binary :input-id="enabledCheckboxId"
                  :pt="withFormControlRootId(formCheckboxPt, enabledCheckboxControlId)"
                  :aria-labelledby="enabledStatusLabelId" />
                <label class="whitespace-nowrap text-lab-general-text" :for="enabledCheckboxId">
                  Enabled
                </label>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div class="lab-workflows-dialog-body">
        <Message v-if="parseError" severity="error" class="m-0!">{{ parseError }}</Message>
        <LabWorkflowDefinitionEditor ref="workflowEditorRef" v-model="form.definition" :catalog-entries="catalogEntries"
          :integration-service-catalog="integrationServiceCatalog" :admin-mode="adminMode" :workflow-id="editingId" />
      </div>
      <!--
        The save-blocker message stays here, but the Cancel/Save buttons do not: they are already in
        the header, and duplicating them at the bottom of a viewport-tall canvas meant two identical
        action bars framing the editor.
      -->
      <footer v-if="workflowGraphSaveBlocked" class="lab-workflows-editor-footer">
        <p class="lab-workflows-editor-blocker m-0">{{ workflowGraphSaveBlocked }}</p>
      </footer>
    </section>
  </div>
</template>
