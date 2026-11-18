<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { DailyForecastDay, LocationForecast } from '../../shared/types';
import * as api from '../api';
import { toFahrenheit } from '../utils/temperature';
import WeatherIcon from './WeatherIcon.vue';

/**
 * Multi-day outlook for one saved location, laid out as horizontal day tiles.
 *
 * Styled per the project rule for hand-built dialogs: `lab-app-dialog lab-form-runtime` plus the
 * integration chrome tokens, with `:global()` selectors — PrimeVue teleports the Dialog to
 * `<body>`, so scoped selectors (even `:deep()`) cannot match the teleported nodes.
 */
const props = defineProps<{
  visible: boolean;
  serverUrl?: string;
  locationId: number | null;
  locationName?: string;
  /** Days to request; the server clamps to 1–16. */
  days?: number;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const dialogId = generateUniqueId('location-forecast-dialog');
const closeId = generateUniqueId('location-forecast-close');

const forecast = ref<LocationForecast | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));
const dayCount = computed(() => props.days ?? 7);

/** Weekday only (`THU`), matching the reference layout — the date number adds noise. */
function weekdayLabel(date: string): string {
  // Parse at UTC noon so the browser's local zone cannot shift the calendar date.
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
}

/** High in the tile header. Missing values render `—`, never `0°`. */
function highTemp(day: DailyForecastDay): string {
  return Number.isFinite(day.tempMaxC) ? `${Math.round(toFahrenheit(day.tempMaxC))}°` : '—';
}

function lowTemp(day: DailyForecastDay): string | null {
  return Number.isFinite(day.tempMinC) ? `${Math.round(toFahrenheit(day.tempMinC))}°` : null;
}

/** Secondary line: precipitation chance, plus a wind hint only when it is actually windy. */
function tileMeta(day: DailyForecastDay): string {
  const parts: string[] = [];
  if (day.precipitationChance != null && day.precipitationChance > 0) {
    parts.push(`${day.precipitationChance}%`);
  }
  if (Number.isFinite(day.windMaxKph) && day.windMaxKph >= 30) {
    parts.push('Windy');
  }
  return parts.join(' · ');
}

async function load(): Promise<void> {
  if (!base.value || props.locationId == null) {
    return;
  }
  loading.value = true;
  error.value = null;
  forecast.value = null;
  try {
    const response = await api.fetchLocationForecast(base.value, props.locationId, dayCount.value);
    forecast.value = response.forecast;
    error.value = response.forecast ? null : (response.error ?? 'Forecast unavailable');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load forecast';
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.visible, props.locationId],
  ([isOpen]) => {
    if (isOpen) {
      void load();
    }
  },
);
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="locationName ? `${locationName} — forecast` : 'Forecast'"
    :class="['location-forecast-dialog', 'lab-app-dialog', 'lab-form-runtime']"
    :style="{ width: '46rem', maxWidth: '94vw' }"
    :pt="{ root: { attrs: { id: dialogId } } }"
    @update:visible="(value: boolean) => emit('update:visible', value)"
  >
    <div class="forecast">
      <div v-if="loading" class="forecast__status">
        <ProgressSpinner style="width: 1.5rem; height: 1.5rem" />
        <span>Loading forecast…</span>
      </div>

      <p v-else-if="error" class="forecast__error">{{ error }}</p>

      <template v-else-if="forecast">
        <div class="forecast__tiles" :id="generateUniqueId('forecast-tiles')">
          <div
            v-for="(day, index) in forecast.days"
            :key="day.date"
            class="forecast-tile"
            :class="{ 'forecast-tile--today': index === 0 }"
            :id="generateUniqueId(`forecast-day-${day.date}`)"
          >
            <div class="forecast-tile__temps">
              <span class="forecast-tile__high">{{ highTemp(day) }}</span>
              <span v-if="lowTemp(day)" class="forecast-tile__low">{{ lowTemp(day) }}</span>
            </div>

            <div class="forecast-tile__icon">
              <WeatherIcon :condition="day.condition" :size="46" :title="day.description" />
            </div>

            <div class="forecast-tile__meta">
              <span v-if="tileMeta(day)">{{ tileMeta(day) }}</span>
              <span v-else class="forecast-tile__meta-empty">&nbsp;</span>
            </div>

            <div class="forecast-tile__day">{{ weekdayLabel(day.date) }}</div>
          </div>
        </div>

        <p class="forecast__footer">
          {{ forecast.days.length }}-day outlook · times local to {{ forecast.timezone }}
        </p>
      </template>
    </div>

    <template #footer>
      <Button
        type="button"
        label="Close"
        severity="secondary"
        text
        :pt="{ root: { attrs: { id: closeId } } }"
        @click="emit('update:visible', false)"
      />
    </template>
  </Dialog>
