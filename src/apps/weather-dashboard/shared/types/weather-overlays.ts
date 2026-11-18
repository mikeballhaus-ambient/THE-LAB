import type { ConditionKind } from './index';

/**
 * Weather-map overlay catalog.
 *
 * Every layer here was validated against IEM's tile cache in Web-Mercator (`-900913`), which is
 * required: Leaflet's default CRS is EPSG:3857, and a layer published only in another projection
 * would render misaligned against the OSM base map.
 *
 * Two shapes matter:
 * - **animated** — a fixed set of offsets (minutes into the past) that the client loops.
 * - **static**   — a single frame (e.g. 24-hour precipitation accumulation, satellite imagery).
 */
export type WeatherOverlayId =
  | 'radar'
  | 'radar-storm-relative'
  | 'forecast-reflectivity'
  | 'forecast-precipitation'
  | 'precip-24h'
  | 'precip-48h'
  | 'precip-72h'
  | 'satellite-ir'
  | 'satellite-vis';

/**
 * - `animated`  — past frames sampled by minute offset (radar loop).
 * - `static`    — a single frame (accumulation, satellite).
 * - `forecast`  — future frames, addressed by **forecast minute** rather than a past offset.
 *
 * Forecast overlays cannot use the `-mNNm` tile-cache suffix scheme: HRRR is served by a WMS
 * mapserv with one layer name per forecast step (`refd_0000` … `refd_2160`). See
 * `WMS_OVERLAY_SOURCES` below for the addressing.
 */
export type WeatherOverlayKind = 'animated' | 'static' | 'forecast';

/** Logical grouping for the picker — keeps the list from becoming a flat wall of options. */
export type WeatherOverlayGroup = 'Radar' | 'Forecast' | 'Precipitation' | 'Satellite';

/** WMS mapfile + layer-name prefix for forecast overlays. */
export interface WeatherWmsSource {
  /** Path to the MapServer mapfile on IEM's backend. */
  mapfile: string;
  /** Layer-name prefix; the forecast minute is zero-padded to 4 digits and appended. */
  layerPrefix: string;
}

export interface WeatherOverlayDescriptor {
  id: WeatherOverlayId;
  label: string;
  group: WeatherOverlayGroup;
  kind: WeatherOverlayKind;
  /** IEM tile-cache layer name, minus the `-900913` suffix (added server-side). Absent for WMS. */
  iemLayer?: string;
  /** Present for `forecast` overlays, which are served through WMS rather than the tile cache. */
  wms?: WeatherWmsSource;
  /** Minute offsets **into the past**. Empty for `static` and `forecast` overlays. */
  frameOffsets: readonly number[];
  /** Forecast minutes **into the future**. Empty unless `kind === 'forecast'`. */
  forecastOffsets?: readonly number[];
  /** Opacity the client should apply. Satellite needs less than radar. */
  defaultOpacity: number;
  /** Shown under the layer picker so the user knows what they're looking at. */
  description: string;
}

/**
 * WMS forecast sources, verified against each mapfile's GetCapabilities.
 *
 * Step size differs by parameter — reflectivity is 15-minute out to 18 h then hourly, while the
 * layer names stay uniform (`refd_NNNN` where NNNN is minutes). The sets below are the ones the
 * capabilities document actually advertises.
 */
export const WMS_OVERLAY_SOURCES: Readonly<Record<string, WeatherWmsSource>> = {
  'forecast-reflectivity': {
    mapfile: '/opt/iem/data/wms/model/hrrr_refd.map',
    layerPrefix: 'refd_',
  },
  'forecast-precipitation': {
    mapfile: '/opt/iem/data/wms/model/hrrr_refp.map',
    layerPrefix: 'refp_',
  },
};

/**
 * Forecast minutes available for HRRR.
 *
 * 15-minute steps to 18 h (1080 min), then hourly to 36 h (2160 min). Capped at 18 h here: that
 * is the range where 15-minute granularity is genuine, and it keeps the loop to a sane number of
 * frames (73). Extend the tail if the full 36 h is wanted.
 */
export const HRRR_FORECAST_OFFSETS: readonly number[] = (() => {
  const offsets: number[] = [];
  for (let minutes = 0; minutes <= 1080; minutes += 15) {
    offsets.push(minutes);
  }
  return offsets;
})();

/**
 * The catalog. `frameOffsets` mirrors IEM's published steps — the `-m05m`…`-m55m` suffixes are
 * 5-minute increments, so the list is generated rather than hand-written.
 */
function minuteOffsets(steps: number): number[] {
  return Array.from({ length: steps }, (_, index) => index * 5);
}

