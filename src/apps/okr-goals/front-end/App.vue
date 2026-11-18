<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import ProgressBar from 'primevue/progressbar';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useToast } from 'primevue/usetoast';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { KeyResultStatus, ObjectiveWithKeyResults } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-okr-goals';

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
const objectives = ref<ObjectiveWithKeyResults[]>([]);
const error = ref<string | null>(null);
/** Objective ids whose key-result block is expanded (default: all collapsed). */
const expandedObjectiveKrIds = ref<Set<number>>(new Set());
let lastIntegrationSuccessToastAt = 0;

function objectiveKrAccordionValue(objectiveId: number): string | null {
  return expandedObjectiveKrIds.value.has(objectiveId) ? String(objectiveId) : null;
}

function onObjectiveKrAccordionChange(objectiveId: number, value: string | string[] | null | undefined): void {
  const next = new Set(expandedObjectiveKrIds.value);
  const open =
    value != null &&
    value !== '' &&
    (Array.isArray(value) ? value.includes(String(objectiveId)) : value === String(objectiveId));
  if (open) {
    next.add(objectiveId);
  } else {
    next.delete(objectiveId);
  }
  expandedObjectiveKrIds.value = next;
}

function keyResultCount(objective: ObjectiveWithKeyResults): number {
  return (objective.keyResults ?? []).length;
}

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    objectives.value = await api.listObjectives(base.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load objectives';
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
  const now = Date.now();
  if (now - lastIntegrationSuccessToastAt < 500) {
    return;
  }
  lastIntegrationSuccessToastAt = now;
  toast.add({ severity: 'success', summary: 'Objective updated', life: 2500 });
}

