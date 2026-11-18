<template>
  <!-- Dialogs must be siblings of Card: PrimeVue Card has no default slot, so Dialogs were never mounted. -->
  <div class="w-full h-full">
  <Card ref="cardRef" class="w-full h-full">
    <template #title>Data Connector Management</template>
    
    <template #content>
      <!-- Toolbar -->
      <div class="flex flex-wrap gap-2 items-center mb-4 border-b pb-2">
          <Button 
            label="Create New Connector" 
            icon="pi pi-plus" 
            severity="success"
            @click="openCreateDialog"
            :pt="{ root: { id: generateUniqueId('create-connector-btn') } }"
          />
      </div>

      <!-- Connector list (card layout, aligned with Forms / landing connectors) -->
      <div v-if="localConnectors.length > 0" class="p-2 mb-4">
        <Accordion
          v-model:value="openAppGroups"
          multiple
          class="connector-app-accordion w-full"
          :pt="{ root: { attrs: { id: generateUniqueId('mgmt-connector-app-accordion') } } }"
        >
          <AccordionPanel
            v-for="group in connectorsByApp"
            :key="group.appName"
            :value="group.appName"
            class="connector-app-group"
            :pt="{ root: { attrs: { id: generateUniqueId(`mgmt-connector-app-panel-${group.appName}`) } } }"
          >
            <AccordionHeader
              :pt="{ root: { attrs: { id: generateUniqueId(`mgmt-connector-app-heading-${group.appName}`) } } }"
            >
              <span class="text-sm font-semibold font-mono text-lab-accent">
                {{ group.appName }}
                <span class="text-lab-general-text-muted font-normal text-xs ml-1">({{ group.connectors.length }})</span>
              </span>
            </AccordionHeader>
            <AccordionContent
              :pt="{ root: { attrs: { id: generateUniqueId(`mgmt-connector-app-content-${group.appName}`) } } }"
            >
              <div class="space-y-3 pt-1">
        <div
          v-for="connector in group.connectors"
          :key="connector.id"
          class="rounded-lg border border-lab-general-border bg-lab-general-bg-muted/50 p-3 transition-[border-color,box-shadow] text-lab-general-text hover:border-lab-general-border hover:shadow-sm"
          :class="{
            'border-lab-general-border shadow-sm ring-1 ring-lab-accent/40': expandedConnectorId === connector.id,
          }"
          :id="generateUniqueId(`connector-panel-${connector.id}`)"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex-1 cursor-pointer min-w-0"
              :id="generateUniqueId(`connector-header-${connector.id}`)"
              @click="toggleConnectorCard(connector)"
            >
              <h4
                :id="generateUniqueId(`connector-card-title-${connector.id}`)"
                class="font-semibold text-lab-general-text text-sm m-0 mb-0.5 truncate"
              >
                {{ connector.entityName }}
              </h4>
              <p class="text-xs text-lab-general-text-muted mb-2 m-0 leading-snug">
                {{ getCapabilitiesString(connector.capabilities) }}
              </p>
              <div class="text-[10px] text-lab-general-text-muted">
                {{ connector.createdAt ? formatListDate(connector.createdAt) : '' }}
              </div>
            </div>

            <div class="flex flex-col items-end gap-2 shrink-0">
              <span
                class="px-2.5 py-1 rounded text-xs font-semibold border"
                :class="
                  getBooleanFromNumber(connector.is_active)
                    ? 'border-green-500/60 text-green-300 bg-green-950/50'
                    : 'border-red-500/60 text-red-300 bg-red-950/40'
                "
              >
                {{ getBooleanFromNumber(connector.is_active) ? 'Active' : 'Inactive' }}
              </span>
              <Button
                type="button"
                text
                size="small"
                severity="secondary"
                :icon="expandedConnectorId === connector.id ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                :aria-expanded="expandedConnectorId === connector.id"
                :aria-label="expandedConnectorId === connector.id ? 'Collapse details' : 'Expand details'"
                @click.stop="toggleConnectorCard(connector)"
                :pt="{ root: { id: generateUniqueId(`connector-expand-btn-${connector.id}`) } }"
              />
            </div>
          </div>

          <div
            v-if="expandedConnectorId === connector.id"
            :id="generateUniqueId(`connector-content-${connector.id}`)"
            class="mt-3 pt-3 border-t border-lab-general-border text-lab-general-text"
          >
            <dl class="space-y-2.5 text-sm m-0">
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <dt class="text-lab-general-text-muted font-medium m-0 shrink-0">Entity:</dt>
                <dd class="text-lab-general-text m-0">{{ connector.entityName }}</dd>
              </div>
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <dt class="text-lab-general-text-muted font-medium m-0 shrink-0">Discovery:</dt>
                <dd class="text-lab-general-text font-mono text-xs m-0 break-all" :title="connector.discoveryUrl">
                  {{ connector.discoveryUrl }}
                </dd>
              </div>
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <dt class="text-lab-general-text-muted font-medium m-0 shrink-0">Capabilities:</dt>
                <dd class="text-lab-general-text m-0">{{ getCapabilitiesString(connector.capabilities) }}</dd>
              </div>
              <div
                v-if="connector.endpoints?.lookups?.length"
                class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
              >
                <dt class="text-lab-general-text-muted font-medium m-0 shrink-0">Lookups:</dt>
                <dd class="text-lab-general-text m-0">{{ connector.endpoints.lookups.length }}</dd>
              </div>
              <div v-if="connector.last_verified_at" class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <dt class="text-lab-general-text-muted font-medium m-0 shrink-0">Verified:</dt>
                <dd class="text-lab-general-text m-0">{{ formatDateTime(connector.last_verified_at) }}</dd>
              </div>
              <div class="flex flex-wrap items-baseline gap-x-2">
                <dt class="text-lab-general-text-muted font-medium m-0 shrink-0">Discovery type:</dt>
                <dd class="text-lab-general-text font-medium m-0">{{ connector.discoveryType || 'REST' }}</dd>
              </div>
            </dl>

            <div v-if="connector.endpoints?.lookups?.length" class="mt-4 pt-4 border-t border-lab-general-border">
              <p class="text-lab-general-text-muted font-medium text-sm m-0 mb-2">Lookup endpoints</p>
              <ul
                class="list-none m-0 p-0 space-y-2 text-xs"
                :id="generateUniqueId(`connector-lookups-${connector.id}`)"
              >
                <li
                  v-for="lookup in connector.endpoints.lookups"
                  :key="lookup.forProperty"
                  class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lab-general-text pl-0"
                >
                  <span class="text-sky-400 font-medium">{{ lookup.forProperty }}</span>
                  <span class="text-lab-general-text-muted">→</span>
                  <span class="font-mono text-lab-general-text-muted break-all">{{ lookup.endpoint?.url || 'N/A' }}</span>
                </li>
              </ul>
            </div>

            <div class="flex flex-wrap gap-2 mt-5 pt-4 border-t border-lab-general-border">
              <Button
                size="small"
                label="Verify"
                icon="pi pi-check-circle"
                severity="info"
                @click="verifyConnectorRecord(connector)"
                :pt="{ root: { id: generateUniqueId(`verify-btn-${connector.id}`) } }"
              />
              <Button
                size="small"
                label="Edit"
                icon="pi pi-pencil"
                severity="secondary"
                @click="editConnector(connector)"
                :pt="
                  labRecordActionButtonPt(
                    generateUniqueId,
                    'connector',
                    'edit',
                    connector.id,
                    connector.entityName,
                  )
                "
              />
              <Button
                size="small"
                label="Delete"
                icon="pi pi-trash"
                severity="danger"
                @click="confirmDeleteConnector(connector)"
                :pt="
                  labRecordActionButtonPt(
                    generateUniqueId,
                    'connector',
                    'delete',
                    connector.id,
                    connector.entityName,
                  )
                "
              />
            </div>
          </div>
        </div>
              </div>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </div>

      <div
        v-else
        class="flex gap-2 items-center justify-center h-40 text-lab-general-text-muted mb-4"
      >
        <i class="pi pi-database text-5xl"></i>
        <span>No data connectors available</span>
      </div>

    </template>
  </Card>

    <!-- Create Connector Dialog -->
    <Dialog 
      v-model:visible="showCreateDialog" 
      modal 
      header="Create New Data Connector"
      :style="{ width: '40rem' }"
      :pt="{ root: { id: generateUniqueId('create-connector-dialog') } }"
    >
      <div class="flex flex-col gap-3">
        <p class="text-sm text-lab-general-text-muted">
          Enter the discovery URL, click <strong>Verify URL</strong>, then create once application and entity names appear below.
        </p>

        <div>
          <label :id="generateUniqueId('discovery-url-label')" for="discovery-url-input">Discovery URL *</label>
          <InputText 
            v-model="newConnector.discoveryUrl" 
            placeholder="e.g., http://localhost:3020/api/discovery"
            class="mt-1 w-full"
            :pt="{ root: { id: generateUniqueId('discovery-url-input') } }"
          />
        </div>
        
        <div>
          <label :id="generateUniqueId('discovery-type-label')" for="discovery-type-select">Discovery Type</label>
          <SelectButton 
            v-model="newConnector.discoveryType"
            :options="discoveryTypeOptions"
            option-label="label"
            option-value="value"
            class="mt-1 w-full"
            :pt="{ root: { id: generateUniqueId('discovery-type-select') } }"
          />
        </div>
        
        <div class="flex items-center gap-2">
          <Checkbox
            :model-value="getBooleanFromNumber(newConnector.is_active)"
            binary
            @update:model-value="(v: boolean) => { newConnector.is_active = v ? 1 : 0 }"
            :pt="{ root: { id: generateUniqueId('is-active-check') } }"
          />
          <label :id="generateUniqueId('is-active-label')" :for="generateUniqueId('is-active-check')">Active</label>
        </div>

        <div
          v-if="createPreview"
          class="rounded-lg border border-green-600/60 bg-green-950/30 p-3 text-sm"
          role="status"
          :id="generateUniqueId('create-discovery-verified')"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/20"
              aria-hidden="true"
            >
              <i class="pi pi-check-circle text-xl text-green-400"></i>
            </span>
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <p class="font-medium text-green-300">Discovery URL verified</p>
              <dl class="flex flex-col gap-1 text-lab-general-text">
                <div class="flex flex-wrap gap-x-2">
                  <dt class="text-lab-general-text-muted">Application:</dt>
                  <dd class="font-medium m-0">{{ createPreview.appName }}</dd>
                </div>
                <div class="flex flex-wrap gap-x-2">
                  <dt class="text-lab-general-text-muted">Entity:</dt>
                  <dd class="font-medium m-0">{{ createPreview.entityName }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          severity="secondary" 
          @click="showCreateDialog = false"
          :pt="{ root: { id: generateUniqueId('cancel-create-btn') } }"
        />
        <Button 
          label="Verify URL" 
          icon="pi pi-search" 
          severity="secondary"
          :loading="createPreviewLoading"
          @click="verifyNewConnectorUrl"
          :disabled="!isValidNewConnector()"
          :pt="{ root: { id: generateUniqueId('verify-create-btn') } }"
        />
        <Button 
          label="Create" 
          icon="pi pi-check" 
          @click="createConnector"
          :disabled="!canCreateConnector()"
          :pt="{ root: { id: generateUniqueId('create-btn') } }"
        />
      </template>
    </Dialog>

    <!-- Edit Connector Dialog -->
    <Dialog 
      v-model:visible="showEditDialog" 
      modal 
      header="Edit Data Connector"
      :style="{ width: '40rem' }"
      :pt="{ root: { id: generateUniqueId('edit-connector-dialog') } }"
    >
      <div class="flex flex-col gap-3">
        <div>
          <label :id="generateUniqueId('edit-discovery-url-label')" for="edit-discovery-url-input">Discovery URL *</label>
          <InputText 
            v-model="editForm.discoveryUrl" 
            class="mt-1 w-full"
            :pt="{ root: { id: generateUniqueId('edit-discovery-url-input') } }"
          />
        </div>
        
        <div>
          <label :id="generateUniqueId('edit-discovery-type-label')" for="edit-discovery-type-select">Discovery Type</label>
          <SelectButton 
            v-model="editForm.discoveryType"
            :options="discoveryTypeOptions"
            option-label="label"
            option-value="value"
            class="mt-1 w-full"
            :pt="{ root: { id: generateUniqueId('edit-discovery-type-select') } }"
          />
        </div>
        
        <div class="flex items-center gap-2">
          <Checkbox
            :model-value="getBooleanFromNumber(editForm.is_active)"
            binary
            @update:model-value="(v: boolean) => { editForm.is_active = v ? 1 : 0 }"
            :pt="{ root: { id: generateUniqueId('edit-is-active-check') } }"
          />
          <label :id="generateUniqueId('edit-is-active-label')" :for="generateUniqueId('edit-is-active-check')">Active</label>
        </div>

        <div
          v-if="editContractDisplay"
          class="rounded-lg border border-green-600/60 bg-green-950/30 p-3 text-sm"
          role="status"
          :id="generateUniqueId('edit-discovery-verified')"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/20"
              aria-hidden="true"
            >
              <i class="pi pi-check-circle text-xl text-green-400"></i>
            </span>
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <p class="font-medium text-green-300">Discovery URL verified</p>
              <dl class="flex flex-col gap-1 text-lab-general-text">
                <div class="flex flex-wrap gap-x-2">
                  <dt class="text-lab-general-text-muted">Application:</dt>
                  <dd class="font-medium m-0">{{ editContractDisplay.appName }}</dd>
                </div>
                <div class="flex flex-wrap gap-x-2">
                  <dt class="text-lab-general-text-muted">Entity:</dt>
                  <dd class="font-medium m-0">{{ editContractDisplay.entityName }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        <p v-else-if="editDiscoveryUrlChanged" class="text-sm text-lab-general-text-muted">
          Discovery URL changed — click <strong>Verify URL</strong> to load application and entity names.
        </p>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          severity="secondary" 
          @click="showEditDialog = false"
          :pt="{ root: { id: generateUniqueId('cancel-edit-btn') } }"
        />
        <Button
          label="Re-verify URL"
          icon="pi pi-check-circle"
          severity="secondary"
          :loading="editPreviewLoading"
          :disabled="!(editForm.discoveryUrl || '').trim() || !activeConnectorId"
          @click="handleEditDialogVerify"
          :pt="{ root: { id: generateUniqueId('verify-edit-btn') } }"
        />
        <Button 
          label="Save" 
          icon="pi pi-check" 
          @click="updateConnector"
          :disabled="!canSaveEditConnector()"
          :pt="{ root: { id: generateUniqueId('save-edit-btn') } }"
        />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog 
      v-model:visible="showDeleteDialog" 
      modal 
      header="Confirm Deletion"
      :style="{ width: '25rem' }"
      :pt="{ root: { id: generateUniqueId('delete-confirmation-dialog') } }"
    >
      <div class="text-center">
        <i class="pi pi-exclamation-triangle text-4xl text-yellow-500 mb-2"></i>
        <p class="mb-4">Are you sure you want to delete this connector? This action cannot be undone.</p>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          severity="secondary" 
          @click="showDeleteDialog = false"
          :pt="{ root: { id: generateUniqueId('cancel-delete-btn') } }"
        />
        <Button 
          label="Delete" 
          icon="pi pi-trash" 
          severity="danger" 
          @click="deleteConnector"
          :disabled="!connectorToDeleteId"
          :pt="{ root: { id: generateUniqueId('confirm-delete-btn') } }"
        />
      </template>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types';
import { useConnectors } from '@/apps/lab-formsbuilder/front-end/composables/useConnectors';
import { formatConnectorDisplayName } from '@/apps/lab-formsbuilder/front-end/utils/connector-display';
import { groupConnectorsByApp } from '@/apps/lab-formsbuilder/front-end/utils/group-connectors-by-app';

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

function notifySuccess(summary: string, detail: string): void {
  toast.add({ severity: 'success', summary, detail, life: 3000 });
}

function notifyError(summary: string, detail: string): void {
  toast.add({ severity: 'error', summary, detail, life: 4000 });
}

const discoveryTypeOptions = [
  { label: 'REST', value: 'REST' },
  { label: 'SOAP', value: 'SOAP' },
];

// Props
interface Props {
  serverUrl: string;
  connectors: DataConnector[];
  selectedConnectorId?: number | null;
  /** When set, opens the edit dialog for this connector (e.g. from landing list). */
  openEditConnectorId?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  connectors: () => [],
  selectedConnectorId: undefined,
  openEditConnectorId: null,
});

const {
  createConnector: createConnectorApi,
  updateConnector: updateConnectorApi,
  deleteConnector: deleteConnectorApi,
  verifyConnector: verifyConnectorApi,
  previewDiscovery: previewDiscoveryApi,
  loadConnectors: reloadConnectors,
} = useConnectors(props.serverUrl);

// Emits - emit the full connector object when CRUD operations complete
const emit = defineEmits<{
  (e: 'connector-select', connector: DataConnector | null): void;
  (e: 'connector-deleted', id: number | null): void;
  (e: 'open-edit-handled'): void;
}>();

// State
const cardRef = ref(null);
const localConnectors = ref<DataConnector[]>([]);
const activeConnectorId = ref<number | null>(null);
/** Expanded management card (details + actions). */
const expandedConnectorId = ref<number | null>(null);
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const connectorToDeleteId = ref<number | null>(null);

// New connector form state (matching DataConnector type)
interface NewConnector {
  discoveryUrl: string;
  discoveryType?: string;
  is_active?: number;
}
const newConnector = ref<NewConnector>({
  discoveryUrl: '',
  discoveryType: 'REST',
  is_active: 1,
});

const createPreview = ref<{ appName: string; entityName: string } | null>(null);
const createPreviewUrl = ref<string | null>(null);
const createPreviewLoading = ref(false);

// Edit form state for editing (matching DataConnector type)
interface EditForm {
  appName: string;
  entityName: string;
  discoveryUrl: string;
  discoveryType?: string; // Matches DataConnector.discoveryType which is string
  is_active?: number; // Matches DataConnector.is_active which is number
}
const editForm = ref<EditForm>({
  appName: '',
  entityName: '',
  discoveryUrl: '',
  discoveryType: 'REST',
  is_active: 1,
});

const editBaselineDiscoveryUrl = ref('');
const editSavedContract = ref<{ appName: string; entityName: string } | null>(null);
const editPreview = ref<{ appName: string; entityName: string } | null>(null);
const editPreviewUrl = ref<string | null>(null);
const editPreviewLoading = ref(false);

const editDiscoveryUrlChanged = computed(() => {
  const current = (editForm.value.discoveryUrl || '').trim();
  return current.length > 0 && current !== editBaselineDiscoveryUrl.value;
});

const editContractDisplay = computed(() => {
  if (editDiscoveryUrlChanged.value) {
    const url = (editForm.value.discoveryUrl || '').trim();
    if (editPreview.value && editPreviewUrl.value === url) {
      return editPreview.value;
    }
    return null;
  }
  if (editSavedContract.value?.appName && editSavedContract.value?.entityName) {
    return editSavedContract.value;
  }
  return null;
});

// Computed property for selected connector
const selectedConnectorComputed = computed(() => {
  return props.connectors.find(c => c.id === activeConnectorId.value) || null;
});

const connectorsByApp = computed(() => groupConnectorsByApp(localConnectors.value));

/** App group accordion — empty = all panels collapsed by default. */
const openAppGroups = ref<string[]>([]);

// Watch for external connector list changes
watch(() => props.connectors, (newConnectors) => {
  localConnectors.value = newConnectors || [];
}, { immediate: true });

// Watch for selected connector ID changes
watch(() => props.selectedConnectorId, (newId) => {
  if (newId != null) {
    activeConnectorId.value = newId;
    expandedConnectorId.value = newId;
  }
}, { immediate: true });

watch(
  () => props.openEditConnectorId,
  async (id) => {
    if (id == null) {
      return;
    }
    await nextTick();
    const connector = localConnectors.value.find(c => c.id === id);
    if (connector) {
      expandedConnectorId.value = id;
      editConnector(connector);
    }
    emit('open-edit-handled');
  },
);

// Load connectors when prop changes
onMounted(async () => {
  if (props.selectedConnectorId != null) {
    activeConnectorId.value = props.selectedConnectorId;
    expandedConnectorId.value = props.selectedConnectorId;
  }

  const selected = props.connectors.find(c => c.id === props.selectedConnectorId);
  emit('connector-select', selected || null);
});

watch(() => newConnector.value.discoveryUrl, () => {
  createPreview.value = null;
  createPreviewUrl.value = null;
});

watch(() => editForm.value.discoveryUrl, () => {
  editPreview.value = null;
  editPreviewUrl.value = null;
});

function resetCreateForm(): void {
  newConnector.value = { discoveryUrl: '', discoveryType: 'REST', is_active: 1 };
  createPreview.value = null;
  createPreviewUrl.value = null;
  createPreviewLoading.value = false;
}

function openCreateDialog(): void {
  resetCreateForm();
  showCreateDialog.value = true;
}

async function verifyNewConnectorUrl(): Promise<void> {
  const url = (newConnector.value.discoveryUrl || '').trim();
  if (!url) {
    return;
  }
  createPreviewLoading.value = true;
  createPreview.value = null;
  createPreviewUrl.value = null;
  try {
    const preview = await previewDiscoveryApi(url);
    createPreview.value = preview;
    createPreviewUrl.value = url;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    notifyError('Verification failed', message);
  } finally {
    createPreviewLoading.value = false;
  }
}

function canCreateConnector(): boolean {
  if (!createPreview.value || !createPreviewUrl.value) {
    return false;
  }
  return createPreviewUrl.value === (newConnector.value.discoveryUrl || '').trim();
}

async function verifyEditConnectorUrl(): Promise<void> {
  const url = (editForm.value.discoveryUrl || '').trim();
  if (!url) {
    return;
  }
  editPreviewLoading.value = true;
  editPreview.value = null;
  editPreviewUrl.value = null;
  try {
    const preview = await previewDiscoveryApi(url);
    editPreview.value = preview;
    editPreviewUrl.value = url;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    notifyError('Verification failed', message);
  } finally {
    editPreviewLoading.value = false;
  }
}

function canSaveEditConnector(): boolean {
  if (!activeConnectorId.value) {
    return false;
  }
  if (!editDiscoveryUrlChanged.value) {
    return true;
  }
  const url = (editForm.value.discoveryUrl || '').trim();
  return !!editPreview.value && editPreviewUrl.value === url;
}

// Select a connector from the list
function selectConnector(connector: DataConnector): void {
  activeConnectorId.value = connector.id || null;
  emit('connector-select', connector);
}

function toggleConnectorCard(connector: DataConnector): void {
  if (connector.id == null) {
    return;
  }
  if (expandedConnectorId.value === connector.id) {
    expandedConnectorId.value = null;
    return;
  }
  expandedConnectorId.value = connector.id;
  selectConnector(connector);
}

function formatListDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Create new connector - verify discovery URL first, then create
async function createConnector(): Promise<void> {
  if (!newConnector.value.discoveryUrl) {
    notifyError('Create connector', 'Please enter a discovery URL');
    return;
  }

  try {
    const created = await createConnectorApi({
      discoveryUrl: newConnector.value.discoveryUrl,
      discoveryType: newConnector.value.discoveryType,
      is_active: newConnector.value.is_active,
    });
    emit('connector-select', created);
    await reloadConnectors();
    showCreateDialog.value = false;
    resetCreateForm();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    notifyError('Create connector failed', message);
  }
}

// Edit existing connector
function editConnector(connector: DataConnector): void {
  activeConnectorId.value = connector.id ?? null;
  editBaselineDiscoveryUrl.value = (connector.discoveryUrl || '').trim();
  editSavedContract.value = {
    appName: connector.appName,
    entityName: connector.entityName,
  };
  editPreview.value = null;
  editPreviewUrl.value = null;
  editPreviewLoading.value = false;
  editForm.value = {
    appName: connector.appName,
    entityName: connector.entityName,
    discoveryUrl: connector.discoveryUrl,
    discoveryType: connector.discoveryType || 'REST',
    is_active: connector.is_active || 1
  };
  showEditDialog.value = true;
}

// Update existing connector
async function updateConnector(): Promise<void> {
  if (!activeConnectorId.value) return;

  try {
    const updated = await updateConnectorApi(activeConnectorId.value, {
      discoveryUrl: editForm.value.discoveryUrl,
      discoveryType: editForm.value.discoveryType,
      is_active: editForm.value.is_active,
    });
    if (editDiscoveryUrlChanged.value) {
      await verifyConnectorApi(String(activeConnectorId.value));
    }
    emit('connector-select', updated);
    await reloadConnectors();
    showEditDialog.value = false;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    notifyError('Update connector failed', message);
  }
}

// Delete connector
async function deleteConnector(): Promise<void> {
  if (!connectorToDeleteId.value) return;

  const deletedId = connectorToDeleteId.value;

  try {
    await deleteConnectorApi(deletedId);
    showDeleteDialog.value = false;
    connectorToDeleteId.value = null;
    emit('connector-deleted', deletedId);
    await reloadConnectors();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    notifyError('Delete connector failed', message);
  }
}

// Verify discovery URL for a specific connector (card or explicit selection)
async function verifyConnectorRecord(connector: DataConnector): Promise<void> {
  const id = connector.id;
  if (!id) {
    return;
  }
  activeConnectorId.value = id;
  emit('connector-select', connector);

  try {
    await verifyConnectorApi(String(id));
    await reloadConnectors();
    await nextTick();
    const refreshed =
      props.connectors.find(c => c.id === id) ??
      localConnectors.value.find(c => c.id === id) ??
      connector;
    syncEditFormAfterVerify(refreshed);
    notifySuccess(
      'Connector verified',
      `"${formatConnectorDisplayName(connector)}" — contract, capabilities, and lookups were refreshed.`,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    notifyError('Verification failed', `"${formatConnectorDisplayName(connector)}": ${message}`);
  }
}

function syncEditFormAfterVerify(connector: DataConnector): void {
  if (!showEditDialog.value || activeConnectorId.value !== connector.id) {
    return;
  }
  editBaselineDiscoveryUrl.value = (connector.discoveryUrl || '').trim();
  editSavedContract.value = {
    appName: connector.appName,
    entityName: connector.entityName,
  };
  editPreview.value = null;
  editPreviewUrl.value = null;
  editForm.value = {
    ...editForm.value,
    appName: connector.appName,
    entityName: connector.entityName,
    discoveryUrl: connector.discoveryUrl,
  };
}

async function handleEditDialogVerify(): Promise<void> {
  if (editDiscoveryUrlChanged.value) {
    await verifyEditConnectorUrl();
    return;
  }
  const connector = selectedConnectorComputed.value;
  if (!connector?.id) {
    return;
  }
  await verifyConnectorRecord(connector);
}

// Confirmation dialog for delete
function confirmDeleteConnector(connector: DataConnector): void {
  connectorToDeleteId.value = connector.id || null;
  showDeleteDialog.value = true;
}

// Validation helpers
function getCapabilitiesString(capabilities?: string[]): string {
  if (!capabilities || capabilities.length === 0) return 'None';
  return capabilities.join(', ');
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
}
// Validation helper - check that all required fields are non-empty strings
function isValidNewConnector(): boolean {
  return (newConnector.value.discoveryUrl || '').trim().length > 0;
}

// Helper to convert number to boolean for display
function getBooleanFromNumber(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return value !== 0 && value !== false && value !== null;
}

</script>
