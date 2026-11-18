<!-- Forms Builder App with Landing Page and Form Management -->
<script setup lang="ts">
import { ref, computed, markRaw, onMounted, onErrorCaptured } from 'vue';
import ErrorBoundary from './components/common/ErrorBoundary.vue';
import { DnDProvider, DragPreview } from '@vue-dnd-kit/core';
import FormsBuilderLandingView from './views/FormsBuilderLandingView.vue';
import FormsBuilderFormsManagementView from './views/FormsBuilderFormsManagementView.vue';
import FormsBuilderDesignerView from './views/FormsBuilderDesignerView.vue';
import FormsBuilderConnectorsView from './views/FormsBuilderConnectorsView.vue';
import { buildComponentsFromConnector } from './utils/autopopulate-from-connector';
import { stripComponentsForSave } from './utils/component-persistence';
import { mergeValidationRulesFromComponents } from './utils/form-validation-sync';
import { hydrateFormComponentsWithLookups, resolveLookupOptionCounts } from './utils/lookup-options';
import { migrateLegacyComponentGridCols } from './components/form-designer/grid-layout-utils';
import { clampFormGridColumns, DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';
import { normalizeFormActionsConfig } from '@/shared/forms/form-actions-config';
import { getComponentDefinition } from './composables/useFormComponents';
import { useWebSocket, useForms, useConnectors } from './composables';
import { createConnectorsStore } from './stores/connectorsStore';
import { useToast } from 'primevue/usetoast';

// Create a singleton instance of the connectors store
const connectorsStore = createConnectorsStore();
import type { FormSchema, ValidationRules, DataConnector, FormComponent, FormSchemaSaveInput } from '@/apps/lab-formsbuilder/shared/types';
import { SOCKET_EVENTS } from '@/apps/lab-formsbuilder/shared/types/websocket-types';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

// Error boundary state
const errorState = ref<{
  hasError: boolean;
  message: string;
  timestamp: number;
}>({
  hasError: false,
  message: '',
  timestamp: 0,
});

const toast = useToast();

interface Props {
  serverUrl: string;
  formsBuilderUrl?: string;
  /** Registry description from THE-LAB mount (not passed to DnDProvider). */
  appDescription?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

// Initialize composables that wrap stores
const { connect: connectWebSocket, emitEvent, on } = useWebSocket(props.serverUrl)
const { forms, error: formError, loadForms, createForm, deleteForm: removeForm, updateForm, loadFormForEditing } = useForms(props.serverUrl)
const {
  connectors: connectorList,
  loadConnectors,
  deleteConnector: removeConnector,
  error: connectorLoadError,
} = useConnectors(props.serverUrl)

// Error handler for critical failures (after composables so emitEvent is defined)
onErrorCaptured((error, instance, info) => {
  console.error('Error captured in App.vue:', error, 'Info:', info);

  errorState.value = {
    hasError: true,
    message: error?.message || 'An unexpected error occurred',
    timestamp: Date.now(),
  };

  try {
    emitEvent(SOCKET_EVENTS.ERROR, {
      message: error?.message || 'Unknown error',
      component: 'App.vue',
      info,
      timestamp: Date.now(),
    });
  } catch (emitErr) {
    console.warn('Could not emit error over WebSocket:', emitErr);
  }

  return false;
});

// Connect WebSocket store on mount
onMounted(async () => {
  connectWebSocket()
  on(SOCKET_EVENTS.FORM_CREATED, () => { void loadForms() })
  on(SOCKET_EVENTS.FORM_UPDATED, () => { void loadForms() })
  on(SOCKET_EVENTS.FORM_DELETED, () => { void loadForms() })
  await loadForms()
  if (formError.value) {
    toast.add({
      severity: 'warn',
      summary: 'Forms not loaded',
      detail: formError.value.message,
      life: 6000,
    })
  }
  await loadConnectors()
})

// Computed properties for template access
const loadedForms = computed(() => forms.value ?? [])
const loadedConnectors = computed(() => connectorList.value ?? [])

const landingStats = computed(() => {
  const formsList = loadedForms.value
  const connectorsList = loadedConnectors.value
  const linkedForms = formsList.filter((f) => f.dataConnecter?.id != null).length
  const appIds = new Set<string>()
  for (const f of formsList) {
    const app = f.dataConnecter?.appName?.trim()
    if (app) {
      appIds.add(app)
    }
  }
  return {
    formCount: formsList.length,
    connectorCount: connectorsList.length,
    linkedForms,
    appCount: appIds.size,
  }
})

/** Prefer in-memory connector list so Properties panel has endpoints/lookups. */
const linkedConnectorForEditor = computed((): DataConnector | null => {
  const link = currentFormSchema.value.dataConnecter;
  if (!link) {
    return null;
  }
  if (link.id != null) {
    const full = loadedConnectors.value.find(c => c.id === link.id);
    if (full) {
      return full as DataConnector;
    }
  }
  return link as DataConnector;
})

const catalogRefreshing = ref(false);

async function refreshCatalog(): Promise<void> {
  catalogRefreshing.value = true;
  try {
    await Promise.all([loadForms(), loadConnectors()]);
    const messages: string[] = [];
    if (formError.value?.message) {
      messages.push(`Forms: ${formError.value.message}`);
    }
    if (connectorLoadError.value?.message) {
      messages.push(`Connectors: ${connectorLoadError.value.message}`);
    }
    if (messages.length) {
      toast.add({
        severity: 'warn',
        summary: 'Refresh incomplete',
        detail: messages.join(' '),
        life: 6000,
      });
      return;
    }
    toast.add({
      severity: 'success',
      summary: 'Catalog refreshed',
      detail: 'Forms and data connectors reloaded from the server.',
      life: 3500,
    });
  } finally {
    catalogRefreshing.value = false;
  }
}

// Forms management view state (intermediate view between landing and design canvas)
const showFormsManagement = ref(false);

// Form designer view state (shown as full view, not modal)
const showFormDesignerView = ref(false);

// Form CRUD state
const editFormVisible = ref(false);
const deleteConfirmVisible = ref(false);
const currentEditingForm = ref<FormSchema | null>(null);
const formToDelete = ref<FormSchema | null>(null);
const connectorToDelete = ref<DataConnector | null>(null);
const deleteConnectorConfirmVisible = ref(false);
const connectorPendingEditId = ref<number | null>(null);

// Confirmation dialog for datasource question - options: cancel, configure, continue
const confirmDialogVisible = ref(false);
/** True while the create-form dialog flow is active (reset canvas when entering designer). */
const pendingNewFormCreate = ref(false);

// Preview modal state
const showPreviewModal = ref(false);
const previewSchema = ref<FormSchema | null>(null);

// Form state for canvas editing
const selectedComponentForEditor = ref<FormComponent | null>(null);
const designerViewRef = ref<InstanceType<typeof FormsBuilderDesignerView> | null>(null);
const formActionsPreviewEditMode = ref(false);

const currentFormSchema = ref<FormSchema>({
  formKey: '',
  name: '',
  description: '',
  components: [] as FormComponent[],
  validation_rules: {},
} as FormSchema);

function assignFormSchemaToDesigner(schema: FormSchema): void {
  const columns = clampFormGridColumns(schema.columns);
  const components = [...(schema.components ?? [])] as FormComponent[];
  migrateLegacyComponentGridCols(components, columns);
  selectedComponentForEditor.value = null;
  currentFormSchema.value = {
    ...schema,
    columns,
    components,
    validationRules: schema.validationRules ?? {},
    formActions: normalizeFormActionsConfig(schema.formActions),
  };
}

function resetDesignerForNewForm(): void {
  currentEditingForm.value = null;
  connectorsStore.selectConnector(undefined);
  assignFormSchemaToDesigner({
    formKey: generateFormKey(),
    name: '',
    description: '',
    components: [],
    validationRules: {},
    columns: DEFAULT_FORM_GRID_COLUMNS,
    dataConnecter: undefined,
    model: undefined,
    formActions: normalizeFormActionsConfig(undefined),
  } as FormSchema);
}

// Form selection handler - loads form into canvas using store
async function selectForm(form: FormSchema): Promise<void> {
  if (!form.formKey) return;

  assignFormSchemaToDesigner({
    ...form,
    formKey: form.formKey,
    name: form.name,
    description: form.description || '',
    components: form.components as FormComponent[],
    validationRules: (form.validationRules || {}) as ValidationRules,
  });
}

// Generate a unique formKey for new forms
function generateFormKey(): string {
  return `form_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create new form workflow - shows confirmation dialog first
async function createNewForm(): Promise<void> {
  pendingNewFormCreate.value = true;
  confirmDialogVisible.value = true;
}

// Handle confirmation dialog close (Cancel only — does not open designer)
function handleConfirmDialogClose(): void {
  confirmDialogVisible.value = false;
  pendingNewFormCreate.value = false;
}

// Go straight to form designer when user continues without a new connector
function showFormDesigner(): void {
  confirmDialogVisible.value = false;
  if (pendingNewFormCreate.value) {
    resetDesignerForNewForm();
    pendingNewFormCreate.value = false;
  }
  showFormDesignerView.value = true;
  showFormsManagement.value = false;
  currentView.value = 'form-designer';
}


// Edit existing form workflow - use store action
async function editForm(form: FormSchema): Promise<void> {
  if (!form.formKey) return;

  try {
    const loaded = await loadFormForEditing(form.formKey);
    if (!loaded) {
      toast.add({ severity: 'error', summary: 'Load failed', detail: 'Could not load form for editing.', life: 4000 });
      return;
    }
    assignFormSchemaToDesigner({
      ...loaded,
      components: loaded.components ?? [],
      validationRules: loaded.validationRules ?? {},
    });
    currentEditingForm.value = loaded;
    editFormVisible.value = false;
    showFormDesignerView.value = true;
    currentView.value = 'form-designer';
  } catch (error) {
    console.error('Error selecting form for edit:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load form for editing.', life: 4000 });
  }
}

// Delete form workflow - use store action
async function deleteForm(form: FormSchema): Promise<void> {
  if (!form.formKey) return;

  formToDelete.value = form;
  deleteConfirmVisible.value = true;
}

// Confirm deletion using store action
async function confirmDeleteForm(): Promise<void> {
  if (!formToDelete.value?.formKey) return;

  try {
    await removeForm(formToDelete.value.formKey);
    await loadForms();

    // Clear selection if deleted form was selected
    if (currentEditingForm.value?.formKey === formToDelete.value.formKey) {
      currentEditingForm.value = null;
    }

    toast.add({
      severity: 'success',
      summary: 'Form deleted',
      detail: formToDelete.value.name ?? 'Form removed',
      life: 3000,
    });
  } catch (error) {
    console.error('Error deleting form:', error);
    toast.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: error instanceof Error ? error.message : 'Failed to delete form. Please try again.',
      life: 5000,
    });
  } finally {
    deleteConfirmVisible.value = false;
    formToDelete.value = null;
  }
}

// Cancel deletion
function cancelDelete(): void {
  deleteConfirmVisible.value = false;
  formToDelete.value = null;
}

// Canvas event handlers
function addComponentToCanvas(component: FormComponent): void {
  // Add component to current form schema
  if (currentFormSchema.value) {
    currentFormSchema.value.components.push({ ...component } as FormComponent);
  }
}

function removeComponentFromCanvas(fieldKey: string): void {
  if (currentFormSchema.value) {
    currentFormSchema.value.components = currentFormSchema.value.components.filter(
      (c: FormComponent) => c.fieldKey !== fieldKey
    );
    selectedComponentForEditor.value = null
  }
}

function clearDesignCanvas(): void {
  if (!currentFormSchema.value) {
    return;
  }
  currentFormSchema.value.components = [];
  selectedComponentForEditor.value = null;
}

function selectComponentOnCanvas(component: FormComponent): void {
  if (!currentFormSchema.value) {
    return;
  }
  const index = (currentFormSchema.value.components || []).findIndex(
    (c: FormComponent) => c.fieldKey === component.fieldKey,
  );
  if (index === -1) {
    return;
  }
  const resolved = currentFormSchema.value.components[index];
  if (selectedComponentForEditor.value?.fieldKey === resolved.fieldKey) {
    selectedComponentForEditor.value = null;
    return;
  }
  selectedComponentForEditor.value = resolved;
}

function openSpanConfigForSelectedComponent(): void {
  if (!selectedComponentForEditor.value) {
    return;
  }
  designerViewRef.value?.designCanvasRef?.openSpanConfigForComponent(selectedComponentForEditor.value);
}

function openLayoutConfigForSelectedComponent(): void {
  if (!selectedComponentForEditor.value) {
    return;
  }
  designerViewRef.value?.designCanvasRef?.openLayoutConfigForComponent(selectedComponentForEditor.value);
}

// Load connectors from API (for the "Add Data Connector" button)
async function loadConnectorsFromApi(): Promise<void> {
  confirmDialogVisible.value = false;
  if (pendingNewFormCreate.value) {
    resetDesignerForNewForm();
  }
  currentView.value = 'connectors';
  await loadConnectors();
}

// Form submission display handlers
function handleFormSubmission(submission: unknown): void {
  console.log('Form submission received:', submission);
}

function handleFormSubmissionError(error: Error): void {
  console.error('Form submission error:', error);
}

async function updateComponentProperties(component: FormComponent): Promise<void> {
  const components = currentFormSchema.value.components ?? [];
  let index = selectedComponentForEditor.value
    ? components.findIndex(c => c === selectedComponentForEditor.value)
    : -1;
  if (index === -1 && selectedComponentForEditor.value?.fieldKey) {
    index = components.findIndex(
      c => c.fieldKey === selectedComponentForEditor.value!.fieldKey,
    );
  }
  if (index === -1) {
    index = components.findIndex(c => c.fieldKey === component.fieldKey);
  }
  if (index === -1) {
    toast.add({
      severity: 'warn',
      summary: 'Update failed',
      detail: 'Could not find that control on the canvas. Select it again and retry.',
      life: 4000,
    });
    return;
  }

  const definition = await getComponentDefinition(component.type);
  const updated = {
    ...component,
    value: undefined,
    definition: definition ? markRaw(definition) : component.definition,
  } as FormComponent;
  currentFormSchema.value.components[index] = updated;
  selectedComponentForEditor.value = updated;
  currentFormSchema.value.validationRules = mergeValidationRulesFromComponents(
    currentFormSchema.value.components ?? [],
  );

  const persisted = await persistFormComponentsAfterDesignerEdit();
  if (persisted) {
    toast.add({
      severity: 'success',
      summary: 'Component updated',
      detail: 'Property changes were saved to the form.',
      life: 2500,
    });
    return;
  }

  if (currentFormSchema.value.id) {
    toast.add({
      severity: 'warn',
      summary: 'Component updated',
      detail: 'Changes are on the canvas but could not be saved. Check the form name and try Save Form.',
      life: 4000,
    });
    return;
  }

  toast.add({
    severity: 'success',
    summary: 'Component updated',
    detail: 'Applied on the canvas. Use Save Form to persist this form to the database.',
    life: 4000,
  });
}

async function closePreviewModal() {
  showPreviewModal.value = false;
}

// Form properties editing state
const canEditFormName = ref(true); // Allow editing unless form is being shared

// View state for navigation - ADD 'connectors' option
const currentView = ref<'landing' | 'forms-management' | 'form-designer' | 'connectors'>('landing');

function goToFormsManagement(): void {
  showFormDesignerView.value = false;
  showFormsManagement.value = true;
  currentView.value = 'forms-management';
}

// Go back to forms management from connectors view
function goBackToManageFormsFromConnectors(): void {
  showFormDesignerView.value = false;
  showFormsManagement.value = true;
  currentView.value = 'forms-management';
}

// NEW: Navigate back to landing page from form designer
function goToLanding(): void {
  showFormDesignerView.value = false;
  currentView.value = 'landing';
}

const connectorDialogVisible = ref(false);
const connectorDialogTarget = ref<DataConnector | null>(null);

function openConnectorDialog(connector: DataConnector): void {
  connectorDialogTarget.value = connector;
  connectorDialogVisible.value = true;
}

function handleDesignerConnectorSelect(connectorId: number): void {
  const linkedId = currentFormSchema.value.dataConnecter?.id;
  if (linkedId != null && connectorId === linkedId) {
    return;
  }
  const connector = loadedConnectors.value.find(c => c.id === connectorId);
  if (connector) {
    openConnectorDialog(connector);
  }
}

async function hydrateLookupsOnCanvas(): Promise<void> {
  const connector = currentFormSchema.value.dataConnecter;
  const components = currentFormSchema.value.components ?? [];
  if (!connector?.endpoints?.lookups?.length || components.length === 0) {
    return;
  }

  const { components: hydrated, hydratedCount, errors } = await hydrateFormComponentsWithLookups(
    components,
    connector,
  );
  currentFormSchema.value.components = hydrated;

  if (hydratedCount > 0) {
    toast.add({
      severity: 'success',
      summary: 'Lookup options loaded',
      detail: `Resolved options for ${hydratedCount} field(s) from the connector.`,
      life: 3500,
    });
  }
  if (errors.length > 0) {
    toast.add({
      severity: 'warn',
      summary: 'Some lookups failed',
      detail: errors.slice(0, 3).join('; '),
      life: 5000,
    });
  }
}

function handleConnectorLink(payload: { connector: DataConnector; autopopulate: boolean }): void {
  currentFormSchema.value.dataConnecter = payload.connector;
  currentFormSchema.value.model = payload.connector.entityModel;
  connectorsStore.selectConnector(payload.connector.id);
  void (async () => {
    if (payload.autopopulate) {
      await applyAutopopulateFromConnector({ skipLookupHydrate: true });
    }
    await hydrateLookupsOnCanvas();
    toast.add({
      severity: 'success',
      summary: 'Connector linked',
      detail: `"${payload.connector.appName}" is linked to this form. Save the form to persist.`,
      life: 4000,
    });
  })();
}

function handleConnectorUnlink(): void {
  currentFormSchema.value.dataConnecter = undefined;
  currentFormSchema.value.model = undefined;
  toast.add({
    severity: 'info',
    summary: 'Connector unlinked',
    detail: 'Save the form to persist the change.',
    life: 3000,
  });
}

async function applyAutopopulateFromConnector(options?: { skipLookupHydrate?: boolean }): Promise<void> {
  const connector = currentFormSchema.value.dataConnecter;
  if (!connector) {
    toast.add({
      severity: 'warn',
      summary: 'Autopopulate',
      detail: 'Link a connector first.',
      life: 3000,
    });
    return;
  }
  const existingKeys = (currentFormSchema.value.components ?? []).map(c => c.fieldKey);
  const lookupOptionCounts = await resolveLookupOptionCounts(connector);
  const added = buildComponentsFromConnector(
    connector,
    existingKeys,
    currentFormSchema.value.components ?? [],
    clampFormGridColumns(currentFormSchema.value.columns),
    lookupOptionCounts,
  );
  if (added.length === 0) {
    toast.add({
      severity: 'info',
      summary: 'Autopopulate',
      detail: 'No new fields to add — canvas already has matching fields.',
      life: 3000,
    });
    return;
  }

  const enriched: FormComponent[] = [];
  for (const comp of added) {
    const definition = await getComponentDefinition(comp.type);
    enriched.push({
      ...comp,
      definition,
      hAlign: 'left',
      vAlign: 'top',
      labelLayout: 'vertical',
    });
  }

  if (!currentFormSchema.value.components) {
    currentFormSchema.value.components = [];
  }
  currentFormSchema.value.components.push(...enriched);

  if (!options?.skipLookupHydrate) {
    await hydrateLookupsOnCanvas();
  }

  toast.add({
    severity: 'success',
    summary: 'Autopopulate',
    detail: `Added ${enriched.length} field(s) from the connector model.`,
    life: 3000,
  });
}

function handleRefreshComplete(form: FormSchema): void {
  if (form.model) {
    currentFormSchema.value.model = form.model;
  }
  toast.add({
    severity: 'success',
    summary: 'Model refreshed',
    detail: 'Form model updated from connector discovery.',
    life: 3000,
  });
}

function openLinkedConnectorDialog(): void {
  const linked = currentFormSchema.value.dataConnecter;
  if (linked) {
    openConnectorDialog(linked);
  }
}

async function handleConnectorSelectedFromManagement(connector: DataConnector | null): Promise<void> {
  if (connector) {
    connectorsStore.selectConnector(connector.id);
  } else {
    connectorsStore.selectConnector(undefined);
  }
}

// Handle connector deleted event - reload connectors list
async function handleConnectorDeleted(id: number | null): Promise<void> {
  console.log('Connector deleted:', id);
  // Reload connectors from store after deletion
  await loadConnectors();
}

function editConnectorFromList(connector: DataConnector): void {
  if (connector.id == null) {
    return;
  }
  connectorPendingEditId.value = connector.id;
  currentView.value = 'connectors';
  void loadConnectors();
}

function requestDeleteConnector(connector: DataConnector): void {
  connectorToDelete.value = connector;
  deleteConnectorConfirmVisible.value = true;
}

async function confirmDeleteConnector(): Promise<void> {
  if (connectorToDelete.value?.id == null) {
    return;
  }
  const name = `${connectorToDelete.value.appName} — ${connectorToDelete.value.entityName}`;
  try {
    const ok = await removeConnector(connectorToDelete.value.id);
    if (!ok) {
      toast.add({
        severity: 'error',
        summary: 'Delete failed',
        detail: 'Could not delete this connector. Please try again.',
        life: 4000,
      });
      return;
    }
    await loadConnectors();
    if (currentFormSchema.value.dataConnecter?.id === connectorToDelete.value.id) {
      handleConnectorUnlink();
    }
    toast.add({
      severity: 'success',
      summary: 'Connector deleted',
      detail: `"${name}" was removed.`,
      life: 3000,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: message,
      life: 4000,
    });
  } finally {
    deleteConnectorConfirmVisible.value = false;
    connectorToDelete.value = null;
  }
}

function cancelDeleteConnector(): void {
  deleteConnectorConfirmVisible.value = false;
  connectorToDelete.value = null;
}

function clearConnectorPendingEdit(): void {
  connectorPendingEditId.value = null;
}

// Save form properties (name, description)
function ensureFormKeyForSave(): void {
  if (!currentFormSchema.value.formKey) {
    currentFormSchema.value.formKey = generateFormKey();
  }
}

function buildFormSavePayload(): FormSchemaSaveInput | null {
  if (!currentFormSchema.value.name || currentFormSchema.value.name.trim() === '') {
    return null;
  }
  ensureFormKeyForSave();
  const components = currentFormSchema.value.components ?? [];
  return {
    name: currentFormSchema.value.name,
    description: currentFormSchema.value.description || '',
    components: stripComponentsForSave(components),
    validationRules: mergeValidationRulesFromComponents(components),
    dataConnecter: currentFormSchema.value.dataConnecter ?? null,
    model: currentFormSchema.value.model,
    columns: clampFormGridColumns(currentFormSchema.value.columns),
    formActions: normalizeFormActionsConfig(currentFormSchema.value.formActions),
  };
}

/** Merge API save/create response onto live designer state without replacing the components array (keeps hydrated definitions + DnD state). */
function applyPersistedFormMetadata(saved: FormSchema): void {
  const schema = currentFormSchema.value;
  schema.id = saved.id ?? schema.id;
  schema.formKey = saved.formKey ?? schema.formKey;
  schema.createdAt = saved.createdAt ?? schema.createdAt;
  schema.updatedAt = saved.updatedAt ?? schema.updatedAt;
  if (saved.validationRules) {
    schema.validationRules = saved.validationRules;
  }
  if (saved.columns != null) {
    schema.columns = clampFormGridColumns(saved.columns);
  }
  schema.formActions = normalizeFormActionsConfig(saved.formActions ?? schema.formActions);
}

/** Persist canvas components for a form that already exists in the API (does not reset selection). */
async function persistFormComponentsAfterDesignerEdit(): Promise<boolean> {
  if (!currentFormSchema.value.id || !currentFormSchema.value.formKey) {
    return false;
  }
  const payload = buildFormSavePayload();
  if (!payload) {
    return false;
  }
  try {
    const updated = await updateForm(currentFormSchema.value.formKey, payload);
    currentFormSchema.value.id = updated.id ?? currentFormSchema.value.id;
    currentFormSchema.value.updatedAt = updated.updatedAt ?? currentFormSchema.value.updatedAt;
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error auto-saving form after component update:', error);
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: message,
      life: 4000,
    });
    return false;
  }
}

async function saveForm(): Promise<void> {
  if (!currentFormSchema.value.formKey) {
    currentFormSchema.value.formKey = generateFormKey();
  }

  const payload = buildFormSavePayload();
  if (!payload) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Form name is required. Please provide a name for this form.',
      life: 5000
    });
    return;
  }

  try {
      if (currentFormSchema.value.id) {
      const updated = await updateForm(currentFormSchema.value.formKey, payload);
      applyPersistedFormMetadata(updated);
      toast.add({
        severity: 'success',
        summary: 'Form updated',
        detail: `Form "${currentFormSchema.value.name}" updated successfully!`,
        life: 3000
      });
    } else {
      const created = await createForm({
        ...payload,
        formKey: currentFormSchema.value.formKey,
      });
      applyPersistedFormMetadata(created);
      toast.add({
        severity: 'success',
        summary: 'Form Saved',
        detail: `Form "${currentFormSchema.value.name}" saved successfully!`,
        life: 3000
      });
    }
    await loadForms();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving form:', error);
    toast.add({
      severity: 'error',
      summary: 'Error saving form',
      detail: message,
      life: 3000
    });
  }
}

</script>

<template>
  <DnDProvider>

    <template #preview>
      <DragPreview />
    </template>
    <div
      class="forms-builder-app lab-app-workspace-fill app-loaded-container text-lab-general-text w-full min-w-0 min-h-full h-full flex flex-col overflow-hidden"
      :id="generateUniqueId('forms-builder-app-root')"
    >
      <header
        class="forms-builder-app-header lab-app-header text-lab-general-text flex flex-wrap items-start justify-between gap-3"
        :id="generateUniqueId('forms-builder-app-header')"
      >
        <div>
          <h1 :id="generateUniqueId('forms-builder-title')" class="text-2xl font-semibold m-0">Forms Builder</h1>
          <p class="text-sm text-lab-general-text-muted m-0 mt-1">
            Design forms, link data connectors, and embed them in your apps
          </p>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0 items-center">
          <Button
            label="Refresh"
            icon="pi pi-refresh"
            severity="secondary"
            size="small"
            outlined
            :loading="catalogRefreshing"
            aria-label="Refresh forms and data connectors"
            @click="refreshCatalog"
            :pt="{ root: { attrs: { id: generateUniqueId('forms-builder-refresh-catalog') } } }"
          />
          <template v-if="currentView === 'landing'">
            <Button
              label="Manage Forms"
              icon="pi pi-list"
              severity="success"
              size="small"
              @click="goToFormsManagement"
              :pt="{ root: { attrs: { id: generateUniqueId('manage-forms-btn') } } }"
            />
            <Button
              label="Manage Data Connectors"
              icon="pi pi-database"
              severity="info"
              size="small"
              outlined
              @click="loadConnectorsFromApi"
              :pt="{ root: { attrs: { id: generateUniqueId('add-connector-btn') } } }"
            />
          </template>
        </div>
      </header>

      <main
        class="forms-builder-app-body lab-app-body text-lab-general-text"
        :id="generateUniqueId('forms-builder-app-body')"
      >
        <ErrorBoundary v-if="errorState.hasError" :message="errorState.message" />

        <!-- Landing Page View -->
        <FormsBuilderLandingView
          v-if="currentView === 'landing'"
          :generate-unique-id="generateUniqueId"
          :landing-stats="landingStats"
          :loaded-forms="loadedForms"
          :loaded-connectors="loadedConnectors as DataConnector[]"
          :selected-form-key="currentEditingForm?.formKey"
          @form-select="selectForm"
          @form-create="createNewForm"
          @form-edit="editForm"
          @form-delete="deleteForm"
          @connector-edit="editConnectorFromList"
          @connector-delete="requestDeleteConnector"
        />

        <!-- Forms Management View -->
        <FormsBuilderFormsManagementView
          v-else-if="currentView === 'forms-management'"
          :generate-unique-id="generateUniqueId"
          :server-url="props.serverUrl"
          :loaded-forms="loadedForms"
          :selected-form-key="currentEditingForm?.formKey"
          @back="goToLanding"
          @form-select="selectForm"
          @form-create="createNewForm"
          @form-edit="editForm"
          @form-delete="deleteForm"
          @submission="handleFormSubmission"
          @submission-error="handleFormSubmissionError"
        />

        <!-- Form Designer View -->
        <FormsBuilderDesignerView
          v-else-if="currentView === 'form-designer'"
          ref="designerViewRef"
          :generate-unique-id="generateUniqueId"
          :server-url="props.serverUrl"
          v-model:current-form-schema="currentFormSchema"
          :can-edit-form-name="canEditFormName"
          v-model:form-actions-preview-edit-mode="formActionsPreviewEditMode"
          :loaded-connectors="loadedConnectors as DataConnector[]"
          :selected-component-for-editor="selectedComponentForEditor"
          :linked-connector-for-editor="linkedConnectorForEditor"
          v-model:connector-dialog-visible="connectorDialogVisible"
          :connector-dialog-target="connectorDialogTarget"
          @back="goBackToManageFormsFromConnectors"
          @component-drop="addComponentToCanvas"
          @component-remove="removeComponentFromCanvas"
          @component-select="selectComponentOnCanvas"
          @canvas-clear="clearDesignCanvas"
          @update-component="updateComponentProperties"
          @configure-layout="openLayoutConfigForSelectedComponent"
          @configure-span="openSpanConfigForSelectedComponent"
          @connector-select="handleDesignerConnectorSelect"
          @open-linked-connector="openLinkedConnectorDialog"
          @autopopulate="() => void applyAutopopulateFromConnector()"
          @save-form="saveForm"
          @link="handleConnectorLink"
          @unlink="handleConnectorUnlink"
          @refresh-complete="handleRefreshComplete"
        />

        <!-- Connectors Management View -->
        <FormsBuilderConnectorsView
          v-else-if="currentView === 'connectors'"
          :generate-unique-id="generateUniqueId"
          :server-url="props.serverUrl"
          :loaded-connectors="loadedConnectors as DataConnector[]"
          :open-edit-connector-id="connectorPendingEditId"
          @back="goToLanding"
          @connector-select="handleConnectorSelectedFromManagement"
          @connector-deleted="handleConnectorDeleted"
          @open-edit-handled="clearConnectorPendingEdit"
        />
      </main>

      <!-- Edit Form Dialog -->
      <Dialog v-model:visible="editFormVisible" modal header="Edit Form" :style="{ width: '50vw' }">
        <p>Edit form details here.</p>
        <Button label="Cancel" severity="secondary" @click="editFormVisible = false" />
        <Button label="Save" @click="editFormVisible = false" />
      </Dialog>

      <!-- Delete Confirmation Dialog -->
      <Dialog v-model:visible="deleteConfirmVisible" modal header="Delete Form" :style="{ width: '30vw' }">
        <p>Are you sure you want to delete this form? This action cannot be undone.</p>
        <div class="mt-4 flex justify-end gap-4">
          <Button label="Cancel" severity="secondary" @click="cancelDelete()" />
          <Button label="Delete" severity="danger" @click="confirmDeleteForm()" />
        </div>
      </Dialog>

      <Dialog
        v-model:visible="deleteConnectorConfirmVisible"
        modal
        header="Delete Data Connector"
        :style="{ width: '30vw' }"
      >
        <p class="m-0">
          Are you sure you want to delete
          <strong v-if="connectorToDelete">{{ connectorToDelete.appName }} — {{ connectorToDelete.entityName }}</strong>?
          This action cannot be undone.
        </p>
        <div class="mt-4 flex justify-end gap-4">
          <Button
            label="Cancel"
            severity="secondary"
            @click="cancelDeleteConnector()"
            :pt="{ root: { id: generateUniqueId('cancel-delete-connector-btn') } }"
          />
          <Button
            label="Delete"
            severity="danger"
            @click="confirmDeleteConnector()"
            :pt="{ root: { id: generateUniqueId('confirm-delete-connector-btn') } }"
          />
        </div>
      </Dialog>

      <!-- Confirmation Dialog -->
      <Dialog v-model:visible="confirmDialogVisible" modal header="Create Form" :style="{ width: '40vw' }">
        <p>Would you like to create a new Data Connector for this form?</p>
        <div class="mt-4 flex justify-end gap-4">
          <Button label="Cancel" severity="secondary" @click="handleConfirmDialogClose()" />
          <Button label="Create Data Connector" @click="loadConnectorsFromApi()" />
          <Button label="Continue Without" @click="showFormDesigner()" />
        </div>
      </Dialog>

      <!-- Preview Modal -->
      <Dialog v-model:visible="showPreviewModal" modal header="Form Preview" :style="{ width: '80vw', height: '80vh' }">
        <div v-if="previewSchema" class="p-4">
          <!-- Form preview content would go here -->
          <p>Form preview for: {{ previewSchema.name }}</p>
        </div>
        <Button label="Close" @click="closePreviewModal()" />
      </Dialog>
    </div>
  </DnDProvider>
</template>

