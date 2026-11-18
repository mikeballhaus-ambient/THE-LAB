import type { ConditionKind } from './index';
import type { WeatherOverlayConfig, WeatherOverlayDescriptor } from './weather-overlays';

/**
 * Weather map configuration.
 *
 * Overlay definitions live in `weather-overlays.ts` — this module re-exports what the shell and
 * map panel need, plus the point-conditions types.
 */
export type WeatherMapConfig = WeatherOverlayConfig & {
  /**
   * Always `true` on the keyless stack. Retained so cached responses and older hosts keep a
   * meaningful shape.
   */
  configured: boolean;
  /** Radar/conditions attribution the map must display. */
  attribution: string;
  pointSource: 'open-meteo';
  tileSource: 'iem-nexrad';
  /** US states for the city picker, so the client does not duplicate the list. */
  states: Array<{ code: string; name: string }>;
};

export type { WeatherOverlayDescriptor };

export interface WeatherMapLayerOption {
  id: string;
  label: string;
}

export interface WeatherMapPointSummary {
  lat: number;
  lon: number;
  tempC: number;
  humidity: number;
  windKph: number;
  description: string;
  condition: ConditionKind;
  /** Provider timestamp for the sampled conditions (ISO 8601), when supplied. */
  observedAt?: string;
}

/**
 * Live conditions for one saved location.
 *
 * Conditions are always live and never persisted — there is no stored snapshot to fall back
 * to, which is deliberate. A persisted "latest" row is what previously let stale seeded data
 * masquerade as current weather.
 */
export interface LocationLiveConditions {
  locationId: number;
  tempC: number;
  humidity: number;
  windKph: number;
  description: string;
  condition: ConditionKind;
  /** Provider timestamp for the sample (ISO 8601). */
  observedAt?: string;
}

export interface LocationLiveConditionsResponse {
  /** Keyed by location id, as a string (JSON object keys). */
  conditions: Record<string, LocationLiveConditions>;
  /** Ids the provider could not resolve. */
  failed: number[];
}

/**
 * A US city resolved from the geocoder.
 *
 * Users cannot be expected to know latitude/longitude, so the shell asks them for a state and
 * city and derives the coordinates. `label` is the display/entity name (`"Denver, CO"`) so the
 * saved location reads the same way it always has.
 */
export interface UsCityOption {
  /** Geocoder id — stable per city, used as the list key. */
  id: number;
  city: string;
  /** Two-letter state code, e.g. `CO`. */
  state: string;
  /** Full state name as returned by the geocoder, e.g. `Colorado`. */
  stateName: string;
  latitude: number;
  longitude: number;
  /** `"Denver, CO"` — what gets written to the location name. */
  label: string;
  /** County/admin2 when the geocoder supplies it. */
  county?: string;
  population?: number;
}

export interface UsCitySearchResponse {
  cities: UsCityOption[];
  /** Present when the provider could not be reached or returned an error. */
  error?: string;
}
