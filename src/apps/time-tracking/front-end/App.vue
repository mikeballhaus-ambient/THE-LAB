<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useToast } from 'primevue/usetoast';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useCatalogSingleAccordion } from '@/shared/composables/catalog/useCatalogSingleAccordion';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import { formDatePickerPt, formSelectPt } from '@/shared/forms/form-control-pt';
import { formatCalendarDate } from '@/shared/utils/calendar-date';
import { demoCastNameForId } from '@/shared/config/demo-data-cast';
import type { TimeEntry, WeeklySummary } from '../shared/types';
import { readTimesheetApprovalStatus } from '../shared/utils/timesheet-approval-status';
import TimesheetApprovalStatusBadge from './components/TimesheetApprovalStatusBadge.vue';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-time-tracking';

/** Filter bar controls sit on a tinted strip — no filled field chrome. */
const timeFilterControlChrome =
  'text-sm! rounded-md! border! shadow-none! bg-transparent! border-[var(--lab-form-control-border,var(--lab-general-border))]! text-[var(--lab-general-text)]! ' +
  'enabled:hover:border-[var(--lab-button-border)]! focus:border-[var(--lab-button-border-hover)]! focus:outline-none!';

const timeFilterDatePickerPt = {
  ...formDatePickerPt,
  pcInputText: {
    root: {
      class: `w-full! px-2! py-1.5! ${timeFilterControlChrome}`,
    },
  },
};

const timeFilterSelectPt = {
  ...formSelectPt,
  root: {
    class: `w-full! ${timeFilterControlChrome}`,
  },
};

/** Stable accordion key per team member (`0` = unassigned). */
function userMasterKey(entry: TimeEntry): number {
  return entry.userId != null && entry.userId > 0 ? entry.userId : 0;
}

interface UserTimeLogGroup {
  masterKey: number;
  label: string;
  totalMinutes: number;
  entries: TimeEntry[];
}

interface Props {
  serverUrl?: string;
  appDescription?: string;
}
const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const { accordionValue, onAccordionChange } = useCatalogSingleAccordion();
const rangeFromInputId = generateUniqueId('time-range-from');
const rangeToInputId = generateUniqueId('time-range-to');
const userFilterSelectId = generateUniqueId('time-user-filter');
const toast = useToast();
const integrationRef = ref<InstanceType<typeof CatalogIntegrationHost> | null>(null);

const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

const loading = ref(false);
const error = ref<string | null>(null);
const entries = ref<TimeEntry[]>([]);
const summaries = ref<WeeklySummary[]>([]);
const activeTab = ref<'log' | 'summaries'>('log');
const rangeFrom = ref<Date | null>(null);
const rangeTo = ref<Date | null>(null);
const filterUserId = ref<number | null>(null);
function entryUserLabel(entry: TimeEntry): string {
  const name = entry.userName?.trim();
  if (name) {
    return name;
  }
  if (entry.userId != null && entry.userId > 0) {
    return demoCastNameForId(entry.userId) ?? `User ${entry.userId}`;
  }
  return 'Unassigned';
}

