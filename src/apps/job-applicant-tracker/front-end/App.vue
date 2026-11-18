<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { DnDProvider } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { Applicant, HiringStage } from '../shared/types';
import ApplicantKanbanDndCard from './components/kanban/ApplicantKanbanDndCard.vue';
import ApplicantKanbanDndColumn from './components/kanban/ApplicantKanbanDndColumn.vue';
import * as api from './api';

const HOST_APP_ID = 'app-job-applicant-tracker';

interface Props {
  serverUrl?: string;
  appDescription?: string;
}
const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const integrationRef = ref<InstanceType<typeof CatalogIntegrationHost> | null>(null);

const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

const loading = ref(false);
const error = ref<string | null>(null);
const applicants = ref<Applicant[]>([]);

const stages: { label: string; value: HiringStage }[] = [
  { label: 'Applied', value: 'applied' },
  { label: 'Screening', value: 'screening' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Hired', value: 'hired' },
  { label: 'Rejected', value: 'rejected' },
];

const columns = computed(() =>
  stages.map((s) => ({
    ...s,
    items: applicants.value.filter((a) => a.stage === s.value),
  })),
);

function onColumnDrop(targetStage: HiringStage, event: IDragEvent): void {
  const raw = event.draggedItems[0]?.data;
  const id = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(id)) {
    return;
  }
  const applicant = applicants.value.find((a) => a.id === id);
  if (!applicant || applicant.stage === targetStage) {
    return;
  }
  void move(applicant, targetStage);
}

function appliedLabel(applicant: Applicant): string {
  const day = applicant.createdAt?.slice(0, 10);
  return day ? `Applied ${day}` : 'Applied';
}

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    applicants.value = await api.listApplicants(base.value);
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
  toast.add({ severity: 'success', summary: 'Applicant updated', life: 2500 });
}

async function move(applicant: Applicant, stage: HiringStage): Promise<void> {
  try {
    await api.setStage(base.value, applicant.id, stage);
    await reloadWorkspace();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Update failed', detail: msg(e), life: 5000 });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

onMounted(refresh);
</script>

<template>
  <div
    class="job-applicant-tracker-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('applicant-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('applicant-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('applicant-title')">Job Applicant Tracker</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Track candidates through hiring stages.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New applicant"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('applicant-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('applicant-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="applicant-reports"
    />

    <CatalogAppFormSection
      title="Hiring pipeline"
      lead="Drag cards between columns to change stage."
      icon="pi pi-users"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="applicant-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('applicant-error')">{{ error }}</p>

      <div class="flex-1 min-h-0 overflow-x-auto overflow-y-hidden applicant-kanban-scroll">
        <DnDProvider>
          <div class="flex gap-3 items-stretch min-w-max min-h-0 pb-1 applicant-kanban-board">
            <section
              v-for="col in columns"
              :key="col.value"
              class="lab-app-kanban-column applicant-kanban-column shrink-0 min-h-0 mb-0"
              :id="generateUniqueId(`applicant-col-${col.value}`)"
            >
              <div
                class="applicant-kanban-column__head flex items-center justify-between gap-2 min-w-0"
                :id="generateUniqueId(`applicant-col-title-${col.value}`)"
              >
                <span class="text-xs font-semibold text-lab-general-text uppercase tracking-wide truncate">
                  {{ col.label }}
                </span>
                <span
                  class="applicant-kanban-column__count text-[10px] font-medium text-lab-general-text tabular-nums shrink-0"
                >
                  {{ col.items.length }}
                </span>
              </div>

              <ApplicantKanbanDndColumn @drop="onColumnDrop(col.value, $event)">
                <div
                  class="applicant-kanban-list flex flex-col gap-2 min-h-0"
                  :id="generateUniqueId(`applicant-col-list-${col.value}`)"
                >
                  <div
                    v-for="a in col.items"
                    :key="a.id"
                    class="applicant-kanban-list__item"
                    :id="generateUniqueId(`applicant-wrap-${a.id}`)"
                  >
                    <ApplicantKanbanDndCard
                      :applicant="a"
                      :applied-label="appliedLabel(a)"
                      @edit="integrationRef?.openPrimaryEdit($event)"
                      @delete="integrationRef?.openPrimaryDelete($event)"
                    />
                  </div>
                </div>

                <p
                  v-if="col.items.length === 0"
                  class="lab-app-kanban-drop-hint m-0 flex-1"
                  :id="generateUniqueId(`applicant-col-empty-${col.value}`)"
                >
                  Drop here
                </p>
              </ApplicantKanbanDndColumn>
            </section>
          </div>
        </DnDProvider>
      </div>
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
.applicant-kanban-list {
  margin: 0;
  padding: 0;
}

.applicant-kanban-list__item {
  margin: 0;
  padding: 0;
}

.job-applicant-tracker-app .applicant-kanban-board {
  padding: 0.35rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--lab-general-border) 14%, transparent);
}

.job-applicant-tracker-app .applicant-kanban-column {
  max-height: 100%;
  border-color: color-mix(in srgb, var(--lab-general-border) 75%, var(--lab-general-text));
  background: color-mix(in srgb, var(--lab-general-bg) 88%, var(--lab-general-text));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--lab-general-text) 8%, transparent);
}

.job-applicant-tracker-app .applicant-kanban-column__head {
  padding-bottom: 0.5rem;
  margin-bottom: 0.125rem;
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, transparent);
}

.job-applicant-tracker-app .applicant-kanban-column__count {
  min-width: 1.25rem;
  padding: 0.1rem 0.35rem;
  border-radius: 9999px;
  text-align: center;
  background: color-mix(in srgb, var(--lab-general-text) 10%, var(--lab-general-bg));
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 80%, transparent);
}

.job-applicant-tracker-app :deep(.applicant-kanban-card) {
  margin: 0;
  padding: 0.625rem 0.75rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 88%, var(--lab-card-border, var(--lab-general-border)));
  border-left-width: 3px;
  border-left-color: color-mix(
    in srgb,
    var(--lab-section-accent, var(--lab-button-border-hover)) 80%,
    var(--lab-general-text)
  );
  background: color-mix(in srgb, var(--lab-general-bg) 94%, var(--lab-general-text));
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--lab-general-border) 35%, transparent),
    0 0 0 1px color-mix(in srgb, var(--lab-general-text) 4%, transparent);
}

.job-applicant-tracker-app :deep(.applicant-kanban-card__drag) {
  margin: 0;
  padding: 0;
}

.job-applicant-tracker-app :deep(.applicant-kanban-card__meta) {
  color: color-mix(in srgb, var(--lab-general-text) 70%, var(--lab-general-text-muted));
}

.job-applicant-tracker-app :deep(.applicant-kanban-card__id) {
  color: color-mix(in srgb, var(--lab-general-text) 55%, var(--lab-general-text-muted));
}

.job-applicant-tracker-app :deep(.applicant-kanban-card__actions) {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 80%, transparent);
}

.job-applicant-tracker-app .applicant-kanban-dropzone {
  min-height: 6rem;
  overflow-y: auto;
}

.job-applicant-tracker-app :deep(.lab-app-kanban-drop-hint) {
  border-color: color-mix(in srgb, var(--lab-general-border) 95%, transparent);
  color: color-mix(in srgb, var(--lab-general-text) 45%, var(--lab-general-text-muted));
}
</style>
