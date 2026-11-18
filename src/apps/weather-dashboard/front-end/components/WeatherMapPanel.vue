<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Slider from 'primevue/slider';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useLabAppState } from '@/shared/composables/appState/useLabAppState';
import type {
  ConditionKind,
  LocationLiveConditions,
  WeatherMapConfig,
  WeatherMapPointSummary,
  WeatherOverlayDescriptor,
  WeatherOverlayFrame,
  WeatherOverlayId,
  WeatherLocation,
} from '../../shared/types';
import * as api from '../api';
import { formatTempF, formatWindMph } from '../utils/temperature';

const props = defineProps<{
  serverUrl?: string;
  locations: WeatherLocation[];
  /** Live conditions keyed by location id, fetched by the shell. */
  live?: Record<string, LocationLiveConditions>;
}>();

const { generateUniqueId } = useUniqueElementId();
const mapHostId = generateUniqueId('weather-map-host');
const overlaySelectId = generateUniqueId('weather-overlay-select');
const playButtonId = generateUniqueId('weather-overlay-play');
const speedSelectId = generateUniqueId('weather-overlay-speed');
const scrubberId = generateUniqueId('weather-overlay-scrubber');
const frameLabelId = generateUniqueId('weather-overlay-frame-label');

const CONDITION_EMOJI: Record<ConditionKind, string> = {
  clear: '☀️',
  'partly-cloudy': '⛅',
  cloudy: '☁️',
  rain: '🌧️',
  snow: '❄️',
  storm: '⛈️',
  fog: '🌫️',
  wind: '💨',
};

function conditionEmoji(condition: ConditionKind): string {
  return CONDITION_EMOJI[condition] ?? '📍';
}

const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));
const config = ref<WeatherMapConfig | null>(null);
const mapError = ref<string | null>(null);
const pointLoading = ref(false);

const mapHost = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
const locationMarkers = shallowRef<L.Marker[]>([]);
let probeMarker: L.Marker | null = null;
let resizeObserver: ResizeObserver | null = null;

const liveByLocationId = computed(() => props.live ?? {});

/* ------------------------------------------------------------------ overlays */

const overlays = computed<WeatherOverlayDescriptor[]>(() => config.value?.overlays ?? []);
const selectedOverlayId = ref<WeatherOverlayId>('radar');
const selectedOverlay = computed<WeatherOverlayDescriptor | null>(
  () => overlays.value.find((row) => row.id === selectedOverlayId.value) ?? null,
);

/**
 * PrimeVue `Select` grouping needs **pre-grouped options** (`optionGroupChildren`), not a flat
 * list with `optionGroupLabel`. Passing a flat array with a group label makes PrimeVue treat
 * every row as a group header: nothing is selectable and the closed control renders blank.
 */
const overlayGroups = computed(() => {
  const order: string[] = [];
  const byGroup = new Map<string, WeatherOverlayDescriptor[]>();
  for (const overlay of overlays.value) {
    if (!byGroup.has(overlay.group)) {
      byGroup.set(overlay.group, []);
      order.push(overlay.group);
    }
    byGroup.get(overlay.group)!.push(overlay);
  }
  return order.map((group) => ({ label: group, items: byGroup.get(group) ?? [] }));
});

const frames = ref<WeatherOverlayFrame[]>([]);
const framesLoading = ref(false);
/** Index into `frames`. For static overlays this stays 0. */
const frameIndex = ref(0);
const isPlaying = ref(false);
const speedMs = ref(400);

/**
 * Persisted UI prefs (per user, via `SessionRecord.appState`).
 *
 * Animation defaults to **off** — an auto-playing map is distracting, and the user's choice to
 * play is now remembered across sessions. `parse` is deliberately defensive: the stored value is
 * app-owned and may predate the current schema.
 */
interface MapPrefs {
  overlayId: string;
  playing: boolean;
  speedMs: number;
}

const VALID_SPEEDS = new Set([800, 400, 200, 100]);