const userFilterOptions = computed(() => {
  const byId = new Map<number, string>();
  for (const entry of entries.value) {
    if (entry.userId == null || entry.userId <= 0) {
      continue;
    }
    if (!byId.has(entry.userId)) {
      byId.set(entry.userId, entryUserLabel(entry));
    }
  }
  return [...byId.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const filteredEntries = computed(() => {
  const from = rangeFrom.value ? formatCalendarDate(rangeFrom.value) : null;
  const to = rangeTo.value ? formatCalendarDate(rangeTo.value) : null;
  return entries.value.filter((entry) => {
    if (filterUserId.value != null && entry.userId !== filterUserId.value) {
      return false;
    }
    if (from && entry.date < from) {
      return false;
    }
    if (to && entry.date > to) {
      return false;
    }
    return true;
  });
});

const entryGroups = computed((): UserTimeLogGroup[] => {
  const byKey = new Map<number, TimeEntry[]>();
  for (const entry of filteredEntries.value) {
    const key = userMasterKey(entry);
    const bucket = byKey.get(key) ?? [];
    bucket.push(entry);
    byKey.set(key, bucket);
  }
  const groups: UserTimeLogGroup[] = [];
  for (const [masterKey, groupEntries] of byKey) {
    const sorted = [...groupEntries].sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      return byDate !== 0 ? byDate : b.id - a.id;
    });
    const label =
      masterKey === 0
        ? 'Unassigned'
        : sorted.length > 0
          ? entryUserLabel(sorted[0]!)
          : `User ${masterKey}`;
    groups.push({
      masterKey,
      label,
      totalMinutes: sorted.reduce((sum, row) => sum + row.minutes, 0),
      entries: sorted,
    });
  }
  return groups.sort((a, b) => a.label.localeCompare(b.label));
});

const filterActive = computed(
  () => rangeFrom.value != null || rangeTo.value != null || filterUserId.value != null,
);

function tabClasses(tab: 'log' | 'summaries'): string {
  const baseClasses = 'text-sm! px-3! py-2!';
  return activeTab.value === tab
    ? `${baseClasses} font-semibold! text-lab-general-text!`
    : `${baseClasses} text-lab-general-text-muted!`;
}

function clearDateRange(): void {
  rangeFrom.value = null;
  rangeTo.value = null;
  filterUserId.value = null;
}

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    [entries.value, summaries.value] = await Promise.all([
      api.listEntries(base.value),
      api.listSummaries(base.value),
    ]);
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
  toast.add({ severity: 'success', summary: 'Time entry updated', life: 2500 });
}

async function submit(weekKey: string): Promise<void> {
  try {
    const n = await api.submitWeek(base.value, weekKey);
    await reloadWorkspace();
    toast.add({
      severity: 'success',
      summary: `Submitted ${n} entr${n === 1 ? 'y' : 'ies'}`,
      detail: 'Manager approval is pending — refresh after they decide.',
      life: 4000,
    });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Submit failed', detail: msg(e), life: 5000 });
  }
}

