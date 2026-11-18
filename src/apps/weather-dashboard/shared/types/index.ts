export type ConditionKind =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'fog'
  | 'wind';

export interface WeatherLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  createdAt: string;
}

export interface UpsertLocationInput {
  name: string;
  latitude: number;
  longitude: number;
}

export type {
  LocationLiveConditions,
  LocationLiveConditionsResponse,
  UsCityOption,
  UsCitySearchResponse,
  WeatherMapConfig,
  WeatherMapLayerOption,
  WeatherMapPointSummary,
} from './weather-map';
export type {
  WeatherOverlayDescriptor,
  WeatherOverlayFramesResponse,
  WeatherOverlayFrame,
  WeatherOverlayGroup,
  WeatherOverlayId,
  WeatherOverlayKind,
} from './weather-overlays';
export type {
  DailyForecastDay,
  LocationForecast,
  LocationForecastResponse,
} from './weather-forecast';
export {
  DEFAULT_OVERLAY_ID,
  WEATHER_OVERLAYS,
  weatherOverlayById,
} from './weather-overlays';