export const WEATHER_OVERLAYS: readonly WeatherOverlayDescriptor[] = [
  {
    id: 'radar',
    label: 'Radar',
    group: 'Radar',
    kind: 'animated',
    iemLayer: 'nexrad-n0q',
    // Current + 11 past frames = the standard ~1 hour NEXRAD loop.
    frameOffsets: minuteOffsets(12),
    defaultOpacity: 0.85,
    description: 'Composite NEXRAD reflectivity, last hour.',
  },
  {
    id: 'radar-storm-relative',
    label: 'Storm relative',
    group: 'Radar',
    // `q2-hsr` publishes only the current frame — every `-mNNm` variant is a 404 upstream.
    // Verified with curl against all offsets 05…55. Treating it as animated produced a loop of
    // broken tiles, so it is exposed as a static layer until a time-sequenced source exists.
    kind: 'static',
    iemLayer: 'q2-hsr',
    frameOffsets: [],
    defaultOpacity: 0.85,
    description: 'Storm-relative motion (current frame only).',
  },
  {
    id: 'forecast-reflectivity',
    label: 'Forecast — reflectivity',
    group: 'Forecast',
    kind: 'forecast',
    wms: WMS_OVERLAY_SOURCES['forecast-reflectivity'],
    frameOffsets: [],
    forecastOffsets: HRRR_FORECAST_OFFSETS,
    defaultOpacity: 0.85,
    description: 'HRRR forecast reflectivity, now through +18 h in 15-minute steps.',
  },
  {
    id: 'forecast-precipitation',
    label: 'Forecast — precipitation',
    group: 'Forecast',
    kind: 'forecast',
    wms: WMS_OVERLAY_SOURCES['forecast-precipitation'],
    frameOffsets: [],
    forecastOffsets: HRRR_FORECAST_OFFSETS,
    defaultOpacity: 0.8,
    description: 'HRRR forecast precipitation rate, now through +18 h.',
  },
  {
    id: 'precip-24h',
    label: 'Precipitation — 24 h',
    group: 'Precipitation',
    kind: 'static',
    iemLayer: 'q2-p24h',
    frameOffsets: [],
    defaultOpacity: 0.7,
    description: 'Accumulated precipitation over the last 24 hours.',
  },
  {
    id: 'precip-48h',
    label: 'Precipitation — 48 h',
    group: 'Precipitation',
    kind: 'static',
    iemLayer: 'q2-p48h',
    frameOffsets: [],
    defaultOpacity: 0.7,
    description: 'Accumulated precipitation over the last 48 hours.',
  },
  {
    id: 'precip-72h',
    label: 'Precipitation — 72 h',
    group: 'Precipitation',
    kind: 'static',
    iemLayer: 'q2-p72h',
    frameOffsets: [],
    defaultOpacity: 0.7,
    description: 'Accumulated precipitation over the last 72 hours.',
  },
  {
    id: 'satellite-ir',
    label: 'Satellite — infrared',
    group: 'Satellite',
    kind: 'static',
    iemLayer: 'conus-goes-ir-4km',
    frameOffsets: [],
    defaultOpacity: 0.6,
    description: 'GOES infrared — shows cloud-top temperature day and night.',
  },
  {
    id: 'satellite-vis',
    label: 'Satellite — visible',
    group: 'Satellite',
    kind: 'static',
    iemLayer: 'goes-east-vis-1km',
    frameOffsets: [],
    defaultOpacity: 0.5,
    description: 'GOES visible — daytime only.',
  },
];

export const DEFAULT_OVERLAY_ID: WeatherOverlayId = 'radar';

export function weatherOverlayById(id: string | null | undefined): WeatherOverlayDescriptor | null {
  if (!id) {
    return null;
  }
  return WEATHER_OVERLAYS.find((row) => row.id === id) ?? null;
}

/** One animation frame: which upstream layer to fetch, and when it is valid. */
export interface WeatherOverlayFrame {
  /**
   * Tile-cache layer name including the offset suffix (`nexrad-n0q-900913-m15m`).
   *
   * Empty for forecast frames, which are addressed by `wmsLayer` instead — see
   * `WeatherWmsSource`. Kept as a required field so existing call sites do not need narrowing.
   */
  iemLayer: string;
  /**
   * WMS layer name for forecast frames (`refd_0180`). Absent for tile-cache frames.
   */
  wmsLayer?: string;
  /** Offset into the past, in minutes. `0` is the latest frame. Negative = forecast. */
  offsetMinutes: number;
  /** ISO timestamp this frame is valid for, derived at request time. */
  validAt: string;
  /** `−15 min` / `Now` / `+3 h` — ready for the scrubber label. */
  label: string;
}

export interface WeatherOverlayFramesResponse {
  overlayId: WeatherOverlayId;
  kind: WeatherOverlayKind;
  frames: WeatherOverlayFrame[];
}

/** Payload for `GET /api/weather/map/config` (overlay part). */
export interface WeatherOverlayConfig {
  overlays: WeatherOverlayDescriptor[];
  defaultOverlayId: WeatherOverlayId;
  attribution: string;
}

/** Icon for a WMO-derived condition — shared by cards and map markers. */
export type ConditionIconMap = Record<ConditionKind, string>;