function fmt(minutes: number): string {
  return `${(minutes / 60).toFixed(2)}h`;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

onMounted(refresh);
</script>

<template>
  <div
    class="time-tracking-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('time-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('time-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('time-title')">Time Tracking</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Log billable hours with weekly submit.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="Log time"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('time-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('time-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="time-reports"
    />

    <CatalogAppFormSection
      title="Workspace"
      lead="Time log entries and weekly submit."
      icon="pi pi-clock"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="time-main"
    >
      <div class="lab-form-section__children flex min-h-0 flex-1 flex-col gap-3 min-w-0">
      <Tabs
        v-model:value="activeTab"
        class="lab-platform-catalog-tabs time-tracking-workspace-tabs flex min-h-0 flex-1 flex-col"
        :pt="{ root: { attrs: { id: generateUniqueId('time-tabs') } } }"
      >
        <TabList pt:root="shrink-0! w-full!" pt:tabList="flex! gap-0! w-full!">
          <Tab value="log" :class="tabClasses('log')" :pt="{ root: { attrs: { id: generateUniqueId('time-tab-log') } } }">
            Time log
          </Tab>
          <Tab
            value="summaries"
            :class="tabClasses('summaries')"
            :pt="{ root: { attrs: { id: generateUniqueId('time-tab-summaries') } } }"
          >
            Weekly summaries
          </Tab>
        </TabList>

        <div
          v-show="activeTab === 'log'"
          class="time-tracking-filters shrink-0"
          :id="generateUniqueId('time-filter-bar')"
        >
          <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            <div class="flex items-center gap-2 min-w-0">
              <label
                class="text-xs font-medium text-lab-general-text-muted shrink-0 whitespace-nowrap"
                :id="generateUniqueId('time-range-from-label')"
                :for="rangeFromInputId"
              >
                From
              </label>
              <DatePicker
                v-model="rangeFrom"
                date-format="mm/dd/yy"
                show-icon
                icon-display="input"
                placeholder="Any date"
                class="min-w-[9.5rem]"
                :input-id="rangeFromInputId"
                :pt="timeFilterDatePickerPt"
              />
            </div>
            <div class="flex items-center gap-2 min-w-0">
              <label
                class="text-xs font-medium text-lab-general-text-muted shrink-0 whitespace-nowrap"
                :id="generateUniqueId('time-range-to-label')"
                :for="rangeToInputId"
              >
                To
              </label>
              <DatePicker
                v-model="rangeTo"
                date-format="mm/dd/yy"
                show-icon
                icon-display="input"
                placeholder="Any date"
                class="min-w-[9.5rem]"
                :input-id="rangeToInputId"
                :pt="timeFilterDatePickerPt"
              />
            </div>
            <div class="flex items-center gap-2 min-w-0">
              <label
                class="text-xs font-medium text-lab-general-text-muted shrink-0 whitespace-nowrap"
                :id="generateUniqueId('time-user-filter-label')"
                :for="userFilterSelectId"
              >
                Team member
              </label>
              <Select
                v-model="filterUserId"
                :options="userFilterOptions"
                option-label="label"
                option-value="value"
                show-clear
                placeholder="All members"
                class="min-w-[11rem] w-[12rem]"
                :input-id="userFilterSelectId"
                :pt="{
                  ...timeFilterSelectPt,
                  root: { class: timeFilterSelectPt.root.class, attrs: { id: userFilterSelectId } },
                }"
              />
            </div>
          </div>
          <div
            v-if="filterActive"
            class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 mt-2 pt-1.5 border-t border-lab-general-border/30"
          >
            <Button
              label="Clear filters"
              size="small"
              severity="secondary"
              text
              :pt="{ root: { attrs: { id: generateUniqueId('time-range-clear') } } }"
              @click="clearDateRange"
            />
            <p
              class="text-xs text-lab-general-text-muted m-0"
              :id="generateUniqueId('time-filter-count')"
            >
              {{ filteredEntries.length }} of {{ entries.length }} entries
            </p>
          </div>
        </div>

        <TabPanels pt:root="flex min-h-0 flex-1 flex-col mt-2!">
          <TabPanel value="log" class="min-h-0 flex-1 flex flex-col overflow-hidden">
            <div
              class="time-tracking-log-body flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-3"
              :id="generateUniqueId('time-log-scroll')"
            >

            <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('time-error')">{{ error }}</p>
            <p
              v-else-if="!loading && entries.length === 0"
              class="text-sm text-lab-general-text-muted m-0"
              :id="generateUniqueId('time-empty')"
            >
              No time logged yet.
            </p>
            <p
              v-else-if="!loading && filteredEntries.length === 0"
              class="text-sm text-lab-general-text-muted m-0"
              :id="generateUniqueId('time-filter-empty')"
            >
              No entries match the current filters.
            </p>

            <ul
              v-else
              class="time-tracking-user-list m-0 p-0 list-none"
              :id="generateUniqueId('time-entry-list')"
            >
              <li
                v-for="group in entryGroups"
                :key="group.masterKey"
                class="list-none m-0 p-0 ps-0"
                :id="generateUniqueId(`time-user-wrap-${group.masterKey}`)"
              >
                <Accordion
                  :value="accordionValue(group.masterKey)"
                  class="time-tracking-user-accordion w-full min-w-0"
                  :pt="{
                    root: {
                      attrs: { id: generateUniqueId(`time-user-accordion-${group.masterKey}`) },
                    },
                  }"
                  @update:value="(v) => onAccordionChange(group.masterKey, v)"
                >
                  <AccordionPanel
                    :value="String(group.masterKey)"
                    class="time-tracking-user-panel min-w-0"
                    :pt="{
                      root: {
                        class: 'time-tracking-user-panel',
                        attrs: { id: generateUniqueId(`time-user-panel-${group.masterKey}`) },
                      },
                    }"
                  >
                    <AccordionHeader
                      :pt="{
                        root: {
                          class: 'time-tracking-user-accordion-header items-center!',
                          attrs: { id: generateUniqueId(`time-user-toggle-${group.masterKey}`) },
                        },
                      }"
                    >
                      <span class="flex flex-1 min-w-0 items-center justify-between gap-3 w-full">
                        <span class="min-w-0 truncate text-sm font-medium text-lab-general-text-muted">
                          {{ group.label }}
                        </span>
                        <span
                          class="flex shrink-0 items-center gap-2 text-sm tabular-nums text-lab-general-text-muted"
                        >
                          <span class="font-semibold">{{ fmt(group.totalMinutes) }}</span>
                          <span
                            class="text-xs font-normal time-tracking-user-header__meta"
                          >
                            · {{ group.entries.length }}
                            entr{{ group.entries.length === 1 ? 'y' : 'ies' }}
                          </span>
                        </span>
                      </span>
                    </AccordionHeader>
                    <AccordionContent
                      :pt="{
                        root: { attrs: { id: generateUniqueId(`time-user-entries-${group.masterKey}`) } },
                      }"
                    >
                      <div class="time-tracking-table-wrap overflow-x-auto pb-1 pt-1">
                        <table
                          class="time-tracking-entry-table w-full text-sm border-collapse"
                          :id="generateUniqueId(`time-user-entry-table-${group.masterKey}`)"
                        >
                          <thead :id="generateUniqueId(`time-entry-thead-${group.masterKey}`)">
                            <tr
                              class="text-left text-xs text-lab-general-text-muted"
                              :id="generateUniqueId(`time-entry-head-row-${group.masterKey}`)"
                            >
                              <th
                                class="font-medium pe-3 align-middle"
                                scope="col"
                                :id="generateUniqueId(`time-th-date-${group.masterKey}`)"
                              >
                                Date
                              </th>
                              <th
                                class="font-medium pe-3 align-middle"
                                scope="col"
                                :id="generateUniqueId(`time-th-project-${group.masterKey}`)"
                              >
                                Project / task
                              </th>
                              <th
                                class="font-medium pe-3 align-middle"
                                scope="col"
                                :id="generateUniqueId(`time-th-week-${group.masterKey}`)"
                              >
                                Week
                              </th>
                              <th
                                class="font-medium pe-3 text-right align-middle"
                                scope="col"
                                :id="generateUniqueId(`time-th-hours-${group.masterKey}`)"
                              >
                                Hours
                              </th>
                              <th
                                class="font-medium pe-3 align-middle"
                                scope="col"
                                :id="generateUniqueId(`time-th-billable-${group.masterKey}`)"
                              >
                                Billable
                              </th>
                              <th
                                class="font-medium pe-3 align-middle"
                                scope="col"
                                :id="generateUniqueId(`time-th-status-${group.masterKey}`)"
                              >
                                Status
                              </th>
                              <th
                                class="font-medium text-right align-middle"
                                scope="col"
                                :id="generateUniqueId(`time-th-actions-${group.masterKey}`)"
                              >
                                <span class="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody :id="generateUniqueId(`time-entry-tbody-${group.masterKey}`)">
                            <tr
                              v-for="entry in group.entries"
                              :key="entry.id"
                              class="time-tracking-entry-table__row"
                              :id="generateUniqueId(`time-entry-row-${entry.id}`)"
                            >
                              <td
                                class="py-1.5 pe-3 whitespace-nowrap text-lab-general-text-muted"
                                :id="generateUniqueId(`time-entry-date-${entry.id}`)"
                              >
                                {{ entry.date }}
                              </td>
                              <td
                                class="py-1.5 pe-3 min-w-[10rem]"
                                :id="generateUniqueId(`time-entry-project-${entry.id}`)"
                              >
                                <span class="block truncate">{{ entry.project }}</span>
                                <span
                                  v-if="entry.task"
                                  class="block truncate text-xs text-lab-general-text-muted"
                                >
                                  {{ entry.task }}
                                </span>
                              </td>
                              <td
                                class="py-1.5 pe-3 whitespace-nowrap text-lab-general-text-muted"
                                :id="generateUniqueId(`time-entry-week-${entry.id}`)"
                              >
                                {{ entry.weekKey || '—' }}
                              </td>
                              <td
                                class="py-1.5 pe-3 text-right tabular-nums whitespace-nowrap"
                                :id="generateUniqueId(`time-entry-hours-${entry.id}`)"
                              >
                                {{ fmt(entry.minutes) }}
                              </td>
                              <td
                                class="py-1.5 pe-3 capitalize whitespace-nowrap"
                                :id="generateUniqueId(`time-entry-billable-${entry.id}`)"
                              >
                                {{ entry.billable ? 'Yes' : 'No' }}
                              </td>
                              <td
                                class="py-1.5 pe-3 capitalize whitespace-nowrap"
                                :id="generateUniqueId(`time-entry-status-${entry.id}`)"
                              >
                                {{ entry.status }}
                              </td>
                              <td
                                class="py-1.5 text-right whitespace-nowrap"
                                :id="generateUniqueId(`time-entry-actions-${entry.id}`)"
                              >
                                <div class="inline-flex gap-0.5">
                                  <Button
                                    icon="pi pi-pencil"
                                    size="small"
                                    severity="secondary"
                                    text
                                    :pt="
                                      labRecordActionButtonPt(
                                        generateUniqueId,
                                        'time-entry',
                                        'edit',
                                        entry.id,
                                        entry.project,
                                      )
                                    "
                                    @click="integrationRef?.openPrimaryEdit(entry.id)"
                                  />
                                  <Button
                                    icon="pi pi-trash"
                                    size="small"
                                    severity="danger"
                                    text
                                    :pt="
                                      labRecordActionButtonPt(
                                        generateUniqueId,
                                        'time-entry',
                                        'delete',
                                        entry.id,
                                        entry.project,
                                      )
                                    "
                                    @click="integrationRef?.openPrimaryDelete(entry.id)"
                                  />
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </AccordionContent>
                  </AccordionPanel>
                </Accordion>
              </li>
            </ul>
            </div>
          </TabPanel>

          <TabPanel value="summaries" class="min-h-0 flex-1 w-full min-w-0 overflow-x-hidden overflow-y-auto">
            <div class="time-tracking-summaries-body">
            <p
              v-if="summaries.length === 0"
              class="text-sm text-lab-general-text-muted m-0"
              :id="generateUniqueId('time-summaries-empty')"
            >
              No weeks yet.
            </p>
            <div
              v-else
              class="time-tracking-summary-grid"
              :id="generateUniqueId('time-summary-grid')"
            >
              <section
                v-for="s in summaries"
                :key="s.weekKey"
                class="lab-form-section lab-form-section--nested time-tracking-summary-card flex flex-col gap-3"
                :id="generateUniqueId(`time-summary-${s.weekKey}`)"
              >
                <div class="time-tracking-summary-card__header flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h4
                      class="time-tracking-summary-card__title m-0"
                      :id="generateUniqueId(`time-summary-title-${s.weekKey}`)"
                    >
                      {{ s.weekKey }}
                    </h4>
                    <p class="text-xs text-lab-general-text-muted m-0 mt-1">
                      {{ s.entryCount }} entr{{ s.entryCount === 1 ? 'y' : 'ies' }}
                    </p>
                  </div>
                  <TimesheetApprovalStatusBadge
                    v-if="readTimesheetApprovalStatus(s)"
                    :status="readTimesheetApprovalStatus(s)!"
                  />
                  <span
                    v-else
                    class="text-xs capitalize px-2.5 py-1 rounded-full border border-lab-general-border shrink-0"
                    :class="{ 'border-lab-button-border-hover text-lab-general-text': s.submitted }"
                  >
                    {{ s.submitted ? 'Submitted' : 'Draft' }}
                  </span>
                </div>
                <dl class="time-tracking-summary-card__stats m-0">
                  <div>
                    <dt class="text-xs text-lab-general-text-muted">Total hours</dt>
                    <dd class="text-lg font-semibold m-0 tabular-nums">{{ fmt(s.totalMinutes) }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-lab-general-text-muted">Billable</dt>
                    <dd class="text-lg font-semibold m-0 tabular-nums">{{ fmt(s.billableMinutes) }}</dd>
                  </div>
                </dl>
                <div class="time-tracking-summary-card__actions flex justify-end min-h-[2.25rem]">
                  <Button
                    v-if="!s.submitted"
                    label="Submit week"
                    size="small"
                    :pt="{ root: { attrs: { id: generateUniqueId(`time-submit-${s.weekKey}`) } } }"
                    @click="submit(s.weekKey)"
                  />
                </div>
              </section>
            </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
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
.time-tracking-app :deep(.catalog-app-workspace-section.lab-form-section) {
  overflow-x: clip;
}

.time-tracking-workspace-tabs :deep(.p-tabpanels),
.time-tracking-workspace-tabs :deep(.p-tabpanel) {
  padding-inline: 0;
}

.time-tracking-workspace-tabs :deep(.p-tabpanels) {
  flex: 1 1 0%;
  min-height: 0;
}

.time-tracking-filters {
  box-sizing: border-box;
  width: calc(100% + 1.5rem);
  max-width: none;
  margin-inline: -0.75rem;
  padding: 0.35rem 0.75rem 0.5rem;
  background: transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 18%, transparent);
}