/** Saved overlay must still exist after a catalog change. */
function isKnownOverlay(id: string): boolean {
  return overlays.value.some((row) => row.id === id);
}

const DEFAULT_MAP_PREFS: MapPrefs = {
  overlayId: 'radar',
  playing: false,
  speedMs: 400,
};

const { state: mapPrefs, ready: prefsReady } = useLabAppState<MapPrefs>({
  appId: 'app-weather-dashboard',
  defaultValue: DEFAULT_MAP_PREFS,
  parse: (raw) => {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const row = raw as Partial<MapPrefs>;
    return {
      overlayId: typeof row.overlayId === 'string' ? row.overlayId : DEFAULT_MAP_PREFS.overlayId,
      playing: typeof row.playing === 'boolean' ? row.playing : DEFAULT_MAP_PREFS.playing,
      speedMs:
        typeof row.speedMs === 'number' && VALID_SPEEDS.has(row.speedMs)
          ? row.speedMs
          : DEFAULT_MAP_PREFS.speedMs,
    };
  },
  debounceMs: 400,
});

const SPEED_OPTIONS = [
  { label: '0.5×', value: 800 },
  { label: '1×', value: 400 },
  { label: '2×', value: 200 },
  { label: '4×', value: 100 },
];

const canAnimate = computed(() => {
  const kind = selectedOverlay.value?.kind ?? 'static';
  // Forecast layers animate too — they just move forward in time instead of backwards.
  return (kind === 'animated' || kind === 'forecast') && frames.value.length > 1;
});


const currentFrame = computed<WeatherOverlayFrame | null>(() => frames.value[frameIndex.value] ?? null);

/**
 * One persistent tile layer **per frame**, all mounted at once, visibility by opacity.
 *
 * The previous design reused two layers and called `setUrl()` per frame. `setUrl()` makes Leaflet
 * discard every existing tile and re-request it, so looping 12 frames re-downloaded all 12 every
 * cycle. Keeping a layer per frame means each tile is fetched **once per overlay**, and a loop is
 * pure opacity flipping — no network, no flicker, and each frame is already painted.
 */
const frameLayers = shallowRef<L.TileLayer[]>([]);
let playTimer: ReturnType<typeof setInterval> | null = null;

function tileUrlTemplate(frame: WeatherOverlayFrame): string {
  const overlay = selectedOverlay.value;
  if (!overlay) {
    return '';
  }
  // Forecast frames are WMS-addressed; `offsetMinutes` is negative for them, so the forecast
  // minute is its absolute value.
  if (overlay.kind === 'forecast') {
    const forecastMinutes = Math.abs(frame.offsetMinutes);
    return `${base.value}/api/weather/map/forecast/${overlay.id}/${forecastMinutes}/{z}/{x}/{y}.png`;
  }
  const layer = overlay.iemLayer ?? 'nexrad-n0q';
  return `${base.value}/api/weather/map/tiles/${layer}/${frame.offsetMinutes}/{z}/{x}/{y}.png`;
}

function destroyFrameLayers(): void {
  for (const layer of frameLayers.value) {
    layer.remove();
  }
  frameLayers.value = [];
}

/** Build one layer per frame. Each URL is unique, so Leaflet caches tiles per frame. */
function buildFrameLayers(): void {
  if (!map) return;
  destroyFrameLayers();
  const overlay = selectedOverlay.value;
  if (!overlay) return;

  const layers: L.TileLayer[] = [];
  frames.value.forEach((frame, index) => {
    const layer = L.tileLayer(tileUrlTemplate(frame), {
      attribution: index === 0 ? (config.value?.attribution ?? '') : '',
      opacity: 0,
      maxZoom: 19,
      // Frames stack in order; only one is ever non-transparent.
      zIndex: 2 + index,
    });
    layer.addTo(map!);
    layers.push(layer);
  });
  frameLayers.value = layers;
}