</template>

<style scoped>
/* PrimeVue teleports the dialog to <body>, so chrome styling must be global. */
:global(.location-forecast-dialog.lab-app-dialog) {
  background: var(--lab-general-bg);
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, transparent);
  color: var(--lab-general-text);
  border-radius: 0.5rem;
  --lab-integration-chrome-bg: color-mix(
    in srgb,
    var(--lab-prime-surface-800) 22%,
    var(--lab-general-bg)
  );
  --lab-integration-body-bg: color-mix(
    in srgb,
    var(--lab-general-bg) 72%,
    var(--lab-prime-surface-500)
  );
  --lab-integration-field-bg: var(--lab-integration-chrome-bg);
  --lab-integration-field-border: color-mix(
    in srgb,
    var(--lab-general-border) 65%,
    var(--lab-prime-surface-700)
  );
  --lab-form-control-bg: var(--lab-integration-chrome-bg);
  --lab-form-control-border: var(--lab-integration-field-border);
}

:global(.location-forecast-dialog .p-dialog-header) {
  flex-shrink: 0;
  padding: 0.85rem 1.25rem;
  color: var(--lab-general-text);
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg);
}

:global(.location-forecast-dialog .p-dialog-title) {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

:global(.location-forecast-dialog .p-dialog-content) {
  padding: 0;
  color: var(--lab-general-text);
  background: var(--lab-integration-body-bg);
}

:global(.location-forecast-dialog .p-dialog-footer) {
  margin: 0;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg);
}

.forecast {
  padding: 1rem 1.25rem 0.75rem;
}

.forecast__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
  font-size: 0.8125rem;
  color: var(--lab-general-text-muted);
}

.forecast__error {
  margin: 1rem 0;
  font-size: 0.8125rem;
  color: var(--lab-danger, #f87171);
}

.forecast__tiles {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(4.75rem, 1fr);
  gap: 0.375rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

/*
 * Each tile is a self-contained column: temps, icon, meta, weekday.
 * Colour comes from the button tokens so the strip reads as part of the shell and follows
 * whichever theme preset is active — `--lab-general-border` is a bright accent in several
 * presets, so the muted text token is used for separators instead.
 */
.forecast-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  min-height: 8.5rem;
  padding: 0.5rem 0.4rem;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 30%, transparent);
  background: color-mix(
    in srgb,
    var(--lab-button-bg) 22%,
    var(--lab-integration-body-bg)
  );
  color: var(--lab-general-text);
}

/* Today is emphasised rather than merely first — it is the row users look for. */
.forecast-tile--today {
  border-color: var(--lab-button-border, var(--lab-general-border));
  background: color-mix(
    in srgb,
    var(--lab-button-bg) 55%,
    var(--lab-integration-body-bg)
  );
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lab-button-border) 45%, transparent);
}

.forecast-tile__temps {
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
  font-variant-numeric: tabular-nums;
}

.forecast-tile__high {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--lab-general-text);
}

.forecast-tile__low {
  font-size: 0.75rem;
  color: var(--lab-general-text-muted);
}

.forecast-tile__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
}

/* Icon colours: sun in a warm accent, clouds/precip from theme text so every preset reads well */
.forecast-tile__icon :deep(.weather-icon) {
  --weather-icon-sun-color: #f2c14e;
  --weather-icon-cloud-color: color-mix(in srgb, var(--lab-general-text) 88%, transparent);
  --weather-icon-precip-color: #63b3ed;
}

.forecast-tile__meta {
  min-height: 0.9rem;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
  color: var(--lab-general-text-muted);
}

.forecast-tile__meta-empty {
  display: inline-block;
}

.forecast-tile__day {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--lab-general-text);
}

.forecast-tile--today .forecast-tile__day {
  color: var(--lab-button-text, var(--lab-general-text));
}

.forecast__footer {
  margin: 0.75rem 0 0;
  font-size: 0.6875rem;
  color: var(--lab-general-text-muted);
}
</style>