.time-tracking-filters :deep(.p-inputtext),
.time-tracking-filters :deep(.p-select) {
  background: transparent !important;
}

.time-tracking-log-body {
  box-sizing: border-box;
  width: calc(100% + 1.5rem);
  max-width: none;
  margin-inline: -0.75rem;
  padding-inline: 0.75rem;
  min-width: 0;
}

.time-tracking-user-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
  margin: 0;
  padding: 0 10px !important;
}

.time-tracking-app :deep(.time-tracking-user-accordion.p-accordion),
.time-tracking-app :deep(.time-tracking-user-accordion) {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.time-tracking-summaries-body {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 18px 18px 0 18px;
}

.time-tracking-summary-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  align-content: flex-start;
  gap: 0.75rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
}

.time-tracking-summary-card.lab-form-section--nested {
  margin: 0;
  flex: 1 1 14rem;
  max-width: 100%;
  min-width: 0;
  padding: 1rem !important;
  box-sizing: border-box;
}

.time-tracking-summary-card__header {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.time-tracking-summary-card__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--lab-general-text);
}

.time-tracking-summary-card__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.5rem;
  flex: 1 1 auto;
}

.time-tracking-app :deep(.time-tracking-user-accordion .p-accordionpanel),
.time-tracking-app :deep(.time-tracking-user-panel.p-accordionpanel),
.time-tracking-app :deep(.time-tracking-user-panel) {
  background: color-mix(in srgb, var(--lab-general-border) 20%, var(--lab-general-bg)) !important;
  border: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 22%, transparent) !important;
  border-radius: 0.45rem !important;
  box-shadow: none !important;
  overflow: hidden;
  margin: 0;
}