/** Show exactly one frame layer. Pure opacity change — no tile requests. */
function applyFrame(index: number): void {
  const overlay = selectedOverlay.value;
  if (!overlay) return;
  frameLayers.value.forEach((layer, layerIndex) => {
    layer.setOpacity(layerIndex === index ? overlay.defaultOpacity : 0);
  });
}

async function loadFrames(): Promise<void> {
  if (!base.value) return;
  stopPlayback();
  framesLoading.value = true;
  frames.value = [];
  frameIndex.value = 0;
  destroyFrameLayers();
  try {
    const response = await api.fetchOverlayFrames(base.value, selectedOverlayId.value);
    frames.value = response.frames;
    buildFrameLayers();
    applyFrame(frameIndex.value);
    /*
     * Playback follows the user's saved preference — **off by default**.
     *
     * An auto-playing map is distracting, so a first visit stays paused; if the user started the
     * loop previously, it resumes. Switching overlays respects the same flag rather than
     * resuming an animation the user deliberately stopped.
     */
    const canPlay = response.kind === 'animated' || response.kind === 'forecast';
    if (mapPrefs.value.playing && canPlay && response.frames.length > 1) {
      startPlayback();
    }
  } catch (e) {
    mapError.value = e instanceof Error ? e.message : 'Could not load overlay frames.';
  } finally {
    framesLoading.value = false;
  }
}

function stepFrame(delta: number): void {
  if (frames.value.length === 0) return;
  frameIndex.value = (frameIndex.value + delta + frames.value.length) % frames.value.length;
  applyFrame(frameIndex.value);
}

function startPlayback(): void {
  if (!canAnimate.value) return;
  stopPlayback();
  isPlaying.value = true;
  playTimer = setInterval(() => stepFrame(1), speedMs.value);
}

function stopPlayback(): void {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
  isPlaying.value = false;
}

function togglePlayback(): void {
  if (isPlaying.value) {
    // An explicit pause is a preference, not a one-off — it is persisted and honoured on reload.
    mapPrefs.value = { ...mapPrefs.value, playing: false };
    stopPlayback();
  } else {
    mapPrefs.value = { ...mapPrefs.value, playing: true };
    startPlayback();
  }
}

function onScrub(value: number | number[]): void {
  const index = Array.isArray(value) ? value[0] : value;
  if (typeof index !== 'number') return;
  // Manual scrubbing implies the user wants to inspect a frame, so pause — and persist that so
  // the next overlay switch does not resume automatically.
  mapPrefs.value = { ...mapPrefs.value, playing: false };
  stopPlayback();
  frameIndex.value = index;
  applyFrame(frameIndex.value);
}

function onOverlayChange(): void {
  // Remember the choice per user; an unknown id would fall back to the default on next load.
  mapPrefs.value = { ...mapPrefs.value, overlayId: selectedOverlayId.value };
  void loadFrames();
}

// Restart the timer when speed changes mid-playback, and persist the new rate.
watch(speedMs, (value) => {
  mapPrefs.value = { ...mapPrefs.value, speedMs: value };
  if (isPlaying.value) {
    startPlayback();
  }
});

/**
 * Apply the persisted prefs once they hydrate.
 *
 * Runs after `prefsReady` because the saved value arrives asynchronously: applying it earlier
 * would be overwritten by `loadConfig()`'s default, and replaying a stale overlay id would
 * request frames for a layer that no longer exists.
 */
watch(prefsReady, (isReady) => {
  if (!isReady) {
    return;
  }
  const saved = mapPrefs.value;
  speedMs.value = saved.speedMs;
  if (isKnownOverlay(saved.overlayId) && saved.overlayId !== selectedOverlayId.value) {
    selectedOverlayId.value = saved.overlayId as WeatherOverlayId;
    void loadFrames();
  }
});

/* ------------------------------------------------------------- popups + markers */

