<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { fetchLabDomainEventCatalog } from '@/shared/services/platform-lab-events.client';
import { AppRegistry } from '@/shared/services/AppRegistry';
import { resolveLabEventPublisherDisplayName } from '@/shared/utils/lab-event-publisher-label';
import type { LabDomainEventCatalogResponse } from '@/shared/types/lab-domain-event-catalog';

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const loading = ref(false);
const catalog = ref<LabDomainEventCatalogResponse | null>(null);
const appNameById = ref<Map<string, string>>(new Map());

const rows = computed(() => catalog.value?.entries ?? []);

function publisherLabel(sourceAppId: string): string {
  return resolveLabEventPublisherDisplayName(sourceAppId, appNameById.value);
}

function publisherKindLabel(kind: string): string {
  if (kind === 'catalog-app') {
    return 'App';
  }
  if (kind === 'platform') {
    return 'Platform';
  }
  return kind;
}

async function loadAppNames(): Promise<void> {
  const registry = AppRegistry.getInstance();
  registry.init();
  const apps = await registry.getAll();
  appNameById.value = new Map(apps.map((app) => [app.id, app.name]));
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    await loadAppNames();
    catalog.value = await fetchLabDomainEventCatalog();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Catalog unavailable',
      detail: err instanceof Error ? err.message : 'Could not load event catalog',
      life: 6000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="lab-domain-event-catalog p-4 text-lab-general-text">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-lab-general-text">Domain event catalog</h2>
      <p class="text-sm text-lab-general-text-muted">
        Documented events apps publish on the lab bus, plus any types seen in your environment.
        Use these when building automation rules and workflows.
      </p>
    </div>

    <Message severity="info" class="mb-4 text-sm">
      App authors register events in
      <code class="text-lab-general-text">src/apps/&lt;app-id&gt;/shared/lab-domain-events.manifest.ts</code>
      when adding publishers.
    </Message>

    <DataTable
      :value="rows"
      :loading="loading"
      size="small"
      striped-rows
      class="text-lab-general-text"
      :pt="{ root: { attrs: { id: generateUniqueId('lab-event-catalog-table') } } }"
    >
      <Column header="Publisher">
        <template #body="{ data }">
          {{ publisherLabel(data.sourceAppId) }}
        </template>
      </Column>
      <Column field="label" header="Name" />
      <Column field="publisherKind" header="Kind">
        <template #body="{ data }">
          {{ publisherKindLabel(data.publisherKind) }}
        </template>
      </Column>
      <Column header="Payload fields">
        <template #body="{ data }">
          {{ data.payloadFields.length }}
        </template>
      </Column>
      <Column field="description" header="Description" />
    </DataTable>
  </div>
</template>
