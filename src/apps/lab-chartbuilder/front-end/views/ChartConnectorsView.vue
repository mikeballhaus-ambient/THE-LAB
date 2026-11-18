<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import type { ChartDataConnector } from '@/apps/lab-chartbuilder/shared/types/chart-data-connector';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import { LabIntegrationSurface } from '@/shared/integration';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import { useChartConnectors } from '../composables/useChartConnectors';
import ChartIntegrationUnboundHint from '../components/ChartIntegrationUnboundHint.vue';
import {
  CHART_BUILDER_CONNECTORS_SURFACE,
  CHART_BUILDER_INTEGRATION_SLOTS,
} from '../constants/integration-slots';

const props = defineProps<{
  serverUrl: string;
}>();

const emit = defineEmits<{
  back: [];
  'request-delete': [connectorId: number];
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const verifyingId = ref<number | null>(null);
const lastVerifiedId = ref<number | null>(null);
const connectorsIntegrationRef = ref<InstanceType<typeof LabIntegrationSurface> | null>(null);
const connectorEditIntegrationRef = ref<InstanceType<typeof LabIntegrationSurface> | null>(null);
const connectorCreateBound = ref(false);
const connectorEditBound = ref(false);
const editingConnectorId = ref<number | null>(null);
const showAddConnector = ref(true);
const addSectionRef = ref<HTMLElement | null>(null);

const {
  connectors,
  loading,
  error,
  loadConnectors,
  verifyConnector,
  deleteConnector,
} = useChartConnectors(props.serverUrl);

const editIntegrationContext = computed((): Record<string, unknown> => {
  if (editingConnectorId.value == null) {
    return {};
  }
  return { connectorId: editingConnectorId.value };
});

const grouped = computed(() => {
  const map = new Map<string, typeof connectors.value>();
  for (const row of connectors.value) {
    const list = map.get(row.appName) ?? [];
    list.push(row);
    map.set(row.appName, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
});

async function refreshConnectorBindingState(): Promise<void> {
  await connectorsIntegrationRef.value?.refresh();
  connectorCreateBound.value = Boolean(
    connectorsIntegrationRef.value?.hasEnabledBinding(
      CHART_BUILDER_INTEGRATION_SLOTS.connectorCreate,
    ),
  );
  if (connectorEditIntegrationRef.value) {
    await connectorEditIntegrationRef.value.refresh();
    connectorEditBound.value = Boolean(
      connectorEditIntegrationRef.value.hasEnabledBinding(
        CHART_BUILDER_INTEGRATION_SLOTS.connectorEdit,
      ),
    );
  } else {
    connectorEditBound.value = false;
  }
}

onMounted(async () => {
  await loadConnectors();
  showAddConnector.value = connectors.value.length === 0;
  await refreshConnectorBindingState();
});

watch(editingConnectorId, async () => {
  await refreshConnectorBindingState();
});

function startEdit(id: number): void {
  editingConnectorId.value = id;
}

function cancelEdit(): void {
  editingConnectorId.value = null;
}

async function openNewConnector(): Promise<void> {
  cancelEdit();
  showAddConnector.value = true;
  await nextTick();
  addSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function contractFieldCount(row: ChartDataConnector): number {
  return row.contractPreview?.entityModel?.properties?.length ?? 0;
}

function formatContractFieldNames(row: ChartDataConnector): string {
  const names =
    row.contractPreview?.entityModel?.properties
      ?.map((prop) => prop.name)
      .filter((name): name is string => Boolean(name)) ?? [];
  if (names.length === 0) {
    return '';
  }
  const preview = names.slice(0, 6).join(', ');
  return names.length > 6 ? `${preview}, …` : preview;
}

async function onVerify(id: number): Promise<void> {
  const row = connectors.value.find((c) => c.id === id);
  verifyingId.value = id;
  error.value = null;
  try {
    const updated = await verifyConnector(id);
    lastVerifiedId.value = id;
    const fieldCount = contractFieldCount(updated);
    toast.add({
      severity: 'success',
      summary: 'Connector verified',
      detail: `${updated.appName} · ${updated.entityName} — discovery returned ${fieldCount} field(s).`,
      life: 6000,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Verify failed';
    error.value = message;
    const detail = row
      ? `${row.appName} · ${row.entityName} — ${message}`
      : message;
    toast.add({
      severity: 'error',
      summary: 'Verification failed',
      detail,
      life: 10000,
    });
  } finally {
    verifyingId.value = null;
  }
}

function onDelete(id: number): void {
  emit('request-delete', id);
}

async function confirmDeleteConnector(id: number): Promise<void> {
  if (!window.confirm('Remove this data connector? Charts using it must be cleared first.')) {
    return;
  }
  try {
    await deleteConnector(id);
    if (editingConnectorId.value === id) {
      editingConnectorId.value = null;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Delete failed';
  }
}

async function reloadConnectors(): Promise<void> {
  await loadConnectors();
  await refreshConnectorBindingState();
}

async function onCreateFormSuccess(): Promise<void> {
  showAddConnector.value = false;
  await reloadConnectors();
}

async function onEditFormSuccess(): Promise<void> {
  editingConnectorId.value = null;
  await reloadConnectors();
}

function onCreateFormCancel(): void {
  showAddConnector.value = false;
}

function onEditFormCancel(): void {
  cancelEdit();
}

defineExpose({ confirmDeleteConnector, reloadConnectors });
</script>

<template>
  <div class="chart-connectors-view flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1
        class="text-xl font-semibold m-0 text-lab-general-text"
        :id="generateUniqueId('cb-connectors-title')"
      >
        Manage data connectors
      </h1>
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :pt="{ root: { attrs: { id: generateUniqueId('cb-connectors-back') } } }"
        @click="emit('back')"
      />
    </div>

    <section
      v-show="showAddConnector"
      ref="addSectionRef"
      :id="generateUniqueId('cb-connectors-add-section')"
      class="lab-app-panel flex flex-col gap-3"
    >
      <h2
        :id="generateUniqueId('cb-add-connector-heading')"
        class="text-base font-semibold m-0 text-lab-general-text"
      >
        Add connector
      </h2>
      <p class="text-sm text-lab-general-text-muted m-0">
        Paste a discovery URL from Task List, Help Desk, CRM, or another host app.
      </p>

      <LabIntegrationSurface
        ref="connectorsIntegrationRef"
        :host-app-id="CHART_BUILDER_APP_ID"
        :surface-id="CHART_BUILDER_CONNECTORS_SURFACE"
        :server-url="props.serverUrl"
        :context="{}"
        :inline-region-ids="['connectors.forms']"
        @integration-success="onCreateFormSuccess"
        @integration-cancel="onCreateFormCancel"
      />

      <ChartIntegrationUnboundHint
        v-if="!connectorCreateBound"
        :slot-id="CHART_BUILDER_INTEGRATION_SLOTS.connectorCreate"
        label="Register data connector"
      />

      <Button
        v-if="connectors.length > 0"
        label="Hide add form"
        icon="pi pi-chevron-up"
        severity="secondary"
        text
        size="small"
        class="self-start"
        :pt="{ root: { attrs: { id: generateUniqueId('cb-connectors-hide-add') } } }"
        @click="showAddConnector = false"
      />
    </section>

    <section
      v-if="editingConnectorId != null"
      :id="generateUniqueId('cb-connectors-edit-section')"
      class="lab-app-panel flex flex-col gap-3 border border-lab-accent/40"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2
          :id="generateUniqueId('cb-edit-connector-heading')"
          class="text-base font-semibold m-0 text-lab-general-text"
        >
          Edit connector
        </h2>
        <Button
          label="Cancel edit"
          icon="pi pi-times"
          severity="secondary"
          text
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('cb-connectors-cancel-edit') } } }"
          @click="cancelEdit"
        />
      </div>

      <LabIntegrationSurface
        ref="connectorEditIntegrationRef"
        :host-app-id="CHART_BUILDER_APP_ID"
        :surface-id="CHART_BUILDER_CONNECTORS_SURFACE"
        :server-url="props.serverUrl"
        :context="editIntegrationContext"
        :inline-region-ids="['connectors.edit']"
        @integration-success="onEditFormSuccess"
        @integration-cancel="onEditFormCancel"
      />

      <ChartIntegrationUnboundHint
        v-if="!connectorEditBound"
        :slot-id="CHART_BUILDER_INTEGRATION_SLOTS.connectorEdit"
        label="Edit data connector"
      />
    </section>

    <section
      :id="generateUniqueId('cb-connectors-list-section')"
      class="flex flex-col gap-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2
          :id="generateUniqueId('cb-registered-heading')"
          class="text-base font-semibold m-0 text-lab-general-text"
        >
          Registered connectors
        </h2>
        <Button
          v-if="!showAddConnector"
          label="New data connector"
          icon="pi pi-plus"
          size="small"
          outlined
          :pt="{ root: { attrs: { id: generateUniqueId('cb-connectors-new') } } }"
          @click="openNewConnector"
        />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
      <p v-if="loading" class="text-sm text-lab-general-text-muted m-0">Loading connectors…</p>

      <div v-else-if="connectors.length === 0" class="lab-app-panel text-sm text-lab-general-text-muted">
        No data connectors registered yet. Use the form above to add one.
      </div>

      <div v-else class="flex flex-col gap-4">
        <section
          v-for="[appName, rows] in grouped"
          :key="appName"
          class="lab-app-panel flex flex-col gap-2"
          :id="generateUniqueId(`cb-connector-group-${appName}`)"
        >
          <h3
            class="text-sm font-semibold m-0 text-lab-general-text"
            :id="generateUniqueId(`cb-connector-group-title-${appName}`)"
          >
            {{ appName }}
          </h3>
          <div
            v-for="row in rows"
            :key="row.id"
            class="rounded border border-lab-general-border p-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
            :class="{
              'ring-1 ring-lab-accent': editingConnectorId === row.id,
              'ring-1 ring-emerald-500/50': lastVerifiedId === row.id && editingConnectorId !== row.id,
            }"
          >
            <div class="min-w-0">
              <p class="font-medium m-0 text-lab-general-text">{{ row.entityName }}</p>
              <p class="text-xs text-lab-general-text-muted m-0 mt-1 break-all font-mono">{{ row.discoveryUrl }}</p>
              <p class="text-xs m-0 mt-1" :class="row.isActive ? 'text-emerald-500' : 'text-lab-general-text-muted'">
                {{ row.isActive ? 'Active' : 'Inactive' }}
              </p>
              <p
                v-if="row.contractPreview"
                class="text-xs m-0 mt-2 flex flex-wrap items-center gap-1 text-emerald-600 dark:text-emerald-400"
                :id="generateUniqueId(`cb-connector-verified-${row.id}`)"
              >
                <i class="pi pi-check-circle" aria-hidden="true" />
                <span>
                  Discovery OK —
                  {{ contractFieldCount(row) }} field(s)
                  <template v-if="formatContractFieldNames(row)">
                    ({{ formatContractFieldNames(row) }})
                  </template>
                </span>
              </p>
            </div>
            <div class="flex flex-wrap gap-1 shrink-0">
              <Button
                label="Edit"
                icon="pi pi-pencil"
                size="small"
                outlined
                :pt="
                  labRecordActionButtonPt(
                    generateUniqueId,
                    'cb-connector',
                    'edit',
                    row.id,
                    row.entityName,
                  )
                "
                @click="startEdit(row.id)"
              />
              <Button
                label="Verify"
                icon="pi pi-check"
                size="small"
                outlined
                severity="secondary"
                :loading="verifyingId === row.id"
                :disabled="verifyingId != null && verifyingId !== row.id"
                :pt="{ root: { attrs: { id: generateUniqueId(`cb-connector-verify-${row.id}`) } } }"
                @click="onVerify(row.id)"
              />
              <Button
                label="Delete"
                icon="pi pi-trash"
                size="small"
                outlined
                severity="danger"
                :pt="
                  labRecordActionButtonPt(
                    generateUniqueId,
                    'cb-connector',
                    'delete',
                    row.id,
                    row.entityName,
                  )
                "
                @click="onDelete(row.id)"
              />
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
