import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type {
  LocationForecastResponse,
  LocationLiveConditionsResponse,
  UsCityOption,
  UsCitySearchResponse,
  WeatherLocation,
  WeatherMapConfig,
  WeatherMapPointSummary,
  WeatherOverlayFramesResponse,
} from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'WEATHER', init);
}

export const listLocations = (base: string): Promise<WeatherLocation[]> =>
  request<{ locations: WeatherLocation[] }>(base, '/api/weather/locations').then(
    (r) => r.locations,
  );

export const fetchMapConfig = (base: string): Promise<WeatherMapConfig> =>
  request<WeatherMapConfig>(base, '/api/weather/map/config');

/** Ordered animation frames for one overlay (single frame for `static` overlays). */
export const fetchOverlayFrames = (
  base: string,
  overlayId: string,
): Promise<WeatherOverlayFramesResponse> => {
  const params = new URLSearchParams({ overlay: overlayId });
  return request<WeatherOverlayFramesResponse>(
    base,
    `/api/weather/map/frames?${params.toString()}`,
  );
};

/** Live conditions for all saved locations (server caches for 5 minutes). */
export const fetchLiveConditions = (base: string): Promise<LocationLiveConditionsResponse> =>
  request<LocationLiveConditionsResponse>(base, '/api/weather/live-conditions');

/** Multi-day outlook for one location (server caches for 30 minutes). */
export const fetchLocationForecast = (
  base: string,
  locationId: number,
  days = 7,
): Promise<LocationForecastResponse> =>
  request<LocationForecastResponse>(
    base,
    `/api/weather/locations/${locationId}/forecast?days=${days}`,
  );

/** US city lookup — the user picks state + city and we derive lat/lon. */
export const searchUsCities = (
  base: string,
  query: string,
  stateCode?: string,
): Promise<UsCitySearchResponse> => {
  const params = new URLSearchParams({ q: query });
  if (stateCode) {
    params.set('state', stateCode);
  }
  return request<UsCitySearchResponse>(base, `/api/weather/geo/cities?${params.toString()}`);
};

export type { UsCityOption };

export const fetchMapPoint = (
  base: string,
  lat: number,
  lon: number,
): Promise<WeatherMapPointSummary> => {
  const q = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  return request<WeatherMapPointSummary>(base, `/api/weather/map/point?${q.toString()}`);
};

export const deleteLocation = (base: string, id: number): Promise<void> =>
  request(base, `/api/weather/locations/${id}`, { method: 'DELETE' }).then(() => undefined);