.time-tracking-app :deep(.time-tracking-user-accordion .p-accordionpanel + .p-accordionpanel),
.time-tracking-app :deep(.time-tracking-user-panel + .time-tracking-user-panel) {
  margin-top: 0;
}

.time-tracking-app :deep(.time-tracking-user-accordion .p-accordionheader),
.time-tracking-app :deep(.time-tracking-user-accordion-header.p-accordionheader) {
  display: flex !important;
  align-items: center !important;
  background: color-mix(in srgb, var(--lab-general-border) 12%, var(--lab-general-bg)) !important;
  color: var(--lab-general-text-muted);
  padding: 0.65rem 0.9rem !important;
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 20%, transparent);
  justify-content: space-between;
  gap: 0.5rem;
}

.time-tracking-app :deep(.time-tracking-user-accordion .p-accordionheader-toggle-icon),
.time-tracking-app :deep(.time-tracking-user-accordion .p-accordionheader [data-pc-section='toggleicon']) {
  align-self: center;
  margin-top: 0;
}

.time-tracking-app :deep(.time-tracking-user-accordion .p-accordionpanel:not([data-p-active='true']) .p-accordionheader) {
  border-bottom: none;
}

.time-tracking-user-header__meta {
  color: color-mix(in srgb, var(--lab-general-text-muted) 72%, transparent);
}

.time-tracking-app :deep(.time-tracking-user-accordion .p-accordioncontent-content) {
  background: color-mix(in srgb, var(--lab-general-border) 16%, var(--lab-general-bg)) !important;
  padding: 0.7rem 0.95rem 0.9rem;
  border-top: none;
}

.time-tracking-entry-table thead tr {
  background: color-mix(in srgb, var(--lab-general-border) 12%, var(--lab-general-bg));
  border-bottom: 1px solid
    color-mix(in srgb, var(--lab-general-text-muted) 28%, transparent);
}

.time-tracking-entry-table thead th {
  vertical-align: middle;
  padding: 0.6rem 0.75rem 0.6rem 0;
  line-height: 1.25;
}

.time-tracking-entry-table tbody td {
  vertical-align: middle;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 22%, transparent);
}

.time-tracking-entry-table tbody tr:first-child td {
  border-top: none;
}

.time-tracking-workspace-tabs :deep(.p-tabpanel[data-p-active='true']) {
  background: transparent;
}

.time-tracking-entry-table__row:hover {
  background: color-mix(in srgb, var(--lab-general-border) 12%, transparent);
}
</style>
