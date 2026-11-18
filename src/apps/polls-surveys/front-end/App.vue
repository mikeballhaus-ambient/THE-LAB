<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ProgressBar from 'primevue/progressbar';
import { useToast } from 'primevue/usetoast';
import { useCatalogSingleAccordion } from '@/shared/composables/catalog/useCatalogSingleAccordion';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useCatalogPrimaryRecordDeepLink } from '@/shared/composables/catalog/useCatalogPrimaryRecordDeepLink';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { PollWithResults } from '../shared/types';
import * as api from './api';
import { logNotificationDeepLink } from '@/shared/utils/lab-notification-deeplink-debug';
import {
  labRecordActionButtonPt,
  labRecordRowContainerAttrs,
} from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-polls-surveys';

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
const polls = ref<PollWithResults[]>([]);

const voter = ref('');

/** Set when the user opens the app from a bell CTA (Vote now); hides reports and other polls. */
const notificationFocusPollId = ref<number | null>(null);

const isNotificationFocusView = computed(() => notificationFocusPollId.value != null);

const displayedPolls = computed(() => {
  const focusId = notificationFocusPollId.value;
  if (focusId == null) {
    return polls.value;
  }
  return polls.value.filter((row) => row.id === focusId);
});

function clearNotificationFocus(): void {
  notificationFocusPollId.value = null;
}

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    polls.value = await api.listPolls(base.value, voter.value);
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

useCatalogPrimaryRecordDeepLink({
  records: polls,
  onFocusRecord: (recordId) => onAccordionChange(recordId, String(recordId)),
  onDeepLink: (recordId) => {
    notificationFocusPollId.value = recordId;
    logNotificationDeepLink('polls: notification focus mode', { recordId });
  },
});

async function onIntegrationSuccess(): Promise<void> {
  await reloadWorkspace();
  toast.add({ severity: 'success', summary: 'Poll updated', life: 2500 });
}

async function vote(pollId: number, optionId: number): Promise<void> {
  try {
    await api.castVote(base.value, pollId, optionId, voter.value);
    await reloadWorkspace();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Vote failed', detail: msg(e), life: 5000 });
  }
}

async function toggleOpen(poll: PollWithResults): Promise<void> {
  try {
    await api.setPollStatus(base.value, poll.id, poll.status === 'open' ? 'closed' : 'open');
    await reloadWorkspace();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Update failed', detail: msg(e), life: 5000 });
  }
}

function pct(votes: number, total: number): number {
  return total > 0 ? Math.round((votes / total) * 100) : 0;
}

