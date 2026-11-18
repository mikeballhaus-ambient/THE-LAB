import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  type LocationLiveConditions,
  type LocationLiveConditionsResponse,
  type UsCityOption,
  type UsCitySearchResponse,
  type WeatherMapConfig,
  type WeatherMapPointSummary,
} from '../shared/types/weather-map';
import type {
  DailyForecastDay,
  LocationForecast,
  LocationForecastResponse,
} from '../shared/types/weather-forecast';
import {
  DEFAULT_OVERLAY_ID,
  WEATHER_OVERLAYS,
  weatherOverlayById,
  type WeatherOverlayFrame,
  type WeatherOverlayFramesResponse,
} from '../shared/types/weather-overlays';
import type { ConditionKind } from '../shared/types';

/**
 * Keyless weather map.
 *
 * - **Radar tiles** — Iowa Environmental Mesonet (IEM) NEXRAD composite, served as
 *   `EPSG:3857` XYZ PNGs. No API key, no account.
 * - **Point conditions** — Open-Meteo current conditions. No API key, genuinely global
 *   (unlike ASOS/METAR, which is US-only), so any saved location resolves.
 *
 * Both are proxied through this server rather than called from the browser: it keeps a single
 * cached, attributable egress point and lets us set polite cache headers on their behalf.
 */

/**
 * IEM names offset frames with a `-mNNm` suffix; offset 0 has no suffix.
 * `nexrad-n0q` + 15 min → `nexrad-n0q-900913-m15m`.
 */
export function buildIemLayerName(iemLayer: string, offsetMinutes: number): string {
  if (!Number.isFinite(offsetMinutes) || offsetMinutes <= 0) {
    return `${iemLayer}-900913`;
  }
  const padded = String(Math.round(offsetMinutes)).padStart(2, '0');
  return `${iemLayer}-900913-m${padded}m`;
}

/**
 * Offset label for the scrubber.
 *
 * Negative offsets are **forecast** (ahead of now) and render `+3 h`; positive are past frames
 * and render `−15 min`.
 */
export function frameLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) {
    return 'Now';
  }
  const sign = offsetMinutes < 0 ? '+' : '\u2212';
  const abs = Math.abs(offsetMinutes);
  if (abs < 60) {
    return `${sign}${abs} min`;
  }
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0 ? `${sign}${hours} h` : `${sign}${hours} h ${minutes} m`;
}

/** `refd_` + zero-padded forecast minute → `refd_0180`. */
export function buildWmsLayerName(prefix: string, forecastMinutes: number): string {
  return `${prefix}${String(Math.max(0, Math.round(forecastMinutes))).padStart(4, '0')}`;
}

const IEM_LAYER_SET = new Set(WEATHER_OVERLAYS.map((row) => row.iemLayer));

/** Validates `layer` + `frame` against the catalog so the proxy cannot be used to hit arbitrary paths. */
function resolveProxyLayer(layer: string, frame: number): string | null {
  if (!IEM_LAYER_SET.has(layer)) {
    return null;
  }
  const overlay = WEATHER_OVERLAYS.find((row) => row.iemLayer === layer);
  if (!overlay) {
    return null;
  }
  if (overlay.kind === 'static') {
    return frame === 0 ? buildIemLayerName(layer, 0) : null;
  }
  if (!overlay.frameOffsets.includes(frame)) {
    return null;
  }
  return buildIemLayerName(layer, frame);
}

export const WEATHER_MAP_ATTRIBUTION = 'Radar © Iowa Environmental Mesonet · Conditions © Open-Meteo';

/**
 * 1×1 fully transparent PNG.
 *
 * Served when IEM has no tile for a layer/offset/zoom. Returning JSON for an `<img>` request
 * triggers Opaque Response Blocking in the browser (`ERR_BLOCKED_BY_ORB`), which reads as a
 * broken app; a transparent pixel is the correct "no imagery here" answer.
 */
const TRANSPARENT_TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const IEM_TILE_BASE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';
const IEM_MAPSERV_URL = 'https://mesonet.agron.iastate.edu/cgi-bin/mapserv/mapserv.fcgi';

/**
 * Web-Mercator bounds for an XYZ tile, as `minx,miny,maxx,maxy`.
 *
 * MapServer wants a bbox, Leaflet asks for z/x/y. EPSG:3857 has a fixed world extent of
 * ±20037508.34 m, so the conversion is closed-form — no projection library needed.
 */