async function updateKrCurrent(
  id: number,
  kr: {
    title: string;
    metric: string;
    baseline: number;
    target: number;
    status: KeyResultStatus;
  },
  current: number,
): Promise<void> {
  try {
    await api.updateKeyResult(base.value, id, { ...kr, current });
    await reloadWorkspace();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Update failed', detail: msg(e), life: 5000 });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

function statusSeverity(status: KeyResultStatus): 'success' | 'info' | 'warn' | 'secondary' {
  if (status === 'done') return 'success';
  if (status === 'on-track') return 'info';
  if (status === 'at-risk') return 'warn';
  return 'secondary';
}

/** Baseline / target / current plus unit (e.g. `15 packs`, `88%`). */
function formatKrMeasure(value: number, metric: string | null | undefined): string {
  const unit = (metric ?? '').trim();
  if (!unit) {
    return String(value);
  }
  if (unit === '%') {
    return `${value}%`;
  }
  return `${value} ${unit}`;
}

onMounted(refresh);
</script>

<template>
  <div
    class="okr-goals-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('okr-root')"
  >
    <header class="lab-app-header shrink-0" :id="generateUniqueId('okr-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('okr-title')">OKR / Goals</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Track quarterly objectives and key results.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New objective"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('okr-new-objective') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('okr-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="okr-reports"
    />


    <CatalogAppFormSection
      title="Objectives"
      lead="Quarterly goals, key results, and inline progress updates."
      icon="pi pi-bullseye"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="okr-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('okr-error')">{{ error }}</p>
      <p
        v-else-if="!loading && objectives.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('okr-empty')"
      >
        No objectives yet — use “New objective” to get started.
      </p>

      <section
        v-for="objective in objectives"
        :key="objective.id"
        class="okr-card"
        :id="generateUniqueId(`okr-objective-${objective.id}`)"
      >
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="min-w-0">
            <h2 class="text-lg font-semibold m-0" :id="generateUniqueId(`okr-objective-title-${objective.id}`)">
              {{ objective.title }}
            </h2>
            <p class="text-xs text-lab-general-text-muted m-0 mt-0.5">
              {{ objective.ownerName || 'Unassigned' }} · {{ objective.quarter || 'No quarter' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold">{{ objective.progress }}%</span>
            <Button
              label="Key result"
              icon="pi pi-plus"
              size="small"
              severity="secondary"
              :pt="{ root: { attrs: { id: generateUniqueId(`okr-add-kr-${objective.id}`) } } }"
              @click="integrationRef?.openEntityCreate('key-result', { objectiveId: objective.id })"
            />
            <Button
              icon="pi pi-pencil"
              size="small"
              severity="secondary"
              text
              :pt="labRecordActionButtonPt(generateUniqueId, 'okr-objective', 'edit', objective.id, objective.title)"
              @click="integrationRef?.openPrimaryEdit(objective.id)"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              severity="danger"
              text
              :pt="labRecordActionButtonPt(generateUniqueId, 'okr-objective', 'delete', objective.id, objective.title)"
              @click="integrationRef?.openPrimaryDelete(objective.id)"
            />
          </div>
        </div>

        <ProgressBar
          :value="objective.progress"
          :show-value="false"
          class="mt-2"
          :pt="{ root: { attrs: { id: generateUniqueId(`okr-progress-${objective.id}`) } } }"
        />

        <!-- Key results — one toggle per objective, collapsed by default -->
        <Accordion
          :value="objectiveKrAccordionValue(objective.id)"
          class="okr-kr-accordion mt-3 w-full min-w-0"
          :pt="{ root: { attrs: { id: generateUniqueId(`okr-kr-accordion-${objective.id}`) } } }"
          @update:value="(v) => onObjectiveKrAccordionChange(objective.id, v)"
        >
          <AccordionPanel
            :value="String(objective.id)"
            class="okr-kr-panel min-w-0"
            :pt="{ root: { attrs: { id: generateUniqueId(`okr-kr-panel-${objective.id}`) } } }"
          >
            <AccordionHeader
              :pt="{ root: { attrs: { id: generateUniqueId(`okr-kr-toggle-${objective.id}`) } } }"
            >
              <span class="text-sm font-medium">
                Key results
                <span class="text-lab-general-text-muted font-normal">({{ keyResultCount(objective) }})</span>
              </span>
            </AccordionHeader>
            <AccordionContent
              :pt="{ root: { attrs: { id: generateUniqueId(`okr-kr-body-${objective.id}`) } } }"
            >
              <p
                v-if="keyResultCount(objective) === 0"
                class="text-xs text-lab-general-text-muted m-0"
                :id="generateUniqueId(`okr-kr-empty-${objective.id}`)"
              >
                No key results yet.
              </p>
              <ul
                v-else
                class="catalog-accordion-item-list"
                :id="generateUniqueId(`okr-kr-list-${objective.id}`)"
              >
                <li
                  v-for="kr in objective.keyResults ?? []"
                  :key="kr.id"
                  class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
                  :id="generateUniqueId(`okr-kr-${kr.id}`)"
                >
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium">{{ kr.title }}</div>
                    <div class="text-xs text-lab-general-text-muted">
                      {{ formatKrMeasure(kr.baseline, kr.metric) }} → {{ formatKrMeasure(kr.target, kr.metric) }} ·
                      current {{ formatKrMeasure(kr.current, kr.metric) }}
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="text-xs px-2 py-0.5 rounded-full border"
                      :class="{
                        'text-emerald-400 border-emerald-500': statusSeverity(kr.status) === 'success',
                        'text-sky-400 border-sky-500': statusSeverity(kr.status) === 'info',
                        'text-amber-400 border-amber-500': statusSeverity(kr.status) === 'warn',
                        'text-lab-general-text-muted border-lab-general-border':
                          statusSeverity(kr.status) === 'secondary',
                      }"
                    >
                      {{ kr.status }}
                    </span>
                    <InputNumber
                      :model-value="kr.current"
                      :min="0"
                      class="w-24"
                      :pt="{ input: { attrs: { id: generateUniqueId(`okr-kr-update-${kr.id}`) } } }"
                      @update:model-value="
                        (v: number | null) =>
                          v != null &&
                          updateKrCurrent(kr.id, {
                            title: kr.title,
                            metric: kr.metric,
                            baseline: kr.baseline,
                            target: kr.target,
                            status: kr.status,
                          }, v)
                      "
                    />
                    <Button
                      icon="pi pi-pencil"
                      size="small"
                      severity="secondary"
                      text
                      :pt="labRecordActionButtonPt(generateUniqueId, 'okr-kr', 'edit', kr.id, kr.title)"
                      @click="integrationRef?.openEntityEdit('key-result', kr.id, { objectiveId: objective.id })"
                    />
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      severity="danger"
                      text
                      :pt="labRecordActionButtonPt(generateUniqueId, 'okr-kr', 'delete', kr.id, kr.title)"
                      @click="integrationRef?.openEntityDelete('key-result', kr.id, { objectiveId: objective.id })"
                    />
                  </div>
                </li>
              </ul>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </section>
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
.okr-card {
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 60%, transparent);
  border-radius: 0.6rem;
  padding: 1rem;
  background: var(--lab-general-bg-subtle, transparent);
}

</style>