function voteDisabled(poll: PollWithResults): boolean {
  if (poll.status !== 'open') {
    return true;
  }
  if (!poll.allowMultipleVotes && poll.viewerHasVoted) {
    return true;
  }
  return false;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

onMounted(refresh);
</script>

<template>
  <div
    class="polls-surveys-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('polls-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('polls-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('polls-title')">Polls & Surveys</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Create polls and collect votes.' }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <InputText
          v-model="voter"
          placeholder="Your name (optional)"
          :pt="{ root: { attrs: { id: generateUniqueId('polls-f-voter') } } }"
        />
        <Button
          v-if="isNotificationFocusView"
          label="All polls"
          icon="pi pi-list"
          size="small"
          severity="secondary"
          :pt="{ root: { attrs: { id: generateUniqueId('polls-show-all') } } }"
          @click="clearNotificationFocus"
        />
        <Button
          v-else
          label="New poll"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('polls-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('polls-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      v-if="!isNotificationFocusView"
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="polls-reports"
    />

    <CatalogAppFormSection
      :title="isNotificationFocusView ? 'Vote' : 'Polls'"
      :lead="
        isNotificationFocusView
          ? 'This poll was shared with you — cast your vote below.'
          : 'Options, votes, and poll status.'
      "
      icon="pi pi-chart-pie"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="polls-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('polls-error')">{{ error }}</p>
      <p
        v-else-if="!loading && isNotificationFocusView && displayedPolls.length === 0"
        class="text-sm text-lab-general-text-muted m-0 flex flex-wrap items-center gap-2"
        :id="generateUniqueId('polls-focus-missing')"
      >
        That poll is no longer available.
        <Button
          label="All polls"
          size="small"
          severity="secondary"
          :pt="{ root: { attrs: { id: generateUniqueId('polls-focus-missing-all') } } }"
          @click="clearNotificationFocus"
        />
      </p>
      <p
        v-else-if="!loading && !isNotificationFocusView && polls.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('polls-empty')"
      >
        No polls yet — use “New poll” to add one.
      </p>

      <ul v-else class="catalog-master-list" :id="generateUniqueId('polls-list')">
        <li
          v-for="poll in displayedPolls"
          :key="poll.id"
          :id="generateUniqueId(`polls-wrap-${poll.id}`)"
          v-bind="labRecordRowContainerAttrs(poll.id, poll.question)"
        >
          <section class="lab-form-section catalog-master-record" :id="generateUniqueId(`polls-item-${poll.id}`)">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <h2 class="text-lg font-semibold m-0" :id="generateUniqueId(`polls-q-${poll.id}`)">{{ poll.question }}</h2>
                <p class="text-xs text-lab-general-text-muted m-0 mt-0.5 capitalize">
                  {{ poll.totalVotes }} vote(s) · {{ poll.status }}
                  <span v-if="!poll.allowMultipleVotes"> · one vote per person</span>
                </p>
              </div>
              <div class="flex gap-1 shrink-0 flex-wrap">
                <template v-if="!isNotificationFocusView">
                  <Button
                    :label="poll.status === 'open' ? 'Close' : 'Reopen'"
                    size="small"
                    severity="secondary"
                    :pt="{ root: { attrs: { id: generateUniqueId(`polls-toggle-${poll.id}`) } } }"
                    @click="toggleOpen(poll)"
                  />
                  <Button
                    label="Option"
                    icon="pi pi-plus"
                    size="small"
                    severity="secondary"
                    :pt="{ root: { attrs: { id: generateUniqueId(`polls-add-option-${poll.id}`) } } }"
                    @click="integrationRef?.openEntityCreate('poll-option', { pollId: poll.id })"
                  />
                  <Button
                    icon="pi pi-pencil"
                    size="small"
                    severity="secondary"
                    text
                    :pt="labRecordActionButtonPt(generateUniqueId, 'polls', 'edit', poll.id, poll.question)"
                    @click="integrationRef?.openPrimaryEdit(poll.id)"
                  />
                  <Button
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    text
                    :pt="labRecordActionButtonPt(generateUniqueId, 'polls', 'delete', poll.id, poll.question)"
                    @click="integrationRef?.openPrimaryDelete(poll.id)"
                  />
                </template>
              </div>
            </div>

            <Accordion
              :value="accordionValue(poll.id)"
              class="catalog-details-accordion mt-3 w-full min-w-0"
              :pt="{ root: { attrs: { id: generateUniqueId(`polls-options-accordion-${poll.id}`) } } }"
              @update:value="(v) => onAccordionChange(poll.id, v)"
            >
              <AccordionPanel
                :value="String(poll.id)"
                class="min-w-0"
                :pt="{ root: { attrs: { id: generateUniqueId(`polls-options-panel-${poll.id}`) } } }"
              >
                <AccordionHeader
                  :pt="{ root: { attrs: { id: generateUniqueId(`polls-options-toggle-${poll.id}`) } } }"
                >
                  <span class="text-sm font-medium">
                    Options & results
                    <span class="text-lab-general-text-muted font-normal">({{ poll.options.length }})</span>
                  </span>
                </AccordionHeader>
                <AccordionContent
                  :pt="{ root: { attrs: { id: generateUniqueId(`polls-options-body-${poll.id}`) } } }"
                >
                  <p
                    v-if="poll.options.length === 0"
                    class="text-xs text-lab-general-text-muted m-0"
                    :id="generateUniqueId(`polls-options-empty-${poll.id}`)"
                  >
                    No options yet.
                  </p>
                  <ul
                    v-else
                    class="catalog-accordion-item-list"
                    :id="generateUniqueId(`polls-options-${poll.id}`)"
                  >
                    <li
                      v-for="opt in poll.options"
                      :key="opt.id"
                      class="flex flex-col gap-1"
                      :id="generateUniqueId(`polls-opt-${opt.id}`)"
                    >
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="flex-1 min-w-0 truncate">{{ opt.label }}</span>
                        <span class="text-xs text-lab-general-text-muted w-24 text-right shrink-0">
                          {{ opt.votes }} · {{ pct(opt.votes, poll.totalVotes) }}%
                        </span>
                        <Button
                          label="Vote"
                          size="small"
                          :disabled="voteDisabled(poll)"
                          :pt="{ root: { attrs: { id: generateUniqueId(`polls-vote-${opt.id}`) } } }"
                          @click="vote(poll.id, opt.id)"
                        />
                        <template v-if="!isNotificationFocusView">
                          <Button
                            icon="pi pi-pencil"
                            size="small"
                            severity="secondary"
                            text
                            :pt="labRecordActionButtonPt(generateUniqueId, 'polls-option', 'edit', opt.id, opt.label)"
                            @click="integrationRef?.openEntityEdit('poll-option', opt.id, { pollId: poll.id })"
                          />
                          <Button
                            icon="pi pi-trash"
                            size="small"
                            severity="danger"
                            text
                            :pt="labRecordActionButtonPt(generateUniqueId, 'polls-option', 'delete', opt.id, opt.label)"
                            @click="integrationRef?.openEntityDelete('poll-option', opt.id, { pollId: poll.id })"
                          />
                        </template>
                      </div>
                      <ProgressBar
                        :value="pct(opt.votes, poll.totalVotes)"
                        :show-value="false"
                        class="polls-option-progress"
                        :pt="{
                          root: {
                            class: 'polls-option-progress__track',
                            attrs: { id: generateUniqueId(`polls-bar-${opt.id}`) },
                          },
                          value: { class: 'polls-option-progress__value' },
                        }"
                      />
                    </li>
                  </ul>
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
/* Vote bars: visible empty track on zebra rows + theme accent on fill and track edge. */
:global(.polls-surveys-app .polls-option-progress__track) {
  --polls-progress-accent: var(--lab-section-accent, var(--lab-button-border-hover, var(--lab-button-bg)));
  background: color-mix(
    in srgb,
    var(--polls-progress-accent) 12%,
    color-mix(in srgb, var(--lab-general-border) 52%, var(--lab-general-bg))
  ) !important;
  border-color: color-mix(in srgb, var(--polls-progress-accent) 38%, var(--lab-general-border)) !important;
  min-height: 0.45rem;
}

:global(.polls-surveys-app .polls-option-progress__value) {
  background: var(--polls-progress-accent, var(--lab-button-border-hover, var(--lab-button-bg))) !important;
}
</style>