export function tileBounds3857(z: number, x: number, y: number): string {
  const world = 20037508.342789244;
  const tiles = 2 ** z;
  const span = (world * 2) / tiles;
  const minX = -world + x * span;
  // XYZ y counts down from north; Mercator y counts up.
  const maxY = world - y * span;
  return [minX, maxY - span, minX + span, maxY].map((value) => value.toFixed(6)).join(',');
}

const OPEN_METEO_CURRENT_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Two-letter code for each US state, used to validate and label the state picker. */
export const US_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const US_STATE_NAME_BY_CODE = new Map(US_STATES.map((row) => [row.code, row.name]));

/** Short, honest User-Agent — both providers are public-funded and ask for identification. */
const UPSTREAM_USER_AGENT = 'THE-LAB-weather-dashboard (+https://github.com/)';
const UPSTREAM_TIMEOUT_MS = 8_000;

/** Open-Meteo samples on ~15-minute steps; five minutes is stale enough to be cheap, fresh enough to trust. */
const LIVE_CONDITIONS_TTL_MS = 5 * 60_000;
/** Upper bound on fan-out per request so a large location list cannot stampede the provider. */
const MAX_LIVE_LOCATIONS = 25;

interface OpenMeteoGeocodeResult {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  population?: number;
  feature_code?: string;
}

interface OpenMeteoGeocodeResponse {
  results?: OpenMeteoGeocodeResult[];
}

const US_STATE_CODE_BY_NAME = new Map(US_STATES.map((row) => [row.name, row.code]));

/**
 * Resolve a US city's coordinates from state + city name.
 *
 * The geocoder has no "state" filter, so results are matched on `admin1` (full state name) and
 * `country_code`. Only populated places are kept — `feature_code` starting with `PPL` covers
 * city/town/village, excluding airports or landmarks that share a name.
 */
