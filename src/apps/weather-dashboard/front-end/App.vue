<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useCatalogHostLiveRefresh } from '@/shared/composables/catalog/useCatalogHostLiveRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogIntegrationHost } from '@/shared/integration';
import type {
  LocationLiveConditions,
  UsCityOption,
  WeatherLocation,
} from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import WeatherMapPanel from './components/WeatherMapPanel.vue';
import CityPickerDialog from './components/CityPickerDialog.vue';
import LocationForecastDialog from './components/LocationForecastDialog.vue';
import WeatherIcon from './components/WeatherIcon.vue';
import { formatTempF, formatWindMph } from './utils/temperature';

const HOST_APP_ID = 'app-weather-dashboard';
/** Live conditions are cached server-side for 5 minutes; poll just inside that window. */
const LIVE_REFRESH_MS = 5 * 60_000;

interface Props {
  serverUrl?: string;
  appDescription?: string;
}
const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const integrationRef = ref<InstanceType<typeof CatalogIntegrationHost> | null>(null);
const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

useCatalogHostLiveRefresh({
  hostAppId: HOST_APP_ID,
  serverUrl: () => base.value,
  onRefresh: () => refresh(),
});
const loading = ref(false);
const liveLoading = ref(false);
const error = ref<string | null>(null);
const locations = ref<WeatherLocation[]>([]);
const live = ref<Record<string, LocationLiveConditions>>({});
const states = ref<Array<{ code: string; name: string }>>([]);

/**
 * The city picker is a deliberate intermediary step. Users cannot know a city's lat/lon, so
 * both create and edit route through it; the resolved coordinates are then handed to the Forms
 * Builder location binding as preset values.
 */
const pickerVisible = ref(false);
const pickerMode = ref<'create' | 'edit'>('create');
const pickerInitialState = ref<string | undefined>(undefined);
const pickerInitialCity = ref<string | undefined>(undefined);
const pickerTargetId = ref<number | null>(null);
const openingForm = ref(false);

/** Per-card multi-day outlook. */
const forecastVisible = ref(false);
const forecastLocationId = ref<number | null>(null);
const forecastLocationName = ref<string | undefined>(undefined);

function openForecast(loc: WeatherLocation): void {
  forecastLocationId.value = loc.id;
  forecastLocationName.value = loc.name;
  forecastVisible.value = true;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

async function loadLiveConditions(): Promise<void> {
  if (!base.value) return;
  liveLoading.value = true;
  try {
    const response = await api.fetchLiveConditions(base.value);
    live.value = response.conditions;
  } catch {
    // Leave the previous snapshot in place rather than blanking the cards on a blip.
  } finally {
    liveLoading.value = false;
  }
}

async function loadMapConfig(): Promise<void> {
  if (!base.value) return;
  try {
    const config = await api.fetchMapConfig(base.value);
    states.value = config.states ?? [];
  } catch {
    states.value = [];
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
    locations.value = await api.listLocations(base.value);
    await loadLiveConditions();
  } catch (e) {
    error.value = msg(e);
  } finally {
    loading.value = false;
  }
}

/** Split a saved `"City, ST"` name so edit can pre-fill the picker. */
function splitName(name: string): { city: string; state?: string } {
  const match = name.match(/^(.*),\s*([A-Z]{2})$/);
  if (!match) {
    return { city: name };
  }
  return { city: match[1].trim(), state: match[2] };
}

function openCreatePicker(): void {
  pickerMode.value = 'create';
  pickerTargetId.value = null;
  pickerInitialCity.value = undefined;
  pickerInitialState.value = undefined;
  pickerVisible.value = true;
}

function openEditPicker(loc: WeatherLocation): void {
  const { city, state } = splitName(loc.name);
  pickerMode.value = 'edit';
  pickerTargetId.value = loc.id;
  pickerInitialCity.value = city;
  pickerInitialState.value = state;
  pickerVisible.value = true;
}

/**
 * Hand the resolved city to the real location binding.
 *
 * `name`/`latitude`/`longitude` are form field names, so they go through `setPresetValues`
 * rather than the id-scoped integration context.
 */
function onCityChosen(city: UsCityOption): void {
  const host = integrationRef.value;
  if (!host) {
    toast.add({
      severity: 'error',
      summary: 'Location form unavailable',
      detail: 'The integrations surface is still loading. Try again in a moment.',
      life: 4000,
    });
    return;
  }
  openingForm.value = true;
  try {
    pickerVisible.value = false;
    const preset = {
      name: city.label,
      latitude: city.latitude,
      longitude: city.longitude,
    };
    host.setPresetValues(preset);
    if (pickerMode.value === 'edit' && pickerTargetId.value != null) {
      host.openPrimaryEdit(pickerTargetId.value, preset);
    } else {
      host.openPrimaryCreate(preset);
    }
  } finally {
    openingForm.value = false;
  }
}

async function onIntegrationSuccess(): Promise<void> {
  await refresh();
  toast.add({ severity: 'success', summary: 'Location saved', life: 2500 });
}

let liveTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.all([refresh(), loadMapConfig()]);
  liveTimer = setInterval(() => void loadLiveConditions(), LIVE_REFRESH_MS);
});

