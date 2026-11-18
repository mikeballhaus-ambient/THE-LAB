<!-- Conditional import of PrimeVue components -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import SelectButton from 'primevue/selectbutton';
import type { DataConnector } from '../../shared/types';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formatConnectorDisplayName } from '../utils/connector-display';

// Component props
interface Props {
  connectors?: DataConnector[];
  selectedConnectorId?: number | null;
  onConnectorSelected?: (connectorId: number | null) => void;
}

const props = withDefaults(defineProps<Props>(), {
  connectors: () => [],
  selectedConnectorId: undefined,
  onConnectorSelected: undefined,
});

const emit = defineEmits<(e: 'connector-selected', connectorId: number | null) => void>();

// Generate unique IDs for accessibility
const { generateUniqueId } = useUniqueElementId();

// Dialog state
const dialogVisible = ref(false);

// Local state for selected connector in dialog
const localSelectedConnectorId = ref<number | null>(null);

const connectorSelectOptions = computed(() =>
  props.connectors.map((connector) => ({
    ...connector,
    displayLabel: formatConnectorDisplayName(connector),
  })),
);

// Computed: get currently selected connector
const currentSelectedConnector = computed(() => {
  if (!props.selectedConnectorId) return null;
  return props.connectors.find(c => c.id === props.selectedConnectorId) || null;
});

// Watch for external selection changes and sync local state
watch(
  () => props.selectedConnectorId,
  (newId) => {
    if (newId && !localSelectedConnectorId.value) {
      localSelectedConnectorId.value = newId;
    }
  },
  { immediate: true }
);

// Open dialog to select connector
function openDialog(): void {
  dialogVisible.value = true;
}

// Close dialog
function closeDialog(): void {
  dialogVisible.value = false;
}

// Handle connector selection from dialog
function handleConnectorSelection(connectorId: number | null): void {
  if (!connectorId) return;
  
  const connector = props.connectors.find(c => c.id === connectorId);
  if (connector && props.onConnectorSelected) {
    props.onConnectorSelected(connectorId);
  } else if (connector) {
    emit('connector-selected', connectorId);
  }
  
  closeDialog();
}

// Template
</script>

<template>
  <Card class="shrink-0">
    <template #title>Data Connector</template>
    
    <template #content>
      <div v-if="currentSelectedConnector" class="flex flex-col gap-2">
        <div class="mb-3">
          <label :id="generateUniqueId('connector-name-label')" for="connector-name-display">Connected Connector</label>
          <div :id="generateUniqueId('connector-name-display')" class="text-lg font-semibold text-lab-general-text">
            {{ formatConnectorDisplayName(currentSelectedConnector) }}
          </div>
        </div>

        <div class="mb-3 text-sm text-lab-general-text-muted">
          <strong class="text-lab-general-text">Entity:</strong> {{ currentSelectedConnector.entityName }}
        </div>

        <div class="p-2 rounded border border-green-500/40 bg-green-950/30">
          <span class="text-xs text-green-300">✓ Verified</span>
        </div>
      </div>

      <div v-else-if="connectors.length > 0" class="flex flex-col gap-4">
        <p class="text-lab-general-text-muted mb-3">No connector currently selected. Click the button below to choose one.</p>

        <Button
          label="Select Connector"
          icon="pi pi-plus"
          @click="openDialog"
          :pt="{ root: { id: generateUniqueId('select-connector-btn') } }"
        />

        <!-- Connector Selection Dialog -->
        <Dialog 
          v-model:visible="dialogVisible" 
          modal 
          header="Select Data Connector"
          :style="{ width: '30rem' }"
          :pt="{ root: { id: generateUniqueId('connector-selection-dialog') } }"
        >
          <div class="mb-3">
            <label :id="generateUniqueId('dialog-connector-label')" for="dialog-connector-select">Choose a connector:</label>
            <SelectButton
              v-model="localSelectedConnectorId"
              :options="connectorSelectOptions"
              option-label="displayLabel"
              option-value="id"
              placeholder="Select a connector"
              class="w-full"
              :pt="{ root: { id: generateUniqueId('dialog-connector-select') } }"
            />
          </div>

          <template #footer>
            <Button 
              label="Cancel" 
              severity="secondary" 
              @click="closeDialog"
              :pt="{ root: { id: generateUniqueId('cancel-btn') } }"
            />
            <Button 
              label="Select" 
              icon="pi pi-check" 
              @click="handleConnectorSelection(localSelectedConnectorId)"
              :pt="{ root: { id: generateUniqueId('select-btn') } }"
            />
          </template>
        </Dialog>

        <!-- Connector List for reference -->
        <div class="mt-4 pt-3 border-t border-lab-general-border">
          <label :id="generateUniqueId('available-connectors-label')" for="available-connectors-list" class="text-lab-general-text-muted">Available Connectors:</label>
          <ul
            :id="generateUniqueId('available-connectors-list')"
            class="list-disc list-inside text-sm text-lab-general-text-muted mt-2"
          >
            <li v-for="connector in connectors" :key="connector.id" class="mb-1">
              {{ formatConnectorDisplayName(connector) }}
            </li>
          </ul>
        </div>
      </div>

      <div v-else class="flex items-center justify-center">
        <p class="text-lab-general-text-muted text-center py-4">
          <i class="pi pi-database mr-2"></i>
          No data connectors available yet.
          Use the "Add Data Connector" button above to enable data sources for your forms.
        </p>
      </div>
    </template>
  </Card>
</template>
