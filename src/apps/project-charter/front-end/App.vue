<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useCatalogSingleAccordion } from '@/shared/composables/catalog/useCatalogSingleAccordion';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { Charter, CharterStatus } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-project-charter';

interface Props {
  serverUrl?: string;
  appDescription?: string;
}
const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const { accordionValue, onAccordionChange } = useCatalogSingleAccordion();

const integrationRef = ref<InstanceType<typeof CatalogIntegrationHost> | null>(null);
const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

const loading = ref(false);
const error = ref<string | null>(null);
const charters = ref<Charter[]>([]);

function charterDetailFieldCount(charter: Charter): number {
  let n = 0;
  if (charter.goals?.trim()) n += 1;
  if (charter.scope?.trim()) n += 1;
  if (charter.outOfScope?.trim()) n += 1;
  if (charter.stakeholders?.trim()) n += 1;
  return n;
}

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    charters.value = await api.listCharters(base.value);
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
  toast.add({ severity: 'success', summary: 'Charter updated', life: 2500 });
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

function formatStatusLabel(status: CharterStatus): string {
  if (status === 'on-hold') {
    return 'On hold';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

onMounted(refresh);
</script>

<template>
  <div
    class="project-charter-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('charter-root')"
  >
    <header class="lab-app-header shrink-0" :id="generateUniqueId('charter-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('charter-title')">Project Charter</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Define project goals, scope and stakeholders.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New charter"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('charter-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('charter-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="charter-reports"
    />

    <CatalogAppFormSection
      title="Charters"
      lead="Draft and active project charters."
      icon="pi pi-file-edit"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="charter-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('charter-error')">{{ error }}</p>
      <p
        v-else-if="!loading && charters.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('charter-empty')"
      >
        No charters yet — use “New charter” to create one.
      </p>

      <ul
        v-else
        class="catalog-master-list"
        :id="generateUniqueId('charter-list')"
      >
        <li
          v-for="charter in charters"
          :key="charter.id"
          class="list-none m-0 p-0 ps-0"
          :id="generateUniqueId(`charter-item-wrap-${charter.id}`)"
        >
          <section
            class="lab-form-section catalog-master-record"
            :id="generateUniqueId(`charter-item-${charter.id}`)"
          >
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                  <h2
                    class="text-lg font-semibold m-0"
                    :id="generateUniqueId(`charter-item-title-${charter.id}`)"
                  >
                    {{ charter.title }}
                  </h2>
                  <span
                    class="charter-status-pill"
                    :class="`charter-status-pill--${charter.status}`"
                    :id="generateUniqueId(`charter-status-${charter.id}`)"
                  >
                    {{ formatStatusLabel(charter.status) }}
                  </span>
                </div>
                <p class="text-xs text-lab-general-text-muted m-0">
                  Sponsor: {{ charter.sponsor || 'Unassigned' }}
                </p>
              </div>
              <div class="flex gap-1 shrink-0">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'charter', 'edit', charter.id, charter.title)"
                  @click="integrationRef?.openPrimaryEdit(charter.id)"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'charter', 'delete', charter.id, charter.title)"
                  @click="integrationRef?.openPrimaryDelete(charter.id)"
                />
              </div>
            </div>

            <p
              v-if="charter.purpose"
              class="lab-form-section__lead m-0 mt-2"
              :id="generateUniqueId(`charter-purpose-${charter.id}`)"
            >
              {{ charter.purpose }}
            </p>

            <Accordion
              v-if="charter.goals || charter.scope || charter.outOfScope || charter.stakeholders"
              :value="accordionValue(charter.id)"
              class="catalog-details-accordion mt-3 w-full min-w-0"
              :pt="{ root: { attrs: { id: generateUniqueId(`charter-details-accordion-${charter.id}`) } } }"
              @update:value="(v) => onAccordionChange(charter.id, v)"
            >
              <AccordionPanel
                :value="String(charter.id)"
                class="charter-details-panel min-w-0"
                :pt="{ root: { attrs: { id: generateUniqueId(`charter-details-panel-${charter.id}`) } } }"
              >
                <AccordionHeader
                  :pt="{ root: { attrs: { id: generateUniqueId(`charter-details-toggle-${charter.id}`) } } }"
                >
                  <span class="text-sm font-medium">
                    Goals, scope &amp; stakeholders
                    <span class="text-lab-general-text-muted font-normal">
                      ({{ charterDetailFieldCount(charter) }})
                    </span>
                  </span>
                </AccordionHeader>
                <AccordionContent
                  :pt="{ root: { attrs: { id: generateUniqueId(`charter-details-body-${charter.id}`) } } }"
                >
                  <div
                    class="catalog-details-inner"
                    :id="generateUniqueId(`charter-details-inner-${charter.id}`)"
                  >
                    <section
                      v-if="charter.goals"
                      class="lab-form-section lab-form-section--nested"
                      :id="generateUniqueId(`charter-goals-section-${charter.id}`)"
                    >
                      <h4
                        class="lab-form-section__title"
                        :id="generateUniqueId(`charter-goals-title-${charter.id}`)"
                      >
                        <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-bullseye" /></span>
                        Goals
                      </h4>
                      <p
                        class="catalog-detail-text m-0"
                        :id="generateUniqueId(`charter-goals-text-${charter.id}`)"
                      >
                        {{ charter.goals }}
                      </p>
                    </section>

                    <section
                      v-if="charter.scope"
                      class="lab-form-section lab-form-section--nested"
                      :id="generateUniqueId(`charter-scope-section-${charter.id}`)"
                    >
                      <h4
                        class="lab-form-section__title"
                        :id="generateUniqueId(`charter-scope-title-${charter.id}`)"
                      >
                        <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-check-square" /></span>
                        In scope
                      </h4>
                      <p
                        class="catalog-detail-text m-0"
                        :id="generateUniqueId(`charter-scope-text-${charter.id}`)"
                      >
                        {{ charter.scope }}
                      </p>
                    </section>

                    <section
                      v-if="charter.outOfScope"
                      class="lab-form-section lab-form-section--nested"
                      :id="generateUniqueId(`charter-out-scope-section-${charter.id}`)"
                    >
                      <h4
                        class="lab-form-section__title"
                        :id="generateUniqueId(`charter-out-scope-title-${charter.id}`)"
                      >
                        <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-minus-circle" /></span>
                        Out of scope
                      </h4>
                      <p
                        class="catalog-detail-text m-0"
                        :id="generateUniqueId(`charter-out-scope-text-${charter.id}`)"
                      >
                        {{ charter.outOfScope }}
                      </p>
                    </section>

                    <section
                      v-if="charter.stakeholders"
                      class="lab-form-section lab-form-section--nested"
                      :id="generateUniqueId(`charter-stakeholders-section-${charter.id}`)"
                    >
                      <h4
                        class="lab-form-section__title"
                        :id="generateUniqueId(`charter-stakeholders-title-${charter.id}`)"
                      >
                        <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-users" /></span>
                        Stakeholders
                      </h4>
                      <p
                        class="catalog-detail-text m-0"
                        :id="generateUniqueId(`charter-stakeholders-text-${charter.id}`)"
                      >
                        {{ charter.stakeholders }}
                      </p>
                    </section>
                  </div>
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
.charter-status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 80%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 92%, var(--lab-general-border));
  color: var(--lab-general-text-muted);
}

.charter-status-pill--active {
  border-color: color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 55%, var(--lab-general-border));
  color: var(--lab-general-text);
  background: color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 12%, var(--lab-general-bg));
}

.charter-status-pill--draft {
  border-style: dashed;
}

.charter-status-pill--complete {
  border-color: color-mix(in srgb, var(--lab-general-border) 65%, transparent);
  opacity: 0.92;
}

.charter-status-pill--on-hold {
  border-color: color-mix(in srgb, var(--lab-general-text-muted) 35%, var(--lab-general-border));
}
</style>