/**
 * Markers are CSS `divIcon`s rather than Leaflet's default PNG marker.
 *
 * The bundled PNG path is fragile under Vite (`marker-icon.png?url` resolves to a doubled
 * `.../images/node_modules/...` path, so every marker rendered as a broken image). A divIcon has
 * no asset to resolve, inherits `--lab-*` theming, and can show the live condition inline.
 */
function markerIcon(loc: WeatherLocation): L.DivIcon {
  const live = liveByLocationId.value[loc.id];
  const emoji = live ? conditionEmoji(live.condition) : '📍';
  const label = live ? `${formatTempF(live.tempC)}` : '';
  return L.divIcon({
    className: 'weather-map-marker',
    html:
      `<span class="weather-map-marker__dot">${emoji}</span>` +
      (label ? `<span class="weather-map-marker__temp">${label}</span>` : ''),
    iconSize: [44, 24],
    iconAnchor: [22, 12],
    popupAnchor: [0, -12],
  });
}

function popupHtml(title: string, body: string): string {
  return `<div class="weather-map-popup"><strong>${title}</strong><div>${body}</div></div>`;
}

function formatPointSummary(point: WeatherMapPointSummary): string {
  return (
    `${point.description}<br>${formatTempF(point.tempC)} · ` +
    `${point.humidity}% humidity · ${formatWindMph(point.windKph)} wind`
  );
}

async function showPointWeather(lat: number, lon: number): Promise<void> {
  if (!map || !base.value) return;
  pointLoading.value = true;
  try {
    const point = await api.fetchMapPoint(base.value, lat, lon);
    probeMarker?.remove();
    probeMarker = L.marker([lat, lon]).addTo(map);
    probeMarker
      .bindPopup(popupHtml('Live weather', formatPointSummary(point)), { maxWidth: 280 })
      .openPopup();
  } catch (e) {
    mapError.value = e instanceof Error ? e.message : 'Could not load weather for this point.';
  } finally {
    pointLoading.value = false;
  }
}

function onMapClick(event: L.LeafletMouseEvent): void {
  if (!map) return;
  const nextZoom = Math.min(Math.max(map.getZoom() + 2, 7), 12);
  map.flyTo(event.latlng, nextZoom, { duration: 0.55 });
  map.once('moveend', () => {
    void showPointWeather(event.latlng.lat, event.latlng.lng);
  });
}

function syncLocationMarkers(): void {
  if (!map) return;
  for (const marker of locationMarkers.value) {
    marker.remove();
  }
  const next: L.Marker[] = [];
  for (const loc of props.locations) {
    const live = liveByLocationId.value[loc.id];
    const body = live
      ? `${formatTempF(live.tempC)} · ${live.description} · ${live.humidity}% humidity · ${formatWindMph(live.windKph)} wind`
      : 'Current conditions unavailable';
    const marker = L.marker([loc.latitude, loc.longitude], { icon: markerIcon(loc) }).addTo(map);
    marker.bindPopup(popupHtml(loc.name, body));
    marker.on('click', () => {
      map?.flyTo(
        [loc.latitude, loc.longitude],
        Math.min(Math.max(map!.getZoom(), 8), 12),
        { duration: 0.45 },
      );
    });
    next.push(marker);
  }
  locationMarkers.value = next;
}

/* ------------------------------------------------------------------- lifecycle */

function destroyMap(): void {
  stopPlayback();
  resizeObserver?.disconnect();
  resizeObserver = null;
  for (const marker of locationMarkers.value) {
    marker.remove();
  }
  locationMarkers.value = [];
  probeMarker?.remove();
  probeMarker = null;
  destroyFrameLayers();
  map?.remove();
  map = null;
}