export async function searchUsCities(options: {
  query: string;
  stateCode?: string;
  limit?: number;
}): Promise<UsCityOption[]> {
  const query = options.query.trim();
  if (query.length < 2) {
    return [];
  }
  const stateCode = options.stateCode?.trim().toUpperCase();
  const stateName = stateCode ? US_STATE_NAME_BY_CODE.get(stateCode) : undefined;
  if (stateCode && !stateName) {
    return [];
  }

  const params = new URLSearchParams({
    name: query,
    count: String(Math.min(options.limit ?? 20, 50)),
    language: 'en',
    format: 'json',
    countryCode: 'US',
  });
  const response = await fetch(`${OPEN_METEO_GEOCODE_URL}?${params.toString()}`, {
    headers: { 'User-Agent': UPSTREAM_USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`geocode_http_${response.status}`);
  }
  const payload = (await response.json()) as OpenMeteoGeocodeResponse;

  const cities: UsCityOption[] = [];
  for (const row of payload.results ?? []) {
    if (row.country_code !== 'US') continue;
    if (!(row.feature_code ?? '').startsWith('PPL')) continue;
    const city = row.name?.trim();
    if (!city) continue;
    if (stateName && row.admin1 !== stateName) continue;
    const code = row.admin1 ? US_STATE_CODE_BY_NAME.get(row.admin1) : undefined;
    if (!code) continue;
    if (typeof row.latitude !== 'number' || typeof row.longitude !== 'number') continue;
    cities.push({
      id: row.id ?? cities.length,
      city,
      state: code,
      stateName: row.admin1 ?? '',
      latitude: row.latitude,
      longitude: row.longitude,
      label: `${city}, ${code}`,
      county: row.admin2,
      population: row.population,
    });
  }

  // Most-populated first — a search for "Springfield" should lead with the well-known city.
  return cities.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
}

interface LiveConditionsSample {
  tempC: number;
  humidity: number;
  windKph: number;
  description: string;
  condition: ConditionKind;
  observedAt?: string;
}

interface LiveConditionsCacheEntry {
  sample: LiveConditionsSample;
  fetchedAt: number;
}

const liveConditionsCache = new Map<number, LiveConditionsCacheEntry>();

/**
 * Upstream tile cache, keyed by IEM layer + z/x/y.
 *
 * The browser cache handles the common case, but a reload, a second user, or a `no-store`
 * client would re-hit IEM for tiles that are immutable historical frames. This keeps one small
 * in-process copy so repeated requests never leave the app server.
 *
 * Bounded because radar at high zoom is many distinct tiles: unbounded growth over a long
 * session would be a slow leak. Oldest insertion is evicted first.
 */
interface CachedTile {
  body: Buffer;
  contentType: string;
}
const TILE_CACHE_MAX_ENTRIES = 600;
const tileCache = new Map<string, CachedTile>();

function cacheGetTile(key: string): CachedTile | undefined {
  const hit = tileCache.get(key);
  if (hit) {
    // Refresh recency so the eviction order approximates LRU.
    tileCache.delete(key);
    tileCache.set(key, hit);
  }
  return hit;
}

function cacheSetTile(key: string, value: CachedTile): void {
  if (tileCache.size >= TILE_CACHE_MAX_ENTRIES) {
    const oldest = tileCache.keys().next().value;
    if (oldest !== undefined) {
      tileCache.delete(oldest);
    }
  }
  tileCache.set(key, value);
}

/** Test hook — clears memoised tiles between cases. */
export function clearTileCache(): void {
  tileCache.clear();
}

/** Cleared between tests; also handy for a manual refresh endpoint later. */
export function clearLiveConditionsCache(): void {
  liveConditionsCache.clear();
}

function mapConfig(): WeatherMapConfig {
  return {
    configured: true,
    overlays: WEATHER_OVERLAYS.map((row) => ({ ...row })),
    defaultOverlayId: DEFAULT_OVERLAY_ID,
    attribution: WEATHER_MAP_ATTRIBUTION,
    pointSource: 'open-meteo',
    tileSource: 'iem-nexrad',
    states: US_STATES.map((row) => ({ ...row })),
  };
}

/**
 * Animation frames for an overlay.
 *
 * `validAt` is derived at request time from the frame offset, which is honest rather than
 * precise: IEM composites update on a cadence we do not know, so the label tells the user
 * "this frame is about N minutes old" instead of asserting an exact scan time.
 */
export function buildOverlayFrames(overlayId: string, now: Date = new Date()): WeatherOverlayFramesResponse | null {
  const overlay = weatherOverlayById(overlayId);
  if (!overlay) {
    return null;
  }

  if (overlay.kind === 'forecast') {
    const source = overlay.wms;
    if (!source) {
      return null;
    }
    // Forecast frames are addressed by WMS layer name, and `offsetMinutes` is **negative** so
    // the shared label logic renders "+3 h" without a separate code path.
    const frames: WeatherOverlayFrame[] = (overlay.forecastOffsets ?? []).map((forecastMinutes) => ({
      iemLayer: '',
      wmsLayer: buildWmsLayerName(source.layerPrefix, forecastMinutes),
      offsetMinutes: -forecastMinutes,
      validAt: new Date(now.getTime() + forecastMinutes * 60_000).toISOString(),
      label: frameLabel(-forecastMinutes),
    }));
    return { overlayId: overlay.id, kind: overlay.kind, frames };
  }

  const offsets = overlay.kind === 'static' ? [0] : [...overlay.frameOffsets];
  const frames: WeatherOverlayFrame[] = offsets.map((offsetMinutes) => ({
    iemLayer: buildIemLayerName(overlay.iemLayer ?? '', offsetMinutes),
    offsetMinutes,
    validAt: new Date(now.getTime() - offsetMinutes * 60_000).toISOString(),
    label: frameLabel(offsetMinutes),
  }));
  return { overlayId: overlay.id, kind: overlay.kind, frames };
}

/**
 * WMO 4677 weather code → the app's coarse `ConditionKind`.
 *
 * Open-Meteo reports WMO codes; the observation model uses eight buckets. Codes are grouped by
 * decade where the decade is homogeneous, and called out individually where it is not
 * (45/48 fog, 95-99 thunderstorm).
 */
export function mapWmoCodeToCondition(code: number | null | undefined): ConditionKind {
  if (code == null || !Number.isFinite(code)) {
    return 'clear';
  }
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'rain'; // drizzle
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain'; // rain showers
  if (code === 85 || code === 86) return 'snow'; // snow showers
  if (code >= 95 && code <= 99) return 'storm';
  return 'clear';
}

/** Human-readable label to sit next to the icon. */
export function describeWmoCode(code: number | null | undefined): string {
  const condition = mapWmoCodeToCondition(code);
  switch (condition) {
    case 'clear':
      return 'clear sky';
    case 'partly-cloudy':
      return 'partly cloudy';
    case 'cloudy':
      return 'overcast';
    case 'fog':
      return 'fog';
    case 'snow':
      return 'snow';
    case 'storm':
      return 'thunderstorm';
    case 'wind':
      return 'windy';
    default:
      return 'rain';
  }
}

function parsePointQuery(query: Record<string, unknown>): { lat: number; lon: number } | null {
  const lat = Number(query.lat);
  const lon = Number(query.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

interface OpenMeteoCurrentResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
}

/**
 * One Open-Meteo sample. Returns `null` when the provider answered without a `current` block
 * so callers can distinguish "no data" from "request failed".
 */
export async function fetchCurrentConditions(
  lat: number,
  lon: number,
): Promise<LiveConditionsSample | null> {
  const url =
    `${OPEN_METEO_CURRENT_URL}?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=UTC';
  const response = await fetch(url, {
    headers: { 'User-Agent': UPSTREAM_USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as OpenMeteoCurrentResponse;
  const current = payload.current;
  if (!current) {
    return null;
  }
  const code = current.weather_code;
  return {
    tempC: Math.round((current.temperature_2m ?? 0) * 10) / 10,
    humidity: Math.round(current.relative_humidity_2m ?? 0),
    // Open-Meteo reports wind in km/h for `wind_speed_10m`.
    windKph: Math.round((current.wind_speed_10m ?? 0) * 10) / 10,
    description: describeWmoCode(code),
    condition: mapWmoCodeToCondition(code),
    observedAt: current.time,
  };
}

interface OpenMeteoDailyResponse {
  timezone?: string;
  daily?: {
    time?: string[];
    weather_code?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_probability_max?: Array<number | null>;
    wind_speed_10m_max?: Array<number | null>;
  };
}

/** Daily forecasts are stable for hours — cache well past the live-conditions TTL. */
const FORECAST_TTL_MS = 30 * 60_000;
const forecastCache = new Map<number, { forecast: LocationForecast; fetchedAt: number }>();

/** Test hook. */
export function clearForecastCache(): void {
  forecastCache.clear();
}

/**
 * Multi-day outlook for one coordinate.
 *
 * `timezone=auto` is deliberate: the provider then returns **local** calendar dates and the
 * location's IANA zone. Requesting UTC would shift the first/last day for locations far from the
 * user, so a Denver card would show the wrong date for "today".
 */
export async function fetchDailyForecast(
  lat: number,
  lon: number,
  days = 7,
): Promise<LocationForecast | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
    forecast_days: String(days),
    timezone: 'auto',
  });
  const response = await fetch(`${OPEN_METEO_CURRENT_URL}?${params.toString()}`, {
    headers: { 'User-Agent': UPSTREAM_USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as OpenMeteoDailyResponse;
  const daily = payload.daily;
  const dates = daily?.time ?? [];
  if (dates.length === 0) {
    return null;
  }

  const pick = (series: Array<number | null> | undefined, index: number): number | null => {
    const value = series?.[index];
    return typeof value === 'number' ? value : null;
  };

  const rows: DailyForecastDay[] = dates.map((date, index) => {
    const code = pick(daily?.weather_code, index);
    return {
      date,
      condition: mapWmoCodeToCondition(code),
      description: describeWmoCode(code),
      // Missing values would otherwise render as 0 °C, which reads as real data.
      tempMaxC: pick(daily?.temperature_2m_max, index) ?? Number.NaN,
      tempMinC: pick(daily?.temperature_2m_min, index) ?? Number.NaN,
      precipitationChance: pick(daily?.precipitation_probability_max, index),
      windMaxKph: pick(daily?.wind_speed_10m_max, index) ?? Number.NaN,
    };
  });

  return {
    locationId: 0,
    timezone: payload.timezone ?? 'UTC',
    days: rows,
    fetchedAt: new Date().toISOString(),
  };
}

/** Minimal slice of the weather repository this module needs. */
export interface WeatherMapLocationSource {
  listLocations(): Array<{ id: number; name: string; latitude: number; longitude: number }>;
}

export function registerWeatherMapRoutes(
  server: FastifyInstance,
  locations: WeatherMapLocationSource,
): void {
  server.get('/api/weather/map/config', async () => mapConfig());

  /** US states for the city picker (static — no upstream call). */
  server.get('/api/weather/geo/states', async () => ({ states: US_STATES }));

  /**
   * US city search — the user picks a state and city, and the shell derives lat/lon.
   *
   * Never 500s on an upstream hiccup: the picker shows an inline message rather than an
   * unhandled error, so a geocoder outage cannot block adding a location.
   */
  server.get(
    '/api/weather/geo/cities',
    async (
      request: FastifyRequest<{ Querystring: { q?: string; state?: string } }>,
      reply: FastifyReply,
    ) => {
      const q = (request.query.q ?? '').trim();
      const state = (request.query.state ?? '').trim().toUpperCase() || undefined;
      if (q.length < 2) {
        return reply.send({ cities: [] } satisfies UsCitySearchResponse);
      }
      try {
        const cities = await searchUsCities({ query: q, stateCode: state });
        reply.header('Cache-Control', 'public, max-age=3600');
        return reply.send({ cities } satisfies UsCitySearchResponse);
      } catch (err) {
        return reply.send({
          cities: [],
          error: err instanceof Error ? err.message : 'geocode_failed',
        } satisfies UsCitySearchResponse);
      }
    },
  );

  /** Animation frames for one overlay. Static overlays return a single frame. */
  server.get(
    '/api/weather/map/frames',
    async (
      request: FastifyRequest<{ Querystring: { overlay?: string } }>,
      reply: FastifyReply,
    ) => {
      const overlayId = (request.query.overlay ?? DEFAULT_OVERLAY_ID).trim();
      const payload = buildOverlayFrames(overlayId);
      if (!payload) {
        return reply.status(400).send({ error: 'invalid_overlay' });
      }
      // Frame timestamps drift with the clock; keep the cache short.
      reply.header('Cache-Control', 'public, max-age=60');
      return reply.send(payload);
    },
  );

  server.get(
    '/api/weather/map/tiles/:layer/:frame/:z/:x/:y.png',
    async (
      request: FastifyRequest<{
        Params: { layer: string; frame: string; z: string; x: string; y: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { layer, frame, z, x, y } = request.params;
      const frameOffset = Number(frame);
      if (!Number.isInteger(frameOffset) || frameOffset < 0) {
        return reply.status(400).send({ error: 'invalid_frame' });
      }
      // Only catalog layers and catalog frames are fetchable — this is what keeps the proxy
      // from being used to reach arbitrary upstream paths.
      const upstreamLayer = resolveProxyLayer(layer, frameOffset);
      if (!upstreamLayer) {
        return reply.status(400).send({ error: 'invalid_layer_or_frame' });
      }
      // Guards against absurd zooms.
      const numeric = [z, x, y].map((value) => Number(value));
      if (numeric.some((value) => !Number.isInteger(value) || value < 0) || numeric[0] > 19) {
        return reply.status(400).send({ error: 'invalid_tile_coords' });
      }

      const cacheKey = `${upstreamLayer}/${numeric[0]}/${numeric[1]}/${numeric[2]}`;
      const cached = cacheGetTile(cacheKey);
      if (cached) {
        reply.header(
          'Cache-Control',
          frameOffset === 0 ? 'public, max-age=300' : 'public, max-age=86400, immutable',
        );
        reply.header('X-Tile-Cache', 'hit');
        return reply.type(cached.contentType).send(cached.body);
      }

      const tileUrl = `${IEM_TILE_BASE}/${upstreamLayer}/${numeric[0]}/${numeric[1]}/${numeric[2]}.png`;
      let tileRes: Response;
      try {
        tileRes = await fetch(tileUrl, {
          headers: { 'User-Agent': UPSTREAM_USER_AGENT },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
      } catch {
        return reply.status(504).send({ error: 'tile_fetch_failed' });
      }
      /*
       * A missing upstream tile is a normal condition, not a server error — IEM simply has no
       * frame for that layer/offset/zoom. Responding with a transparent PNG keeps the browser
       * happy: a JSON error body on an `<img>` request trips Opaque Response Blocking, which
       * surfaces as `ERR_BLOCKED_BY_ORB` and looks like a broken app rather than absent imagery.
       */
      if (!tileRes.ok) {
        reply.header('Cache-Control', 'public, max-age=60');
        reply.header('X-Tile-Cache', 'upstream-missing');
        return reply.type('image/png').send(TRANSPARENT_TILE_PNG);
      }
      const body = Buffer.from(await tileRes.arrayBuffer());
      // Only memoise immutable historical frames. Offset 0 is live data and must be re-read so
      // the newest radar image is never served from a stale process cache.
      if (frameOffset > 0) {
        cacheSetTile(cacheKey, { body, contentType: 'image/png' });
      }
      reply.header('X-Tile-Cache', 'miss');
      /*
       * Historical frames are immutable — the tile for "−40 min" never changes, so it is cached
       * for a day. Only the latest frame (offset 0) is live data and stays on a short TTL.
       * Without this split, looping a 12-frame animation re-fetched eleven static frames every
       * 5 minutes for no reason.
       */
      reply.header(
        'Cache-Control',
        frameOffset === 0 ? 'public, max-age=300' : 'public, max-age=86400, immutable',
      );
      return reply.type('image/png').send(body);
    },
  );

  /**
   * Forecast tiles via IEM's MapServer WMS.
   *
   * The tile cache cannot serve these: `hrrr-refd` is a *virtual* layer whose real names are
   * `refd_0000` … `refd_2160` (one per forecast step). Calling the cache returns
   * `TileCacheLayerNotFoundException … needs to be called with name overloads`, and no
   * URL-suffix form works. The mapserv endpoint accepts `LAYERS=refd_NNNN` directly, so
   * forecast requests bypass the cache entirely.
   *
   * IEM only accepts EPSG:3857 bounds, which is exactly what a Leaflet WMTS-style XYZ request
   * maps onto — the z/x/y is converted to a Web-Mercator bbox here.
   */
  server.get(
    '/api/weather/map/forecast/:overlayId/:forecast/:z/:x/:y.png',
    async (
      request: FastifyRequest<{
        Params: { overlayId: string; forecast: string; z: string; x: string; y: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { overlayId, forecast, z, x, y } = request.params;
      const overlay = weatherOverlayById(overlayId);
      if (!overlay || overlay.kind !== 'forecast' || !overlay.wms) {
        return reply.status(400).send({ error: 'invalid_forecast_overlay' });
      }
      const forecastMinutes = Number(forecast);
      if (
        !Number.isInteger(forecastMinutes) ||
        forecastMinutes < 0 ||
        !(overlay.forecastOffsets ?? []).includes(forecastMinutes)
      ) {
        return reply.status(400).send({ error: 'invalid_forecast_frame' });
      }
      const [zoom, tileX, tileY] = [z, x, y].map((value) => Number(value));
      if (
        ![zoom, tileX, tileY].every((value) => Number.isInteger(value) && value >= 0) ||
        zoom > 19
      ) {
        return reply.status(400).send({ error: 'invalid_tile_coords' });
      }

      const bounds = tileBounds3857(zoom, tileX, tileY);
      const wmsLayer = buildWmsLayerName(overlay.wms.layerPrefix, forecastMinutes);
      const params = new URLSearchParams({
        map: overlay.wms.mapfile,
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetMap',
        LAYERS: wmsLayer,
        SRS: 'EPSG:3857',
        BBOX: bounds,
        WIDTH: '256',
        HEIGHT: '256',
        FORMAT: 'image/png',
        TRANSPARENT: 'TRUE',
      });
      // `map` is a path, and URLSearchParams escapes `/`; MapServer needs it literal.
      const url = `${IEM_MAPSERV_URL}?${params.toString().replace(/%2F/g, '/')}`;

      const cacheKey = `wms:${wmsLayer}/${zoom}/${tileX}/${tileY}`;
      const cached = cacheGetTile(cacheKey);
      if (cached) {
        reply.header('Cache-Control', 'public, max-age=1800');
        reply.header('X-Tile-Cache', 'hit');
        return reply.type(cached.contentType).send(cached.body);
      }

      let upstream: Response;
      try {
        upstream = await fetch(url, {
          headers: { 'User-Agent': UPSTREAM_USER_AGENT },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
      } catch {
        return reply.status(504).send({ error: 'forecast_fetch_failed' });
      }
      if (!upstream.ok) {
        reply.header('Cache-Control', 'public, max-age=60');
        reply.header('X-Tile-Cache', 'upstream-missing');
        return reply.type('image/png').send(TRANSPARENT_TILE_PNG);
      }
      const body = Buffer.from(await upstream.arrayBuffer());
      cacheSetTile(cacheKey, { body, contentType: 'image/png' });
      reply.header('Cache-Control', 'public, max-age=1800');
      reply.header('X-Tile-Cache', 'miss');
      return reply.type('image/png').send(body);
    },
  );

  server.get(
    '/api/weather/map/point',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const coords = parsePointQuery(request.query as Record<string, unknown>);
      if (!coords) {
        return reply.status(400).send({ error: 'invalid_coordinates' });
      }

      let sample: LiveConditionsSample | null;
      try {
        sample = await fetchCurrentConditions(coords.lat, coords.lon);
      } catch {
        return reply.status(504).send({ error: 'weather_fetch_failed' });
      }
      if (!sample) {
        return reply.status(502).send({ error: 'weather_unavailable' });
      }

      const summary: WeatherMapPointSummary = {
        lat: coords.lat,
        lon: coords.lon,
        ...sample,
      };
      reply.header('Cache-Control', 'public, max-age=120');
      return reply.send(summary);
    },
  );

  /**
   * Live conditions for every saved location, in one round trip.
   *
   * The cards used to render only the newest *user-recorded* observation, so seeded demo data
   * looked like current weather (Denver showing -1.5 °C in October). This endpoint gives the UI
   * a real "now" to display alongside — or instead of — the saved observation.
   *
   * Fan-out is capped and results are memoised for five minutes.
   */
  /**
   * Multi-day outlook for one saved location.
   *
   * Never 500s: the dialog shows an inline message, so a provider hiccup cannot break the card.
   * Cached per location for 30 minutes — daily forecasts do not move fast enough to justify
   * hitting the provider on every open.
   */
  server.get(
    '/api/weather/locations/:id/forecast',
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: { days?: string } }>,
      reply: FastifyReply,
    ) => {
      const id = Number.parseInt(request.params.id, 10);
      if (Number.isNaN(id)) {
        return reply.status(400).send({ forecast: null, error: 'invalid_location_id' });
      }
      const location = locations.listLocations().find((row) => row.id === id);
      if (!location) {
        return reply.status(404).send({ forecast: null, error: 'location_not_found' });
      }

      const cached = forecastCache.get(id);
      if (cached && Date.now() - cached.fetchedAt < FORECAST_TTL_MS) {
        reply.header('Cache-Control', 'private, max-age=300');
        return reply.send({ forecast: cached.forecast } satisfies LocationForecastResponse);
      }

      const requestedDays = Number.parseInt(request.query.days ?? '7', 10);
      const days = Number.isFinite(requestedDays)
        ? Math.min(Math.max(requestedDays, 1), 16)
        : 7;

      try {
        const forecast = await fetchDailyForecast(location.latitude, location.longitude, days);
        if (!forecast) {
          return reply.send({
            forecast: null,
            error: 'forecast_unavailable',
          } satisfies LocationForecastResponse);
        }
        const scoped: LocationForecast = { ...forecast, locationId: location.id };
        forecastCache.set(id, { forecast: scoped, fetchedAt: Date.now() });
        reply.header('Cache-Control', 'private, max-age=300');
        return reply.send({ forecast: scoped } satisfies LocationForecastResponse);
      } catch (err) {
        return reply.send({
          forecast: null,
          error: err instanceof Error ? err.message : 'forecast_failed',
        } satisfies LocationForecastResponse);
      }
    },
  );

  server.get(
    '/api/weather/live-conditions',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const rows = locations.listLocations().slice(0, MAX_LIVE_LOCATIONS);
      if (rows.length === 0) {
        return reply.send({ conditions: {}, failed: [] } satisfies LocationLiveConditionsResponse);
      }

      const conditions: Record<string, LocationLiveConditions> = {};
      const failed: number[] = [];
      const now = Date.now();

      await Promise.all(
        rows.map(async (location) => {
          const cached = liveConditionsCache.get(location.id);
          if (cached && now - cached.fetchedAt < LIVE_CONDITIONS_TTL_MS) {
            conditions[String(location.id)] = { locationId: location.id, ...cached.sample };
            return;
          }
          try {
            const sample = await fetchCurrentConditions(location.latitude, location.longitude);
            if (!sample) {
              failed.push(location.id);
              return;
            }
            liveConditionsCache.set(location.id, { sample, fetchedAt: now });
            conditions[String(location.id)] = { locationId: location.id, ...sample };
          } catch {
            failed.push(location.id);
          }
        }),
      );

      reply.header('Cache-Control', 'private, max-age=60');
      return reply.send({ conditions, failed } satisfies LocationLiveConditionsResponse);
    },
  );
}
