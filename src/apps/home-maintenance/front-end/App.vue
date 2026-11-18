<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import { useLabAppToast } from '@/shared/composables/useLabAppToast';
import { useCatalogSingleAccordion } from '@/shared/composables/catalog/useCatalogSingleAccordion';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { AssetWithTasks, MaintenanceTask } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-home-maintenance';

interface Props {
  serverUrl?: string;
  appDescription?: string;
}
const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useLabAppToast();
const { accordionValue, onAccordionChange } = useCatalogSingleAccordion();

const integrationRef = ref<InstanceType<typeof CatalogIntegrationHost> | null>(null);
const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

const loading = ref(false);
const error = ref<string | null>(null);
const assets = ref<AssetWithTasks[]>([]);

function isOpenMaintenanceTask(task: MaintenanceTask): boolean {
  return task.status !== 'done' && task.status !== 'skipped';
}

function nextOpenTask(asset: AssetWithTasks): MaintenanceTask | undefined {
  return asset.tasks.find((task) => isOpenMaintenanceTask(task));
}

function completeNextButtonTitle(asset: AssetWithTasks): string {
  const task = nextOpenTask(asset);
  return task ? 'Mark this task as done' : 'Every open task on this asset is complete';
}

async function completeNextOpenTask(asset: AssetWithTasks): Promise<void> {
  const task = nextOpenTask(asset);
  if (!task) {
    return;
  }
  try {
    await api.setTaskStatus(base.value, task.id, 'done');
    await reloadWorkspace();
    toast.add({
      severity: 'success',
      summary: 'Task completed',
      detail: task.title,
      life: 2500,
    });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Update failed', detail: msg(e), life: 5000 });
  }
}

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    assets.value = await api.listAssets(base.value);
  } catch (e) {
    error.value = msg(e);
  } finally {
    loading.value = false;
  }
}
const { reportsChartContext, reloadWorkspace } = useCatalogWorkspaceRefresh({
  hostAppId: HOST_APP_ID,
  serverUrl: () => base.value,
  reload: refresh,
});

