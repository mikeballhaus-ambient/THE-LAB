<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { LabIntegrationSurface } from '@/shared/integration';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import ChartListView from './views/ChartListView.vue';
import ChartDesignerView from './views/ChartDesignerView.vue';
import ChartConnectorsView from './views/ChartConnectorsView.vue';
import {
  CHART_BUILDER_INTEGRATION_SLOTS,
  CHART_BUILDER_WORKSPACE_SURFACE,
} from './constants/integration-slots';

interface Props {
  serverUrl?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

type View = 'home' | 'list' | 'designer' | 'connectors';

const view = ref<View>('home');
const editingChartKey = ref<string | null>(null);
const chartListRef = ref<InstanceType<typeof ChartListView> | null>(null);
const connectorsViewRef = ref<InstanceType<typeof ChartConnectorsView> | null>(null);
const integrationSurfaceRef = ref<InstanceType<typeof LabIntegrationSurface> | null>(null);
const catalogRefreshing = ref(false);
const integrationChartKey = ref<string | null>(null);
const integrationConnectorId = ref<number | null>(null);

const resolvedServerUrl = computed(() => props.serverUrl ?? 'http://localhost:3013');

const integrationContext = computed((): Record<string, unknown> => {
  const ctx: Record<string, unknown> = {};
  if (integrationChartKey.value) {
    ctx.chartKey = integrationChartKey.value;
  }
  if (integrationConnectorId.value != null) {
    ctx.connectorId = integrationConnectorId.value;
  }
  return ctx;
});

async function tryOpenIntegrationSlot(
  slot: string,
  context: { chartKey?: string | null; connectorId?: number | null },
): Promise<boolean> {
  await integrationSurfaceRef.value?.refresh();
  if (!integrationSurfaceRef.value?.hasEnabledBinding(slot)) {
    return false;
  }
  integrationChartKey.value = context.chartKey ?? null;
  integrationConnectorId.value = context.connectorId ?? null;
  integrationSurfaceRef.value.openSlot(slot);
  return true;
}

function notifyUnboundSlot(slot: string): void {
  toast.add({
    severity: 'info',
    summary: 'Integration binding required',
    detail: `Wire Forms Builder to slot "${slot}" on app-lab-chartbuilder (chart-builder.workspace or chart-builder.designer).`,
    life: 8000,
  });
}

async function refreshChartCatalog(): Promise<void> {
  catalogRefreshing.value = true;
  try {
    if (view.value !== 'list') {
      view.value = 'list';
      await nextTick();
    }
    await chartListRef.value?.refreshCatalog();
    const listError = chartListRef.value?.getLoadError?.() ?? null;
    if (listError) {
      toast.add({
        severity: 'warn',
        summary: 'Refresh incomplete',
        detail: listError,
        life: 6000,
      });
      return;
    }
    toast.add({
      severity: 'success',
      summary: 'Chart library refreshed',
      detail: 'Charts and connector links reloaded from the server.',
      life: 3500,
    });
  } finally {
    catalogRefreshing.value = false;
  }
}

function openList(): void {
  view.value = 'list';
}

async function openCreate(): Promise<void> {
  editingChartKey.value = null;
  view.value = 'designer';
}

async function openEdit(chartKey: string): Promise<void> {
  editingChartKey.value = chartKey;
  view.value = 'designer';
}

async function onChartRequestDelete(chartKey: string): Promise<void> {
  if (await tryOpenIntegrationSlot(CHART_BUILDER_INTEGRATION_SLOTS.chartDelete, { chartKey })) {
    return;
  }
  notifyUnboundSlot(CHART_BUILDER_INTEGRATION_SLOTS.chartDelete);
}

function openConnectors(): void {
  view.value = 'connectors';
}

async function onConnectorRequestDelete(connectorId: number): Promise<void> {
  if (
    await tryOpenIntegrationSlot(CHART_BUILDER_INTEGRATION_SLOTS.connectorDelete, {
      chartKey: null,
      connectorId,
    })
  ) {
    return;
  }
  await connectorsViewRef.value?.confirmDeleteConnector(connectorId);
}

async function onIntegrationSuccess(payload: { slot: string }): Promise<void> {
  integrationChartKey.value = null;
  integrationConnectorId.value = null;
  const slot = payload.slot;
  if (slot === CHART_BUILDER_INTEGRATION_SLOTS.chartDelete) {
    await chartListRef.value?.refreshCatalog();
    if (view.value === 'designer') {
      view.value = 'list';
      editingChartKey.value = null;
    }
    return;
  }
  if (
    slot === CHART_BUILDER_INTEGRATION_SLOTS.connectorCreate
    || slot === CHART_BUILDER_INTEGRATION_SLOTS.connectorEdit
    || slot === CHART_BUILDER_INTEGRATION_SLOTS.connectorDelete
  ) {
    await connectorsViewRef.value?.reloadConnectors();
  }
}

function onDesignerSaved(): void {
  view.value = 'list';
  editingChartKey.value = null;
}

function onDesignerCancel(): void {
  view.value = 'list';
  editingChartKey.value = null;
}
</script>

<template>
  <div class="chart-builder-app lab-platform-catalog-app lab-app-workspace-fill app-loaded-container text-lab-general-text min-h-0 h-full flex flex-1 flex-col overflow-hidden">
    <LabIntegrationSurface
      ref="integrationSurfaceRef"
      class="sr-only"
      :host-app-id="CHART_BUILDER_APP_ID"
      :surface-id="CHART_BUILDER_WORKSPACE_SURFACE"
      :server-url="resolvedServerUrl"
      :context="integrationContext"
      :inline-region-ids="[]"
      :hide-empty-regions="true"
      @integration-success="onIntegrationSuccess"
    />