onUnmounted(() => {
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = null;
});
</script>

<template>
  <div
    class="weather-dashboard-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('weather-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('weather-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('weather-title')">Weather Dashboard</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Current conditions for saved locations.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New location"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('weather-new') } } }"
          @click="openCreatePicker"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading || liveLoading"
          :pt="{ root: { attrs: { id: generateUniqueId('weather-refresh') } } }"
          @click="refresh"
        />
      </div>
    </header>

    <CatalogAppFormSection
      title="Dashboard"
      lead="Live map and saved locations with current conditions."
      icon="pi pi-sun"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 flex flex-col gap-4 mb-0"
      id-prefix="weather-main"
    >
      <div
        class="lab-form-section__children grid gap-4 grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] min-h-0"
        :id="generateUniqueId('weather-workspace')"
      >
        <CatalogAppFormSection
          nested
          title="Map"
          lead="Pins for each saved location."
          icon="pi pi-map"
          section-class="min-h-0 mb-0"
          id-prefix="weather-map"
        >
          <WeatherMapPanel :server-url="props.serverUrl" :locations="locations" :live="live" />
        </CatalogAppFormSection>

        <CatalogAppFormSection
          nested
          title="Saved locations"
          lead="Edit, delete, or open the 7-day forecast."
          icon="pi pi-map-marker"
          section-class="weather-locations flex flex-col gap-2 min-h-0 mb-0 max-h-[34rem]"
          id-prefix="weather-locations"
        >
          <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('weather-error')">{{ error }}</p>
          <p
            v-else-if="!loading && locations.length === 0"
            class="text-sm text-lab-general-text-muted m-0"
            :id="generateUniqueId('weather-empty')"
          >
            No saved locations yet — use “New location” to add one.
          </p>

          <div
            class="flex flex-col gap-2 min-h-0 overflow-y-auto pr-1"
            :id="generateUniqueId('weather-list')"
          >
            <article
              v-for="loc in locations"
              :key="loc.id"
              class="weather-card flex flex-col gap-2"
              :id="generateUniqueId(`weather-loc-${loc.id}`)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-base font-semibold m-0 truncate" :id="generateUniqueId(`weather-loc-title-${loc.id}`)">{{ loc.name }}</h3>
                  <p class="text-xs text-lab-general-text-muted m-0">{{ loc.latitude }}, {{ loc.longitude }}</p>
                </div>
                <div class="flex gap-1 shrink-0">
                  <Button
                    icon="pi pi-pencil"
                    size="small"
                    severity="secondary"
                    title="Change location"
                    aria-label="Change location"
                    :pt="labRecordActionButtonPt(generateUniqueId, 'weather', 'edit', loc.id, loc.name)"
                    @click="openEditPicker(loc)"
                  />
                  <Button
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    text
                    title="Delete location"
                    aria-label="Delete location"
                    :pt="labRecordActionButtonPt(generateUniqueId, 'weather', 'delete', loc.id, loc.name)"
                    @click="integrationRef?.openPrimaryDelete(loc.id)"
                  />
                </div>
              </div>

              <!-- Current conditions are the card's payload; the card is not a log. -->
              <div
                v-if="live[String(loc.id)]"
                class="flex items-center gap-3"
                :id="generateUniqueId(`weather-live-${loc.id}`)"
              >
                <WeatherIcon
                  :condition="live[String(loc.id)].condition"
                  :size="38"
                  :title="live[String(loc.id)].description"
                  class="weather-card__icon"
                />
                <div class="text-sm min-w-0">
                  <div class="font-semibold">
                    {{ formatTempF(live[String(loc.id)].tempC) }} · {{ live[String(loc.id)].description }}
                  </div>
                  <div class="text-xs text-lab-general-text-muted">
                    {{ live[String(loc.id)].humidity }}% humidity · {{ formatWindMph(live[String(loc.id)].windKph) }}
                  </div>
                </div>
              </div>
              <p
                v-else
                class="text-xs text-lab-general-text-muted m-0"
                :id="generateUniqueId(`weather-live-missing-${loc.id}`)"
              >
                {{ liveLoading ? 'Loading current conditions…' : 'Current conditions unavailable.' }}
              </p>

              <button
                type="button"
                class="weather-card__forecast-link"
                :id="generateUniqueId(`weather-forecast-${loc.id}`)"
                :aria-label="`7-day forecast for ${loc.name}`"
                @click="openForecast(loc)"
              >
                <i class="pi pi-calendar" aria-hidden="true" />
                <span>7-day forecast</span>
              </button>
            </article>
          </div>
          <p class="text-xs text-lab-general-text-muted m-0 shrink-0">
            {{ liveLoading ? 'Updating live conditions…' : `${locations.length} location${locations.length === 1 ? '' : 's'}` }}
          </p>
        </CatalogAppFormSection>
      </div>
    </CatalogAppFormSection>

    <LocationForecastDialog
      v-model:visible="forecastVisible"
      :server-url="props.serverUrl"
      :location-id="forecastLocationId"
      :location-name="forecastLocationName"
      :days="7"
    />

    <CityPickerDialog
      v-model:visible="pickerVisible"
      :server-url="props.serverUrl"
      :mode="pickerMode"
      :initial-state="pickerInitialState"
      :initial-city="pickerInitialCity"
      :states="states"
      :busy="openingForm"
      @continue="onCityChosen"
    />

    <CatalogIntegrationHost
      ref="integrationRef"
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      @integration-success="onIntegrationSuccess"
    />

  </div>
