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
import type { EventWithRsvps } from '../shared/types';
import { parseDueDateValue } from '@/shared/utils/calendar-date';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-event-rsvp';

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
const events = ref<EventWithRsvps[]>([]);

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    events.value = await api.listEvents(base.value);
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
  toast.add({ severity: 'success', summary: 'Event updated', life: 2500 });
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

function formatEventWhen(iso: string): string {
  if (!iso.trim()) {
    return 'No date';
  }
  const date = parseDueDateValue(iso);
  if (!date) {
    return iso;
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

onMounted(refresh);
</script>

<template>
  <div
    class="event-rsvp-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('rsvp-root')"
  >
    <header class="lab-app-header shrink-0" :id="generateUniqueId('rsvp-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('rsvp-title')">Event Invitations & RSVP</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Create events and collect RSVPs.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New event"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('rsvp-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button label="Refresh" icon="pi pi-refresh" size="small" severity="secondary" :loading="loading" :pt="{ root: { attrs: { id: generateUniqueId('rsvp-refresh') } } }" @click="reloadWorkspace" />
      </div>
    </header>

        <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="rsvp-reports"
    />

    <CatalogAppFormSection
      title="Events"
      lead="RSVP responses per event."
      icon="pi pi-calendar"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="rsvp-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('rsvp-error')">{{ error }}</p>
      <p v-else-if="!loading && events.length === 0" class="text-sm text-lab-general-text-muted m-0" :id="generateUniqueId('rsvp-empty')">
        No events yet — use “New event” to add one.
      </p>

      <ul v-else class="catalog-master-list" :id="generateUniqueId('rsvp-list')">
        <li v-for="ev in events" :key="ev.id" :id="generateUniqueId(`rsvp-event-wrap-${ev.id}`)">
          <section class="lab-form-section catalog-master-record" :id="generateUniqueId(`rsvp-event-${ev.id}`)">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <h2 class="text-lg font-semibold m-0" :id="generateUniqueId(`rsvp-event-title-${ev.id}`)">{{ ev.title }}</h2>
                <p class="text-xs text-lab-general-text-muted m-0 mt-0.5">
                  {{ formatEventWhen(ev.startsAt) }} · {{ ev.location || 'No location' }}
                  <template v-if="ev.capacity > 0"> · {{ ev.attending }}/{{ ev.capacity }} attending</template>
                  <template v-else> · {{ ev.attending }} attending</template>
                </p>
              </div>
              <div class="flex gap-1 shrink-0">
                <Button
                  label="RSVP"
                  icon="pi pi-user-plus"
                  size="small"
                  severity="secondary"
                  :pt="{ root: { attrs: { id: generateUniqueId(`rsvp-add-rsvp-${ev.id}`) } } }"
                  @click="integrationRef?.openEntityCreate('rsvp-response', { eventId: ev.id })"
                />
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'rsvp', 'edit', ev.id, ev.title)"
                  @click="integrationRef?.openPrimaryEdit(ev.id)"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'rsvp', 'delete', ev.id, ev.title)"
                  @click="integrationRef?.openPrimaryDelete(ev.id)"
                />
              </div>
            </div>

            <p
              v-if="ev.description"
              class="lab-form-section__lead m-0 mt-2"
              :id="generateUniqueId(`rsvp-event-desc-${ev.id}`)"
            >
              {{ ev.description }}
            </p>

            <Accordion
              :value="accordionValue(ev.id)"
              class="catalog-details-accordion mt-3 w-full min-w-0"
              :pt="{ root: { attrs: { id: generateUniqueId(`rsvp-rsvps-accordion-${ev.id}`) } } }"
              @update:value="(v) => onAccordionChange(ev.id, v)"
            >
              <AccordionPanel
                :value="String(ev.id)"
                class="min-w-0"
                :pt="{ root: { attrs: { id: generateUniqueId(`rsvp-rsvps-panel-${ev.id}`) } } }"
              >
                <AccordionHeader
                  :pt="{ root: { attrs: { id: generateUniqueId(`rsvp-rsvps-toggle-${ev.id}`) } } }"
                >
                  <span class="text-sm font-medium">
                    RSVPs
                    <span class="text-lab-general-text-muted font-normal">({{ ev.rsvps.length }})</span>
                  </span>
                </AccordionHeader>
                <AccordionContent
                  :pt="{ root: { attrs: { id: generateUniqueId(`rsvp-rsvps-body-${ev.id}`) } } }"
                >
                  <p
                    v-if="ev.rsvps.length === 0"
                    class="text-xs text-lab-general-text-muted m-0"
                    :id="generateUniqueId(`rsvp-rsvps-empty-${ev.id}`)"
                  >
                    No RSVPs yet.
                  </p>
                  <ul
                    v-else
                    class="catalog-accordion-item-list"
                    :id="generateUniqueId(`rsvp-rsvp-list-${ev.id}`)"
                  >
                    <li
                      v-for="r in ev.rsvps"
                      :key="r.id"
                      class="flex items-center gap-2 flex-wrap"
                      :id="generateUniqueId(`rsvp-item-${r.id}`)"
                    >
                      <span
                        class="text-xs px-2 py-0.5 rounded-full border w-14 capitalize border-lab-general-border text-lab-general-text-muted"
                        :id="generateUniqueId(`rsvp-response-${r.id}`)"
                      >
                        {{ r.response }}
                      </span>
                      <span class="flex-1 min-w-0 truncate">{{ r.guestName }}</span>
                      <span class="text-xs text-lab-general-text-muted w-20 text-right">{{ r.headcount }} guest(s)</span>
                      <Button
                        icon="pi pi-pencil"
                        size="small"
                        severity="secondary"
                        text
                        :pt="
                          labRecordActionButtonPt(
                            generateUniqueId,
                            'rsvp-response',
                            'edit',
                            r.id,
                            r.guestName,
                          )
                        "
                        @click="integrationRef?.openEntityEdit('rsvp-response', r.id, { eventId: ev.id })"
                      />
                      <Button
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        text
                        :pt="
                          labRecordActionButtonPt(
                            generateUniqueId,
                            'rsvp-response',
                            'delete',
                            r.id,
                            r.guestName,
                          )
                        "
                        @click="integrationRef?.openEntityDelete('rsvp-response', r.id, { eventId: ev.id })"
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
