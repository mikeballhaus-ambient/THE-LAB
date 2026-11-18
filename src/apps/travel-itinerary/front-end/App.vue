<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { TripWithItems } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-travel-itinerary';

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
const trips = ref<TripWithItems[]>([]);
/** Trip ids whose itinerary block is expanded (default: all collapsed). */
const expandedTripItemIds = ref<Set<number>>(new Set());
let lastIntegrationSuccessToastAt = 0;

function tripItemsAccordionValue(tripId: number): string | null {
  return expandedTripItemIds.value.has(tripId) ? String(tripId) : null;
}

function onTripItemsAccordionChange(tripId: number, value: string | string[] | null | undefined): void {
  const next = new Set(expandedTripItemIds.value);
  const open =
    value != null &&
    value !== '' &&
    (Array.isArray(value) ? value.includes(String(tripId)) : value === String(tripId));
  if (open) {
    next.add(tripId);
  } else {
    next.delete(tripId);
  }
  expandedTripItemIds.value = next;
}

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    trips.value = await api.listTrips(base.value);
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
  const now = Date.now();
  if (now - lastIntegrationSuccessToastAt < 500) {
    return;
  }
  lastIntegrationSuccessToastAt = now;
  toast.add({ severity: 'success', summary: 'Trip updated', life: 2500 });
}

function formatTripLead(trip: TripWithItems): string {
  const dest = trip.destination || 'No destination';
  if (trip.startDate || trip.endDate) {
    return `${dest} · ${trip.startDate || '?'} → ${trip.endDate || '?'}`;
  }
  return dest;
}

function itemCount(trip: TripWithItems): number {
  return (trip.items ?? []).length;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

onMounted(refresh);
</script>

<template>
  <div
    class="travel-itinerary-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('travel-root')"
  >
    <header class="lab-app-header shrink-0" :id="generateUniqueId('travel-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('travel-title')">Travel Itinerary</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Plan trips with flights, stays and activities.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New trip"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('travel-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('travel-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="travel-reports"
    />

    <CatalogAppFormSection
      title="Trips"
      lead="Trips and itinerary items from the demo catalog."
      icon="pi pi-map"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="travel-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('travel-error')">{{ error }}</p>
      <p
        v-else-if="!loading && trips.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('travel-empty')"
      >
        No trips yet — use “New trip” to add one.
      </p>

      <div v-else class="lab-form-section__children flex flex-col gap-4">
        <CatalogAppFormSection
          v-for="trip in trips"
          :key="trip.id"
          nested
          :title="trip.name"
          :lead="formatTripLead(trip)"
          icon="pi pi-suitcase"
          section-class="mb-0 min-w-0"
          :id-prefix="`travel-trip-${trip.id}`"
        >
          <div class="lab-form-section__children flex flex-col gap-3">
            <div class="flex flex-wrap items-center justify-end gap-2">
            <Button
              label="Add item"
              icon="pi pi-plus"
              size="small"
              severity="secondary"
              :pt="{ root: { attrs: { id: generateUniqueId(`travel-add-item-${trip.id}`) } } }"
              @click="integrationRef?.openEntityCreate('itinerary-item', { tripId: trip.id })"
            />
            <Button
              icon="pi pi-pencil"
              size="small"
              severity="secondary"
              text
              :pt="labRecordActionButtonPt(generateUniqueId, 'travel-trip', 'edit', trip.id, trip.name)"
              @click="integrationRef?.openPrimaryEdit(trip.id)"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              severity="danger"
              text
              :pt="labRecordActionButtonPt(generateUniqueId, 'travel-trip', 'delete', trip.id, trip.name)"
              @click="integrationRef?.openPrimaryDelete(trip.id)"
            />
          </div>

          <Accordion
            :value="tripItemsAccordionValue(trip.id)"
            class="travel-items-accordion mt-1 w-full min-w-0"
            :pt="{ root: { attrs: { id: generateUniqueId(`travel-items-accordion-${trip.id}`) } } }"
            @update:value="(v) => onTripItemsAccordionChange(trip.id, v)"
          >
            <AccordionPanel
              :value="String(trip.id)"
              class="travel-items-panel min-w-0"
              :pt="{ root: { attrs: { id: generateUniqueId(`travel-items-panel-${trip.id}`) } } }"
            >
              <AccordionHeader
                :pt="{ root: { attrs: { id: generateUniqueId(`travel-items-toggle-${trip.id}`) } } }"
              >
                <span class="text-sm font-medium">
                  Itinerary items
                  <span class="text-lab-general-text-muted font-normal">({{ itemCount(trip) }})</span>
                </span>
              </AccordionHeader>
              <AccordionContent
                :pt="{ root: { attrs: { id: generateUniqueId(`travel-items-body-${trip.id}`) } } }"
              >
                <p
                  v-if="itemCount(trip) === 0"
                  class="text-xs text-lab-general-text-muted m-0"
                  :id="generateUniqueId(`travel-items-empty-${trip.id}`)"
                >
                  No items yet — use Add item for flights, hotels, and activities.
                </p>
                <ul
                  v-else
                  class="catalog-accordion-item-list"
                  :id="generateUniqueId(`travel-item-list-${trip.id}`)"
                >
                  <li
                    v-for="item in trip.items ?? []"
                    :key="item.id"
                    class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
                    :id="generateUniqueId(`travel-item-${item.id}`)"
                  >
                    <span class="text-xs uppercase tracking-wide text-lab-general-text-muted w-20 shrink-0">{{
                      item.kind
                    }}</span>
                    <span class="flex-1 min-w-0 truncate text-sm">{{ item.title }}</span>
                    <span class="text-xs text-lab-general-text-muted truncate max-w-[12rem]">{{ item.location }}</span>
                    <span v-if="item.confirmation" class="text-xs text-lab-general-text-muted shrink-0"
                      >#{{ item.confirmation }}</span
                    >
                    <div class="flex shrink-0 items-center gap-1">
                      <Button
                        icon="pi pi-pencil"
                        size="small"
                        severity="secondary"
                        text
                        :pt="labRecordActionButtonPt(generateUniqueId, 'travel-item', 'edit', item.id, item.title)"
                        @click="integrationRef?.openEntityEdit('itinerary-item', item.id, { tripId: trip.id })"
                      />
                      <Button
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        text
                        :pt="labRecordActionButtonPt(generateUniqueId, 'travel-item', 'delete', item.id, item.title)"
                        @click="integrationRef?.openEntityDelete('itinerary-item', item.id, { tripId: trip.id })"
                      />
                    </div>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
          </div>
        </CatalogAppFormSection>
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
