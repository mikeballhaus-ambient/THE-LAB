<script setup lang="ts">
import ConnectorManagement from '../components/ConnectorManagement.vue';
import Button from 'primevue/button';
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types';

defineProps<{
  generateUniqueId: (prefix: string) => string;
  serverUrl: string;
  loadedConnectors: DataConnector[];
  openEditConnectorId: number | null;
}>();

defineEmits<{
  back: [];
  'connector-select': [connector: DataConnector | null];
  'connector-deleted': [id: number | null];
  'open-edit-handled': [];
}>();
</script>

<template>
  <div class="w-full h-full">
    <div class="flex justify-between items-center mb-4 border-b pb-2">
      <h2 :id="generateUniqueId('connectors-management-heading')" class="text-lg font-semibold">Data Connectors</h2>
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        severity="secondary"
        @click="$emit('back')"
        :pt="{ root: { id: generateUniqueId('form-designer-back-btn') } }"
      />
    </div>
    <ConnectorManagement
      :server-url="serverUrl"
      :connectors="loadedConnectors"
      :selected-connector-id="null"
      :open-edit-connector-id="openEditConnectorId"
      @connector-select="$emit('connector-select', $event)"
      @connector-deleted="$emit('connector-deleted', $event)"
      @open-edit-handled="$emit('open-edit-handled')"
    />
  </div>
</template>