async function onIntegrationSuccess(): Promise<void> {
  await reloadWorkspace();
  toast.add({ severity: 'success', summary: 'Maintenance updated', life: 2500 });
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

function formatTaskCost(cost: number | null | undefined): string | null {
  if (cost == null || Number.isNaN(cost)) {
    return null;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cost);
}

onMounted(refresh);
</script>

<template>
  <div
    class="home-maintenance-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('home-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('home-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('home-title')">Home Maintenance Log</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Log home maintenance tasks and history.' }}
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <Button
          label="New asset"
          icon="pi pi-home"
          size="small"
          severity="secondary"
          :pt="{ root: { attrs: { id: generateUniqueId('home-new-asset') } } }"
          @click="integrationRef?.openEntityCreate('home-asset')"
        />
        <Button
          label="New task"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('home-new-task') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('home-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="home-reports"
    />

    <CatalogAppFormSection
      title="Assets & tasks"
      lead="Maintenance assets and open tasks."
      icon="pi pi-wrench"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="home-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('home-error')">{{ error }}</p>
      <p
        v-else-if="!loading && assets.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('home-empty')"
      >
        No assets tracked yet.
      </p>

      <ul v-else class="catalog-master-list" :id="generateUniqueId('home-list')">
        <li v-for="asset in assets" :key="asset.id" :id="generateUniqueId(`home-wrap-${asset.id}`)">
          <section class="lab-form-section catalog-master-record" :id="generateUniqueId(`home-asset-${asset.id}`)">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <h2 class="text-lg font-semibold m-0" :id="generateUniqueId(`home-asset-title-${asset.id}`)">
                  {{ asset.name }}
                </h2>
                <p class="home-asset-meta text-xs m-0 mt-1">
                  <span class="home-asset-meta__category">{{
                    asset.category || 'Uncategorised'
                  }}</span>
                  <span class="home-asset-meta__sep" aria-hidden="true">·</span>
                  <span class="home-asset-meta__location">{{
                    asset.location || 'No location'
                  }}</span>
                </p>
              </div>
              <div class="flex gap-1 shrink-0">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'home-asset', 'edit', asset.id, asset.name)"
                  @click="integrationRef?.openEntityEdit('home-asset', asset.id)"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'home-asset', 'delete', asset.id, asset.name)"
                  @click="integrationRef?.openEntityDelete('home-asset', asset.id)"
                />
              </div>
            </div>

            <Accordion
              :value="accordionValue(asset.id)"
              class="catalog-details-accordion mt-3 w-full min-w-0"
              :pt="{ root: { attrs: { id: generateUniqueId(`home-tasks-accordion-${asset.id}`) } } }"
              @update:value="(v) => onAccordionChange(asset.id, v)"
            >
              <AccordionPanel
                :value="String(asset.id)"
                class="min-w-0"
                :pt="{ root: { attrs: { id: generateUniqueId(`home-tasks-panel-${asset.id}`) } } }"
              >
                <AccordionHeader
                  :pt="{ root: { attrs: { id: generateUniqueId(`home-tasks-toggle-${asset.id}`) } } }"
                >
                  <span class="text-sm font-medium">
                    Maintenance tasks
                    <span class="text-lab-general-text-muted font-normal">({{ asset.tasks.length }})</span>
                  </span>
                </AccordionHeader>
                <AccordionContent
                  :pt="{ root: { attrs: { id: generateUniqueId(`home-tasks-body-${asset.id}`) } } }"
                >
                  <p
                    v-if="asset.tasks.length === 0"
                    class="text-xs text-lab-general-text-muted m-0"
                    :id="generateUniqueId(`home-tasks-empty-${asset.id}`)"
                  >
                    No tasks yet.
                  </p>
                  <template v-else>
                    <div class="home-task-toolbar">
                      <Button
                        icon="pi pi-check"
                        size="small"
                        severity="secondary"
                        outlined
                        class="max-w-full home-complete-next-btn"
                        :disabled="!nextOpenTask(asset)"
                        :title="completeNextButtonTitle(asset)"
                        :pt="{
                          root: { attrs: { id: generateUniqueId(`home-complete-next-${asset.id}`) } },
                        }"
                        @click="completeNextOpenTask(asset)"
                      >
                        <span
                          v-if="nextOpenTask(asset)"
                          class="inline-flex min-w-0 max-w-full items-baseline home-complete-next-btn__label"
                        >
                          <span class="shrink-0 home-complete-next-btn__prefix">Complete:</span>
                          <span class="italic truncate home-complete-next-btn__title">{{
                            nextOpenTask(asset)!.title
                          }}</span>
                        </span>
                        <span v-else>All open tasks complete</span>
                      </Button>
                    </div>
                    <div class="home-task-table">
                      <div
                        class="home-task-col-head"
                        aria-hidden="true"
                        :id="generateUniqueId(`home-task-cols-${asset.id}`)"
                      >
                        <span class="home-task-col-head__status">Status</span>
                        <span class="home-task-col-head__title">Task</span>
                        <span class="home-task-col-head__due">Due</span>
                        <span class="home-task-col-head__cost">Cost</span>
                        <span class="home-task-col-head__priority">Priority</span>
                        <span class="home-task-col-head__actions" />
                      </div>
                      <ul
                        class="home-task-list catalog-accordion-item-list list-none m-0 p-0"
                        :id="generateUniqueId(`home-tasks-${asset.id}`)"
                      >
                      <li
                        v-for="t in asset.tasks"
                        :key="t.id"
                        class="home-task-row"
                        :class="{
                          'catalog-accordion-item-list__row--emphasis':
                            nextOpenTask(asset)?.id === t.id,
                        }"
                        :id="generateUniqueId(`home-task-${t.id}`)"
                      >
                        <span
                          class="home-task-row__status text-xs px-2 py-0.5 rounded-full border text-center border-lab-general-border text-lab-general-text-muted"
                          :class="{
                            'home-task-row__status--done border-lab-button-border-hover text-lab-general-text':
                              t.status === 'done',
                            'home-task-row__status--due border-lab-general-border text-lab-general-text':
                              t.status === 'due',
                          }"
                        >
                          {{ t.status }}
                        </span>
                        <span
                          class="home-task-row__title min-w-0 truncate"
                          :class="{
                            'home-task-row__title--done line-through opacity-60': t.status === 'done',
                            'home-task-row__title--next': nextOpenTask(asset)?.id === t.id,
                          }"
                        >
                          {{ t.title }}
                        </span>
                        <span class="home-task-row__due text-lab-general-text-muted">
                          {{ t.dueDate ?? '' }}
                        </span>
                        <span
                          class="home-task-row__cost text-lab-general-text-muted"
                          :class="{
                            'home-task-row__cost--empty opacity-40': !formatTaskCost(t.cost),
                            'home-task-row__cost--set': formatTaskCost(t.cost),
                          }"
                        >
                          {{ formatTaskCost(t.cost) ?? '—' }}
                        </span>
                        <span
                          class="home-task-row__priority home-priority-badge"
                          :class="`home-priority-badge--${t.priority ?? 'normal'}`"
                        >
                          {{ t.priority }}
                        </span>
                        <div class="home-task-row__actions flex gap-0.5 shrink-0 justify-end">
                          <Button
                            icon="pi pi-pencil"
                            size="small"
                            severity="secondary"
                            text
                            :pt="labRecordActionButtonPt(generateUniqueId, 'home-task', 'edit', t.id, t.title)"
                            @click="integrationRef?.openPrimaryEdit(t.id)"
                          />
                          <Button
                            icon="pi pi-trash"
                            size="small"
                            severity="danger"
                            text
                            :pt="labRecordActionButtonPt(generateUniqueId, 'home-task', 'delete', t.id, t.title)"
                            @click="integrationRef?.openPrimaryDelete(t.id)"
                          />
                        </div>
                      </li>
                    </ul>
                    </div>
                  </template>
                </AccordionContent>
              </AccordionPanel>
            </Accordion>
          </section>
        </li>
      </ul>
    </CatalogAppFormSection>

    <CatalogIntegrationHost
      ref="integrationRef"
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      @integration-success="onIntegrationSuccess"
    />

  </div>
