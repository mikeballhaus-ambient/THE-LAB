<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Chips from 'primevue/chips';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
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
import LabWorkflowListCard from './lab-workflows/LabWorkflowListCard.vue';
import { labWorkflowTagKey } from '@/shared/utils/lab-workflow-tags';
import { buildWorkflowSectionsByPrimaryTag } from '@/shared/utils/lab-workflow-tag-sections';
import { LAB_CATALOG_SECTION_PREVIEW_LIMIT } from '@/shared/constants/lab-catalog-ui';
import { labRecordActionRootAttrs } from '@/shared/constants/lab-record-automation';
import {
  formCheckboxPt,
  formInputTextPt,
  formTextareaPt,
  formWorkflowMetaPriorityPt,
  formWorkflowMetaTagsPt,
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
/** Workflow identity fields — overlay on the canvas; default closed to preserve graph height. */
const workflowDetailsOpen = ref(false);

watch(dialogVisible, (visible) => {
  if (!visible) {
    designerFullscreen.value = false;
    workflowDetailsOpen.value = false;
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
  tags: [] as string[],
  definition: createDefaultLabWorkflowDefinition() as LabWorkflowDefinition,
});

function onTagFilterClick(key: string): void {
  selectedTagKey.value = selectedTagKey.value === key ? null : key;
}

function clearTagFilters(): void {
  selectedTagKey.value = null;
}

function onCardTagFilter(tag: string): void {
  const key = labWorkflowTagKey(tag);
  selectedTagKey.value = selectedTagKey.value === key ? null : key;
}

const title = computed(() =>
  props.adminMode ? 'Lab workflows (admin)' : 'My workflows',
);

const selectedTagKey = ref<string | null>(null);

const tagNavLabels = computed(() => {
  const map = new Map<string, string>();
  for (const workflow of workflows.value) {
    for (const tag of workflow.tags ?? []) {
      const key = labWorkflowTagKey(tag);
      if (!map.has(key)) {
        map.set(key, tag);
      }
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([key, label]) => ({ key, label }));
});

const isTagFiltering = computed(() => selectedTagKey.value != null);

const filteredWorkflows = computed(() => {
  const rows = workflows.value;
  const key = selectedTagKey.value;
  if (!key) {
    return rows;
  }
  return rows.filter((workflow) =>
    (workflow.tags ?? []).some((tag) => labWorkflowTagKey(tag) === key),
  );
});

const workflowSectionsByPrimaryTag = computed(() =>
  buildWorkflowSectionsByPrimaryTag(workflows.value),
);

const filteredSectionTitle = computed(() => {
  if (!selectedTagKey.value) {
    return 'Filtered workflows';
  }
  const match = tagNavLabels.value.find((tag) => tag.key === selectedTagKey.value);
  return match?.label ?? 'Filtered workflows';
});

function previewWorkflowsForSection(sectionWorkflows: LabWorkflowRecord[]): LabWorkflowRecord[] {
  return sectionWorkflows.slice(0, LAB_CATALOG_SECTION_PREVIEW_LIMIT);
}

function sectionHasMoreWorkflows(sectionWorkflows: LabWorkflowRecord[]): boolean {
  return sectionWorkflows.length > LAB_CATALOG_SECTION_PREVIEW_LIMIT;
}

const enabledCheckboxId = generateUniqueId('lab-workflows-enabled');
const tagsFieldId = generateUniqueId('lab-workflows-tags');
const enabledCheckboxControlId = generateUniqueId('lab-workflows-enabled-control');
const enabledStatusLabelId = generateUniqueId('lab-workflows-status-label');
const nameFieldId = generateUniqueId('lab-workflows-name');
const priorityFieldId = generateUniqueId('lab-workflows-priority');
const descFieldId = generateUniqueId('lab-workflows-desc');
const scopeFieldId = generateUniqueId('lab-workflows-scope');
const ownerFieldId = generateUniqueId('lab-workflows-owner');
const workflowDetailsToggleId = generateUniqueId('lab-workflows-details-toggle');
const workflowDetailsPanelId = generateUniqueId('lab-workflows-details-panel');

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
    tags: [],
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
    tags: [...(workflow.tags ?? [])],
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
        tags: form.value.tags,
        definition,
      });
    } else if (editingId.value) {
      const patch: Record<string, unknown> = {
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        enabled: form.value.enabled,
        priority: form.value.priority,
        tags: form.value.tags,
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

      <nav
        v-if="tagNavLabels.length || isTagFiltering"
        class="app-catalog-category-nav lab-catalog-tag-filters mb-4"
        role="group"
        aria-label="Filter workflows by tag"
      >
        <button
          v-for="tag in tagNavLabels"
          :key="tag.key"
          type="button"
          class="lab-catalog-tag-chip"
          :class="{ 'lab-catalog-tag-chip--active': selectedTagKey === tag.key }"
          :aria-pressed="selectedTagKey === tag.key"
          :data-lab-workflow-tag="tag.key"
          :aria-label="`Filter workflows by ${tag.label}`"
          :id="generateUniqueId(`lab-workflow-tag-filter-${tag.key}`)"
          @click="onTagFilterClick(tag.key)"
        >
          {{ tag.label }}
        </button>
        <button
          v-if="isTagFiltering"
          type="button"
          class="lab-catalog-tag-chip lab-catalog-tag-chip--clear"
          aria-label="Clear workflow tag filters"
          :id="generateUniqueId('lab-workflow-tag-filter-clear')"
          @click="clearTagFilters"
        >
          Clear filters
        </button>
      </nav>

      <div
        v-if="loading"
        class="text-sm text-lab-general-text-muted"
      >
        Loading workflows…
      </div>
      <p
        v-else-if="!isTagFiltering && workflows.length === 0"
        class="text-sm text-lab-general-text-muted"
      >
        No workflows yet. Create one to get started.
      </p>
      <p
        v-else-if="isTagFiltering && filteredWorkflows.length === 0"
        class="text-sm text-lab-general-text-muted"
      >
        No workflows match this tag.
      </p>

      <div
        v-else-if="!isTagFiltering"
        class="app-catalog-sections-grid"
      >
        <section
          v-for="section in workflowSectionsByPrimaryTag"
          :key="section.key"
          :id="`lab-workflow-section-tag-${section.key}`"
          class="app-catalog-section app-catalog-section--tag-group app-catalog-section--tag-group--wide"
        >
          <header class="app-catalog-section__head">
            <h2 class="app-catalog-section__title">
              {{ section.label }}
              <span class="app-catalog-section__count" aria-hidden="true">({{ section.workflows.length }})</span>
            </h2>
          </header>
          <div class="app-catalog-grid app-catalog-grid--browse lab-workflow-catalog-grid">
            <LabWorkflowListCard
              v-for="workflow in previewWorkflowsForSection(section.workflows)"
              :key="workflow.id"
              :workflow="workflow"
              :trigger-event-type="triggerEventTypeForWorkflow(workflow)"
              :catalog-entries="catalogEntries"
              :admin-mode="adminMode"
              :owner-label="ownerLabelForWorkflow(workflow)"
              @edit="openEdit(workflow)"
              @delete="removeworkflow(workflow)"
              @filter-tag="onCardTagFilter"
            />
          </div>
          <button
            v-if="sectionHasMoreWorkflows(section.workflows)"
            type="button"
            class="lab-catalog-section-more"
            :id="generateUniqueId(`lab-workflow-section-more-${section.key}`)"
            @click="onTagFilterClick(section.key)"
          >
            Show all {{ section.label }} workflows ({{ section.workflows.length }})
          </button>
        </section>
      </div>

      <section
        v-else
        class="app-catalog-section"
      >
        <header class="app-catalog-section__head">
          <h2 class="app-catalog-section__title">{{ filteredSectionTitle }}</h2>
          <p class="app-catalog-section__hint">Use tag filters above to change or clear.</p>
        </header>
        <div class="app-catalog-grid app-catalog-grid--browse app-catalog-grid--browse-filtered lab-workflow-catalog-grid">
          <LabWorkflowListCard
            v-for="workflow in filteredWorkflows"
            :key="workflow.id"
            :workflow="workflow"
            :trigger-event-type="triggerEventTypeForWorkflow(workflow)"
            :catalog-entries="catalogEntries"
            :admin-mode="adminMode"
            :owner-label="ownerLabelForWorkflow(workflow)"
            @edit="openEdit(workflow)"
            @delete="removeworkflow(workflow)"
            @filter-tag="onCardTagFilter"
          />
        </div>
      </section>
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
        <div class="lab-workflows-editor-header__inner">
          <div class="lab-workflows-editor-header__top">
            <div class="lab-workflows-editor-heading">
              <h3 class="m-0 text-base font-semibold text-lab-general-text">
                {{ dialogMode === 'create' ? 'Create workflow' : 'Edit workflow' }}
              </h3>
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
              <Button
                :id="generateUniqueId('lab-workflows-cancel-top')"
                label="Cancel"
                text
                size="small"
                @click="dialogVisible = false"
              />
              <Button
                :id="generateUniqueId('lab-workflows-save-top')"
                label="Save"
                size="small"
                :disabled="workflowGraphSaveBlocked !== null"
                :title="workflowGraphSaveBlocked ?? undefined"
                @click="saveDialog"
              />
            </div>
          </div>
          <button
            :id="workflowDetailsToggleId"
            type="button"
            class="lab-workflows-details-toggle"
            :aria-expanded="workflowDetailsOpen"
            :aria-controls="workflowDetailsPanelId"
            @click="workflowDetailsOpen = !workflowDetailsOpen"
          >
            <i
              class="pi pi-chevron-down lab-workflows-details-toggle__icon"
              :class="{ 'lab-workflows-details-toggle__icon--open': workflowDetailsOpen }"
              aria-hidden="true"
            />
            <span>Details</span>
            <span
              v-if="form.name.trim()"
              class="lab-workflows-details-toggle__hint truncate"
              :title="form.name"
            >
              — {{ form.name }}
            </span>
          </button>
        </div>
        <div
          v-show="workflowDetailsOpen"
          :id="workflowDetailsPanelId"
          class="lab-workflows-details-panel"
          role="region"
          aria-label="Workflow details"
        >
          <div class="lab-workflows-dialog-meta">
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
            <div class="lab-workflows-dialog-meta-primary">
              <div class="lab-workflows-dialog-meta-field lab-workflows-dialog-meta-field--name">
                <label class="lab-workflows-dialog-meta-label" :for="nameFieldId">Name</label>
                <InputText
                  v-model="form.name"
                  placeholder="e.g. Notify on new task"
                  class="lab-workflows-details-name"
                  :pt="withFormControlRootId(formInputTextPt, nameFieldId)"
                />
              </div>
              <div class="lab-workflows-dialog-meta-field lab-workflows-dialog-meta-field--grow">
                <label class="lab-workflows-dialog-meta-label" :for="descFieldId">Description</label>
                <Textarea
                  v-model="form.description"
                  placeholder="Optional summary for admins"
                  :rows="3"
                  auto-resize
                  class="w-full"
                  :pt="withFormControlRootId(formTextareaPt, descFieldId)"
                />
              </div>
              <div class="lab-workflows-dialog-meta-field lab-workflows-dialog-meta-field--tags">
                <label class="lab-workflows-dialog-meta-label" :for="tagsFieldId">Tags</label>
                <Chips
                  v-model="form.tags"
                  class="lab-workflows-meta-tags lab-workflows-details-meta-tags"
                  placeholder="Add tags"
                  separator=","
                  :pt="withFormControlRootId(formWorkflowMetaTagsPt, tagsFieldId)"
                  :input-id="tagsFieldId"
                />
              </div>
              <div class="lab-workflows-dialog-meta-inline">
                <div class="lab-workflows-dialog-meta-field lab-workflows-dialog-meta-field--priority">
                  <label class="lab-workflows-dialog-meta-label" :for="priorityFieldId">Priority</label>
                  <InputNumber
                    v-model="form.priority"
                    class="lab-workflows-meta-priority"
                    :pt="withFormControlRootId(formWorkflowMetaPriorityPt, priorityFieldId)"
                  />
                </div>
                <div class="lab-workflows-dialog-meta-field lab-workflows-dialog-meta-field--status">
                  <span class="lab-workflows-dialog-meta-label" :id="enabledStatusLabelId">Status</span>
                  <div class="lab-workflows-dialog-meta-status">
                    <Checkbox
                      v-model="form.enabled"
                      binary
                      :input-id="enabledCheckboxId"
                      :pt="withFormControlRootId(formCheckboxPt, enabledCheckboxControlId)"
                      :aria-labelledby="enabledStatusLabelId"
                    />
                    <label class="whitespace-nowrap text-lab-general-text" :for="enabledCheckboxId">Enabled</label>
                  </div>
                </div>
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
