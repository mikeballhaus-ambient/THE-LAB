<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import ProgressBar from 'primevue/progressbar';
import { useLabAppToast } from '@/shared/composables/useLabAppToast';
import { useCatalogSingleAccordion } from '@/shared/composables/catalog/useCatalogSingleAccordion';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { ChecklistWithTasks, ChecklistTask } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-onboarding-checklist';

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
const checklists = ref<ChecklistWithTasks[]>([]);

function nextOpenTask(checklist: ChecklistWithTasks): ChecklistTask | undefined {
  return checklist.tasks.find((task) => task.status !== 'done');
}

function completeNextButtonTitle(checklist: ChecklistWithTasks): string {
  const task = nextOpenTask(checklist);
  return task ? 'Mark this task as done' : 'Every task on this checklist is complete';
}

async function completeNextOpenTask(checklist: ChecklistWithTasks): Promise<void> {
  const task = nextOpenTask(checklist);
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
    checklists.value = await api.listChecklists(base.value);
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
  toast.add({ severity: 'success', summary: 'Checklist updated', life: 2500 });
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

onMounted(refresh);
</script>

<template>
  <div
    class="onboarding-checklist-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('onboarding-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('onboarding-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('onboarding-title')">Onboarding Checklist</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Onboarding checklists with per-hire task tracking.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New checklist"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('onboarding-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('onboarding-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="onboarding-reports"
    />

    <CatalogAppFormSection
      title="Checklists"
      lead="Onboarding tasks per new hire."
      icon="pi pi-check-square"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="onboarding-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('onboarding-error')">{{ error }}</p>
      <p
        v-else-if="!loading && checklists.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('onboarding-empty')"
      >
        No onboarding checklists yet — use “New checklist” to add one.
      </p>

      <ul v-else class="catalog-master-list" :id="generateUniqueId('onboarding-list')">
        <li v-for="c in checklists" :key="c.id" :id="generateUniqueId(`onboarding-wrap-${c.id}`)">
          <section class="lab-form-section catalog-master-record" :id="generateUniqueId(`onboarding-${c.id}`)">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <h2 class="text-lg font-semibold m-0" :id="generateUniqueId(`onboarding-hire-${c.id}`)">{{ c.newHire }}</h2>
                <p class="text-xs text-lab-general-text-muted m-0 mt-0.5">
                  {{ c.role || 'No role' }} · starts {{ c.startDate || 'TBD' }}
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-sm font-semibold">{{ c.progress }}%</span>
                <Button
                  label="Task"
                  icon="pi pi-plus"
                  size="small"
                  severity="secondary"
                  :pt="{ root: { attrs: { id: generateUniqueId(`onboarding-add-task-${c.id}`) } } }"
                  @click="integrationRef?.openEntityCreate('onboarding-task', { checklistId: c.id })"
                />
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'onboarding', 'edit', c.id, c.newHire)"
                  @click="integrationRef?.openPrimaryEdit(c.id)"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'onboarding', 'delete', c.id, c.newHire)"
                  @click="integrationRef?.openPrimaryDelete(c.id)"
                />
              </div>
            </div>
            <ProgressBar
              :value="c.progress"
              :show-value="false"
              class="mt-2"
              :pt="{ root: { attrs: { id: generateUniqueId(`onboarding-progress-${c.id}`) } } }"
            />

            <Accordion
              :value="accordionValue(c.id)"
              class="catalog-details-accordion mt-3 w-full min-w-0"
              :pt="{ root: { attrs: { id: generateUniqueId(`onboarding-tasks-accordion-${c.id}`) } } }"
              @update:value="(v) => onAccordionChange(c.id, v)"
            >
              <AccordionPanel
                :value="String(c.id)"
                class="min-w-0"
                :pt="{ root: { attrs: { id: generateUniqueId(`onboarding-tasks-panel-${c.id}`) } } }"
              >
                <AccordionHeader
                  :pt="{ root: { attrs: { id: generateUniqueId(`onboarding-tasks-toggle-${c.id}`) } } }"
                >
                  <span class="text-sm font-medium">
                    Onboarding tasks
                    <span class="text-lab-general-text-muted font-normal">({{ c.tasks.length }})</span>
                  </span>
                </AccordionHeader>
                <AccordionContent
                  :pt="{ root: { attrs: { id: generateUniqueId(`onboarding-tasks-body-${c.id}`) } } }"
                >
                  <p
                    v-if="c.tasks.length === 0"
                    class="text-xs text-lab-general-text-muted m-0"
                    :id="generateUniqueId(`onboarding-tasks-empty-${c.id}`)"
                  >
                    No tasks yet.
                  </p>
                  <template v-else>
                    <div class="flex flex-wrap items-center gap-2 mb-2 min-w-0 max-w-full">
                      <Button
                        icon="pi pi-check"
                        size="small"
                        severity="secondary"
                        outlined
                        class="max-w-full onboarding-complete-next-btn"
                        :disabled="!nextOpenTask(c)"
                        :title="completeNextButtonTitle(c)"
                        :pt="{
                          root: { attrs: { id: generateUniqueId(`onboarding-complete-next-${c.id}`) } },
                        }"
                        @click="completeNextOpenTask(c)"
                      >
                        <span
                          v-if="nextOpenTask(c)"
                          class="inline-flex min-w-0 max-w-full items-baseline onboarding-complete-next-btn__label"
                        >
                          <span class="shrink-0 onboarding-complete-next-btn__prefix">Complete:</span>
                          <span class="italic truncate onboarding-complete-next-btn__title">{{
                            nextOpenTask(c)!.title
                          }}</span>
                        </span>
                        <span v-else>All tasks complete</span>
                      </Button>
                    </div>
                    <ul
                      class="catalog-accordion-item-list"
                      :id="generateUniqueId(`onboarding-tasks-${c.id}`)"
                    >
                    <li
                      v-for="t in c.tasks"
                      :key="t.id"
                      class="flex items-center gap-2 flex-wrap rounded"
                      :class="{
                        'catalog-accordion-item-list__row--emphasis': nextOpenTask(c)?.id === t.id,
                      }"
                      :id="generateUniqueId(`onboarding-task-${t.id}`)"
                    >
                      <span
                        class="text-xs px-2 py-0.5 rounded-full border w-16 text-center capitalize border-lab-general-border text-lab-general-text-muted shrink-0"
                        :class="{
                          'border-lab-button-border-hover text-lab-general-text': t.status === 'done',
                          'border-lab-general-border text-lab-general-text': t.status === 'doing',
                        }"
                      >
                        {{ t.status }}
                      </span>
                      <span class="flex-1 min-w-0 truncate" :class="{ 'line-through opacity-60': t.status === 'done' }">
                        {{ t.title }}
                      </span>
                      <span
                        v-if="t.dueDate"
                        class="text-xs text-lab-general-text-muted w-24 shrink-0"
                      >
                        {{ t.dueDate }}
                      </span>
                      <span class="text-xs text-lab-general-text-muted truncate max-w-[10rem]">{{ t.owner || '—' }}</span>
                      <Button
                        icon="pi pi-pencil"
                        size="small"
                        severity="secondary"
                        text
                        :pt="
                          labRecordActionButtonPt(
                            generateUniqueId,
                            'onboarding-task',
                            'edit',
                            t.id,
                            t.title,
                          )
                        "
                        @click="integrationRef?.openEntityEdit('onboarding-task', t.id, { checklistId: c.id })"
                      />
                      <Button
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        text
                        :pt="
                          labRecordActionButtonPt(
                            generateUniqueId,
                            'onboarding-task',
                            'delete',
                            t.id,
                            t.title,
                          )
                        "
                        @click="integrationRef?.openEntityDelete('onboarding-task', t.id, { checklistId: c.id })"
                      />
                    </li>
                    </ul>
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
:deep(.onboarding-complete-next-btn .p-button-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: min(36rem, 100%);
  min-width: 0;
}

:deep(.onboarding-complete-next-btn__label) {
  max-width: 100%;
  gap: 0.35rem;
}

:deep(.onboarding-complete-next-btn__prefix::after) {
  content: '\00a0';
}

:deep(.onboarding-complete-next-btn__title) {
  min-width: 0;
}
</style>