</template>

<style scoped>
.home-asset-meta {
  color: var(--lab-general-text-muted);
  letter-spacing: 0.02em;
}

.home-asset-meta__category {
  font-weight: 600;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--lab-general-text) 72%, var(--lab-general-text-muted));
}

.home-asset-meta__sep {
  margin: 0 0.35rem;
  opacity: 0.45;
  font-weight: 300;
}

.home-asset-meta__location {
  font-style: italic;
  font-weight: 400;
}

.home-task-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.65rem;
  min-width: 0;
  max-width: 100%;
}

.home-task-table {
  --home-task-grid-cols: 5.25rem minmax(0, 1fr) 6.5rem 5rem 5.5rem minmax(4.25rem, auto);
  min-width: 0;
  width: calc(100% + 1.3rem);
  max-width: none;
  margin-inline: -0.65rem;
}

.home-task-col-head,
.home-task-row {
  display: grid;
  grid-template-columns: var(--home-task-grid-cols);
  align-items: center;
  column-gap: 0.5rem;
  padding-inline: 0.65rem;
  box-sizing: border-box;
}

.home-task-col-head {
  margin-bottom: 0.2rem;
  padding-bottom: 0.15rem;
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lab-general-text-muted);
}

.home-task-col-head__title {
  letter-spacing: 0.04em;
}

.home-task-col-head__due,
.home-task-col-head__cost,
.home-task-col-head__priority,
.home-task-row__due,
.home-task-row__cost,
.home-task-row__priority {
  justify-self: start;
  text-align: left;
}

.home-task-col-head__due,
.home-task-col-head__cost {
  font-family: var(--lab-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  letter-spacing: 0.06em;
}

.home-task-col-head__actions,
.home-task-row__actions {
  justify-self: end;
}

.home-task-row__status {
  justify-self: stretch;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.home-task-row__title {
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: var(--lab-general-text);
}

.home-task-row__title--next {
  font-weight: 700;
  letter-spacing: -0.015em;
}

.home-task-row__title--done {
  font-weight: 400;
}

.home-task-row__due {
  font-family: var(--lab-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.6875rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.home-task-row__cost {
  font-family: var(--lab-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.home-task-row__cost--set {
  font-weight: 600;
  color: color-mix(in srgb, var(--lab-general-text) 88%, var(--lab-general-text-muted));
}

.home-priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.25rem;
  padding: 0.125rem 0.45rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 85%, transparent);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--lab-general-text-muted);
  background: color-mix(in srgb, var(--lab-general-bg) 92%, var(--lab-general-border));
}

.home-priority-badge--high {
  border-color: color-mix(in srgb, var(--lab-button-border-hover) 65%, var(--lab-general-border));
  color: var(--lab-general-text);
  background: color-mix(in srgb, var(--lab-general-border) 22%, var(--lab-general-bg));
}

.home-priority-badge--normal {
  font-weight: 600;
}

.home-priority-badge--low {
  font-weight: 600;
  font-style: normal;
  opacity: 0.92;
}

.home-task-row__due,
.home-task-row__cost,
.home-task-row__priority {
  white-space: nowrap;
}

.catalog-accordion-item-list__row--emphasis .home-task-row__status--due {
  font-weight: 800;
}

:deep(.home-complete-next-btn__label) {
  max-width: 100%;
  gap: 0.35rem;
}

:deep(.home-complete-next-btn__prefix) {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

:deep(.home-complete-next-btn__prefix::after) {
  content: '\00a0';
}

:deep(.home-complete-next-btn .p-button-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: min(36rem, 100%);
  min-width: 0;
}

:deep(.home-complete-next-btn__title) {
  min-width: 0;
}
</style>
