import type { ConditionKind } from './index';

/**
 * Multi-day outlook for a saved location.
 *
 * Sourced from Open-Meteo's `daily` block (keyless). Dates come back in the **location's own
 * timezone** (`timezone=auto`), so "Friday" means Friday where the location is — not where the
 * user is browsing from. That matters for the first and last day at the edges of the range.
 */
export interface DailyForecastDay {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** WMO-derived coarse condition, matching the live-conditions vocabulary. */
  condition: ConditionKind;
  description: string;
  tempMaxC: number;
  tempMinC: number;
  /** Percent, 0–100. May be null when the model has no value for that day. */
  precipitationChance: number | null;
  windMaxKph: number;
}

export interface LocationForecast {
  locationId: number;
  /** IANA zone reported by the provider, e.g. `America/Denver`. */
  timezone: string;
  days: DailyForecastDay[];
  fetchedAt: string;
}

export interface LocationForecastResponse {
  forecast: LocationForecast | null;
  /** Present when the provider could not be reached or returned an error. */
  error?: string;
}
