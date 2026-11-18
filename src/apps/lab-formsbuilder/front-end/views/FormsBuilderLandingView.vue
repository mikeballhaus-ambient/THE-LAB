<script setup lang="ts">
import FormList from '../components/FormList.vue';
import ConnectorManager from '../components/ConnectorManager.vue';
import type { FormSchema, DataConnector } from '@/apps/lab-formsbuilder/shared/types';

defineProps<{
  generateUniqueId: (prefix: string) => string;
  landingStats: {
    formCount: number;
    connectorCount: number;
    linkedForms: number;
    appCount: number;
  };
  loadedForms: FormSchema[];
  loadedConnectors: DataConnector[];
  selectedFormKey: string | undefined;
}>();

defineEmits<{
  'form-select': [form: FormSchema];
  'form-create': [];
  'form-edit': [form: FormSchema];
  'form-delete': [form: FormSchema];
  'connector-edit': [connector: DataConnector];
  'connector-delete': [connector: DataConnector];
}>();
</script>

<template>
  <div class="forms-builder-landing lab-app-landing w-full min-w-0">
    <div>
      <h2 :id="generateUniqueId('forms-builder-dashboard-heading')" class="text-lg font-semibold m-0 text-lab-general-text">
        Dashboard
      </h2>
      <p class="text-sm text-lab-general-text-muted m-0 mt-1">
        Build forms to collect data and connect them to your applications.
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="lab-app-kpi" :id="generateUniqueId('forms-builder-kpi-forms')">
        <span class="lab-app-kpi-label">Forms</span>
        <span class="lab-app-kpi-value">{{ landingStats.formCount }}</span>
      </div>
      <div class="lab-app-kpi" :id="generateUniqueId('forms-builder-kpi-connectors')">
        <span class="lab-app-kpi-label">Data connectors</span>
        <span class="lab-app-kpi-value">{{ landingStats.connectorCount }}</span>
      </div>
      <div class="lab-app-kpi" :id="generateUniqueId('forms-builder-kpi-linked')">
        <span class="lab-app-kpi-label">Linked forms</span>
        <span class="lab-app-kpi-value text-emerald-400">{{ landingStats.linkedForms }}</span>
      </div>
      <div class="lab-app-kpi" :id="generateUniqueId('forms-builder-kpi-apps')">
        <span class="lab-app-kpi-label">Apps in use</span>
        <span class="lab-app-kpi-value">{{ landingStats.appCount }}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-w-0">
      <section
        class="lab-app-panel lab-app-panel--flush-cards min-h-[18rem]"
        :id="generateUniqueId('forms-builder-form-list-panel')"
      >
        <FormList
          :forms="loadedForms"
          :selected-form-id="selectedFormKey"
          @form-select="$emit('form-select', $event)"
          @form-create="$emit('form-create')"
          @form-edit="$emit('form-edit', $event)"
          @form-delete="$emit('form-delete', $event)"
        />
      </section>
      <section
        class="lab-app-panel lab-app-panel--flush-cards min-h-[18rem]"
        :id="generateUniqueId('forms-builder-connector-panel')"
      >
        <ConnectorManager
          :show-add-button="true"
          :connectors="loadedConnectors"
          @connector-edit="$emit('connector-edit', $event)"
          @connector-delete="$emit('connector-delete', $event)"
        />
      </section>
    </div>
  </div>
</template>