function initMap(): void {
  if (!mapHost.value || map) return;
  mapError.value = null;
  // The panel sits in a responsive grid column, so the host box changes width without a
  // window resize. Without this Leaflet keeps the old tile grid and paints grey margins.
  resizeObserver = new ResizeObserver(() => {
    map?.invalidateSize();
  });
  resizeObserver.observe(mapHost.value);
  map = L.map(mapHost.value, {
    center: [39.5, -98.35],
    zoom: 4,
    minZoom: 2,
    maxZoom: 14,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  // Overlay frame layers are built by `buildFrameLayers()` once frames are known — they cannot
  // be constructed before a URL exists, since Leaflet would request `''`.
  syncLocationMarkers();
  map.on('click', onMapClick);
  if (props.locations.length > 0) {
    const bounds = L.latLngBounds(props.locations.map((loc) => [loc.latitude, loc.longitude]));
    map.fitBounds(bounds.pad(0.25), { maxZoom: 8 });
  }
}

const FALLBACK_MAP_CONFIG: WeatherMapConfig = {
  configured: true,
  overlays: [],
  defaultOverlayId: 'radar',
  attribution: '',
  pointSource: 'open-meteo',
  tileSource: 'iem-nexrad',
  states: [],
};

async function loadConfig(): Promise<void> {
  if (!base.value) {
    config.value = FALLBACK_MAP_CONFIG;
    return;
  }
  try {
    config.value = await api.fetchMapConfig(base.value);
    /*
     * Prefer the saved overlay, then the server default. Applying the server default
     * unconditionally would discard the user's choice on every config reload (including the
     * `serverUrl` change path), silently resetting the map.
     */
    const saved = prefsReady.value ? mapPrefs.value.overlayId : null;
    if (saved && isKnownOverlay(saved)) {
      selectedOverlayId.value = saved as WeatherOverlayId;
    } else {
      selectedOverlayId.value = config.value.defaultOverlayId ?? 'radar';
    }
  } catch (e) {
    mapError.value = e instanceof Error ? e.message : 'Map configuration failed.';
    config.value = FALLBACK_MAP_CONFIG;
  }
}

onMounted(async () => {
  /*
   * Wait for prefs before anything that reads `selectedOverlayId`.
   *
   * The saved overlay arrives asynchronously; loading frames first would fetch the default
   * layer, then immediately re-fetch after the preference landed — a wasted round trip on every
   * mount.
   */
  if (!prefsReady.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(prefsReady, (ready) => {
        if (ready) {
          stop();
          resolve();
        }
      });
    });
  }
  await loadConfig();
  await nextTick();
  initMap();
  await loadFrames();
});

onUnmounted(() => {
  destroyMap();
});

watch(
  () => props.locations,
  () => {
    syncLocationMarkers();
  },
  { deep: true },
);

// Live conditions arrive after the first paint (and refresh on each cache cycle), so markers
// have to be rebuilt when they land or the popups keep the stale saved observation.
watch(
  () => props.live,
  () => {
    syncLocationMarkers();
  },
  { deep: true },
);

watch(
  () => props.serverUrl,
  async () => {
    await loadConfig();
    await loadFrames();
  },
);
</script>

