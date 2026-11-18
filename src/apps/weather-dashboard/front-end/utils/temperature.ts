/**
 * The app stores and transports Celsius (the observation column is `temp_c` and the
 * provider reports Celsius). The UI reads imperial, so conversion happens at the edge
 * and nowhere else.
 */
export function toFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** `72°F` — rounded, for dense card and popup copy. */
export function formatTempF(celsius: number | null | undefined): string {
  if (celsius == null || !Number.isFinite(celsius)) {
    return '—';
  }
  return `${Math.round(toFahrenheit(celsius))}°F`;
}

/** `72.4°F` — one decimal, for saved-observation rows where precision is meaningful. */
export function formatTempFPrecise(celsius: number | null | undefined): string {
  if (celsius == null || !Number.isFinite(celsius)) {
    return '—';
  }
  return `${toFahrenheit(celsius).toFixed(1)}°F`;
}

/** Wind is transported in km/h; the UI reads mph. */
export function formatWindMph(kph: number | null | undefined): string {
  if (kph == null || !Number.isFinite(kph)) {
    return '—';
  }
  return `${Math.round(kph * 0.621371)} mph`;
}