</template>

<style scoped>
/* Borders use the muted text token: `--lab-general-border` is a stark highlight colour in
   several dark presets, which read as bright white outlines around these cards. */
.weather-card {
  border: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 32%, transparent);
  border-radius: 0.6rem;
  padding: 0.75rem;
  background: var(--lab-general-bg, transparent);
}

.weather-locations {
  max-height: 34rem;
  border-color: color-mix(in srgb, var(--lab-general-text-muted) 32%, transparent);
}

/* Inline "7-day forecast" affordance — reads as a link, not a competing button. */
.weather-card__forecast-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  align-self: flex-start;
  margin-top: 0.15rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 28%, transparent);
  background: transparent;
  color: var(--lab-general-text-muted);
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}

.weather-card__forecast-link:hover {
  color: var(--lab-general-text);
  border-color: color-mix(in srgb, var(--lab-general-text-muted) 55%, transparent);
  background: color-mix(in srgb, var(--lab-general-text-muted) 14%, transparent);
}

.weather-card__forecast-link .pi {
  font-size: 0.6875rem;
}

/* Icon colours follow the theme: warm sun, text-derived cloud, cool precip. */
.weather-card__icon {
  --weather-icon-sun-color: #f2c14e;
  --weather-icon-cloud-color: color-mix(in srgb, var(--lab-general-text) 88%, transparent);
  --weather-icon-precip-color: #63b3ed;
  flex-shrink: 0;
}
</style>