<template>
  <section
    class="weather-map-panel flex flex-col gap-2 h-full min-h-[33rem] rounded-md border bg-lab-general-bg-subtle p-3"
    :id="generateUniqueId('weather-map-section')"
  >
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0">
        <h2 class="m-0 text-sm font-semibold text-lab-general-text" :id="generateUniqueId('weather-map-title')">
          Weather map
        </h2>
        <p class="m-0 mt-1 text-xs text-lab-general-text-muted">
          {{ selectedOverlay?.description || 'OpenStreetMap base · IEM overlays · Open-Meteo conditions.' }}
        </p>
      </div>
      <div v-if="overlays.length" class="flex flex-col gap-1 min-w-[12rem]">
        <label
          class="text-xs text-lab-general-text-muted"
          :id="generateUniqueId('weather-map-layer-label')"
          :for="overlaySelectId"
        >Overlay</label>
        <Select
          v-model="selectedOverlayId"
          :options="overlayGroups"
          option-label="label"
          option-value="id"
          option-group-label="label"
          option-group-children="items"
          size="small"
          :loading="framesLoading"
          :pt="{ root: { attrs: { id: overlaySelectId } } }"
          @change="onOverlayChange"
        />
      </div>
    </div>

    <!-- Playback controls: hidden for static overlays, where a timeline makes no sense. -->
    <div
      v-if="canAnimate"
      class="weather-overlay-controls flex flex-wrap items-center gap-2"
      :id="generateUniqueId('weather-overlay-controls')"
    >
      <Button
        :icon="isPlaying ? 'pi pi-pause' : 'pi pi-play'"
        size="small"
        severity="secondary"
        :aria-label="isPlaying ? 'Pause animation' : 'Play animation'"
        :pt="{ root: { attrs: { id: playButtonId } } }"
        @click="togglePlayback"
      />
      <div class="min-w-0 flex-1 flex items-center gap-2">
        <Slider
          class="weather-overlay-scrubber flex-1"
          :model-value="frameIndex"
          :min="0"
          :max="Math.max(frames.length - 1, 0)"
          :step="1"
          :pt="{ root: { attrs: { id: scrubberId } } }"
          @update:model-value="onScrub"
        />
        <span class="text-xs text-lab-general-text-muted whitespace-nowrap tabular-nums" :id="frameLabelId">
          {{ currentFrame?.label ?? '—' }}
        </span>
      </div>
      <Select
        v-model="speedMs"
        :options="SPEED_OPTIONS"
        option-label="label"
        option-value="value"
        size="small"
        class="w-24"
        aria-label="Animation speed"
        :pt="{ root: { attrs: { id: speedSelectId } } }"
      />
    </div>

    <p v-if="mapError" class="m-0 text-xs text-red-400" :id="generateUniqueId('weather-map-error')">{{ mapError }}</p>

    <div
      ref="mapHost"
      class="weather-map-panel__map flex-1 min-h-[27rem] rounded border overflow-hidden"
      :id="mapHostId"
      role="application"
      aria-label="Interactive weather map"
    />
  </section>
</template>

<style scoped>
/*
 * Muted border, matching the saved-location cards. `--lab-general-border` is a bright accent in
 * several dark presets and read as a white outline around the map.
 */
.weather-map-panel,
.weather-map-panel__map {
  border-color: color-mix(in srgb, var(--lab-general-text-muted) 32%, transparent);
}

.weather-map-panel__map {
  z-index: 0;
}

.weather-overlay-controls {
  padding: 0.35rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 28%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 70%, transparent);
}

.weather-overlay-scrubber {
  min-width: 6rem;
}

:deep(.weather-map-marker) {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: auto !important;
  height: auto !important;
  padding: 0.1rem 0.35rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--lab-general-bg) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 45%, transparent);
  color: var(--lab-general-text);
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.35);
}

:deep(.weather-map-marker__dot) {
  font-size: 0.875rem;
  line-height: 1;
}

:deep(.weather-map-marker__temp) {
  font-variant-numeric: tabular-nums;
}

/*
 * Leaflet's popup chrome is hard-coded light (`.leaflet-popup-content-wrapper { background:#fff }`).
 * The lab shell runs a dark theme, so inheriting `--lab-general-text` painted near-white text on
 * white — the bubble looked empty. Pin both bubble and content to dark-on-light.
 */
:deep(.leaflet-popup-content-wrapper),
:deep(.leaflet-popup-tip) {
  background: #ffffff;
  color: #1f2937;
  box-shadow: 0 3px 14px rgba(15, 23, 42, 0.35);
}

:deep(.leaflet-popup-content) {
  margin: 0.65rem 0.85rem;
  color: #1f2937;
  font-size: 0.8125rem;
  line-height: 1.35;
}

:deep(.leaflet-container a.leaflet-popup-close-button) {
  color: #475569;
}

:deep(.weather-map-popup),
:deep(.weather-map-popup strong) {
  color: #1f2937;
}
</style>
