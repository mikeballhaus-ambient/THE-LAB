<script setup lang="ts">
import CatalogAppFormSection from './CatalogAppFormSection.vue';
import CatalogReportsPanel from './CatalogReportsPanel.vue';

withDefaults(
  defineProps<{
    hostAppId: string;
    serverUrl?: string;
    idPrefix?: string;
    title?: string;
    lead?: string;
    /** Merged into Chart Builder context; bump keys (e.g. dataRevision) to refetch charts. */
    chartContext?: Record<string, unknown>;
  }>(),
  {
    idPrefix: 'catalog-reports',
    title: 'Reports',
    lead: 'Charts from Chart Builder bindings for this app.',
    chartContext: () => ({}),
  },
);
</script>

<template>
  <CatalogAppFormSection
    :title="title"
    :lead="lead"
    icon="pi pi-chart-bar"
    section-class="catalog-app-reports-section shrink-0"
    :id-prefix="idPrefix"
  >
    <CatalogReportsPanel
      :host-app-id="hostAppId"
      :server-url="serverUrl"
      :context="chartContext"
    />
  </CatalogAppFormSection>
</template>
