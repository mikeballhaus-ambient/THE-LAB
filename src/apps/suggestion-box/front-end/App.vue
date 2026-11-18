<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { Suggestion, SuggestionStatus } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-suggestion-box';

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
const suggestions = ref<Suggestion[]>([]);

const statusOptions: { label: string; value: SuggestionStatus }[] = [
  { label: 'Open', value: 'open' },
  { label: 'Planned', value: 'planned' },
  { label: 'In progress', value: 'in-progress' },
  { label: 'Done', value: 'done' },
  { label: 'Declined', value: 'declined' },
];

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    suggestions.value = await api.listSuggestions(base.value);
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
  toast.add({ severity: 'success', summary: 'Suggestion updated', life: 2500 });
}

async function vote(s: Suggestion, delta: number): Promise<void> {
  try {
    await api.voteSuggestion(base.value, s.id, delta);
    await reloadWorkspace();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Vote failed', detail: msg(e), life: 5000 });
  }
}

function statusLabel(status: SuggestionStatus): string {
  return statusOptions.find((o) => o.value === status)?.label ?? status;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

onMounted(refresh);
</script>

<template>
  <div
    class="suggestion-box-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('suggestion-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('suggestion-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('suggestion-title')">Suggestion Box</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Collect and upvote team suggestions.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New suggestion"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('suggestion-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('suggestion-refresh') } } }"
          @click="reloadWorkspace()"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="suggestion-reports"
    />

    <CatalogAppFormSection
      title="Suggestions"
      lead="Votes and promotion workflow."
      icon="pi pi-comments"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="suggestion-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('suggestion-error')">{{ error }}</p>
      <p
        v-else-if="!loading && suggestions.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('suggestion-empty')"
      >
        No suggestions yet — use “New suggestion” to add one.
      </p>

      <ul v-else class="catalog-master-list" :id="generateUniqueId('suggestion-list')">
        <li v-for="s in suggestions" :key="s.id" :id="generateUniqueId(`suggestion-wrap-${s.id}`)">
          <section
            class="lab-form-section catalog-master-record flex items-start gap-3"
            :id="generateUniqueId(`suggestion-item-${s.id}`)"
          >
            <div class="flex flex-col items-center shrink-0">
              <Button
                icon="pi pi-chevron-up"
                size="small"
                text
                :pt="{ root: { attrs: { id: generateUniqueId(`suggestion-up-${s.id}`) } } }"
                @click="vote(s, 1)"
              />
              <span class="text-sm font-semibold">{{ s.votes }}</span>
              <Button
                icon="pi pi-chevron-down"
                size="small"
                text
                :pt="{ root: { attrs: { id: generateUniqueId(`suggestion-down-${s.id}`) } } }"
                @click="vote(s, -1)"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-base font-semibold m-0" :id="generateUniqueId(`suggestion-item-title-${s.id}`)">
                {{ s.title }}
              </h2>
              <p v-if="s.body" class="text-sm catalog-detail-text m-0 mt-1">{{ s.body }}</p>
              <p class="text-xs text-lab-general-text-muted m-0 mt-1">
                {{ s.author || 'Anonymous' }} · {{ statusLabel(s.status) }}
              </p>
            </div>
            <div class="flex gap-1 shrink-0">
              <Button
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                text
                :pt="labRecordActionButtonPt(generateUniqueId, 'suggestion', 'edit', s.id, s.title)"
                @click="integrationRef?.openPrimaryEdit(s.id)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                :pt="labRecordActionButtonPt(generateUniqueId, 'suggestion', 'delete', s.id, s.title)"
                @click="integrationRef?.openPrimaryDelete(s.id)"
              />
            </div>
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