    <header
      :id="generateUniqueId('cb-header')"
      class="lab-app-header mb-0 flex flex-wrap items-start justify-between gap-3"
    >
      <div>
        <h1 :id="generateUniqueId('cb-app-title')" class="text-2xl font-bold tracking-tight text-lab-general-text m-0">
          Chart Builder
        </h1>
        <p class="mt-1 text-lab-general-text-muted m-0">
          Design reusable chart definitions. Host apps supply live data at render time.
        </p>
      </div>
      <Button
        v-if="view !== 'designer'"
        :id="generateUniqueId('cb-refresh-catalog')"
        label="Refresh"
        icon="pi pi-refresh"
        severity="secondary"
        size="small"
        outlined
        :loading="catalogRefreshing"
        aria-label="Refresh chart library"
        @click="refreshChartCatalog"
      />
    </header>

    <div class="lab-app-body flex-1 min-h-0">
    <template v-if="view === 'home'">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <section
          class="lab-form-section mb-0 flex flex-col gap-3"
          :id="generateUniqueId('cb-home-manage-card')"
        >
          <h4
            :id="generateUniqueId('cb-home-manage-title')"
            class="lab-form-section__title m-0"
          >
            <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-chart-bar" /></span>
            Manage charts
          </h4>
          <p class="lab-form-section__lead m-0">
            Create bar, line, pie, and doughnut charts with titles, legend, and layout options.
          </p>
          <Button
            :id="generateUniqueId('cb-open-list')"
            label="Open chart library"
            icon="pi pi-chart-bar"
            @click="openList"
          />
        </section>
        <section
          class="lab-form-section mb-0 flex flex-col gap-3"
          :id="generateUniqueId('cb-home-quick-card')"
        >
          <h4
            :id="generateUniqueId('cb-home-quick-title')"
            class="lab-form-section__title m-0"
          >
            <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-bolt" /></span>
            Quick start
          </h4>
          <p class="lab-form-section__lead m-0">
            New charts get a unique key. Embed in CRM or other apps with
            <code class="text-xs text-lab-general-text">loadChartSchema</code> and
            <code class="text-xs text-lab-general-text">ChartRuntime</code>.
          </p>
          <Button
            :id="generateUniqueId('cb-quick-new')"
            label="Create chart"
            icon="pi pi-plus"
            severity="secondary"
            @click="openCreate"
          />
        </section>
        <section
          class="lab-form-section mb-0 flex flex-col gap-3"
          :id="generateUniqueId('cb-home-connectors-card')"
        >
          <h4
            :id="generateUniqueId('cb-home-connectors-title')"
            class="lab-form-section__title m-0"
          >
            <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-link" /></span>
            Data connectors
          </h4>
          <p class="lab-form-section__lead m-0">
            Register discovery URLs from Task List, Help Desk, and other apps so charts can fetch and aggregate live data.
          </p>
          <Button
            :id="generateUniqueId('cb-open-connectors')"
            label="Manage data connectors"
            icon="pi pi-link"
            severity="secondary"
            @click="openConnectors"
          />
        </section>
      </div>
    </template>

    <ChartListView
      v-else-if="view === 'list'"
      ref="chartListRef"
      :server-url="resolvedServerUrl"
      @back="view = 'home'"
      @create="openCreate"
      @edit="openEdit"
      @request-delete="onChartRequestDelete"
    />

    <ChartConnectorsView
      v-else-if="view === 'connectors'"
      ref="connectorsViewRef"
      :server-url="resolvedServerUrl"
      @back="view = 'home'"
      @request-delete="onConnectorRequestDelete"
    />

    <ChartDesignerView
      v-else
      :server-url="resolvedServerUrl"
      :chart-key="editingChartKey"
      @saved="onDesignerSaved"
      @cancel="onDesignerCancel"
    />
    </div>
  </div>
</template>
