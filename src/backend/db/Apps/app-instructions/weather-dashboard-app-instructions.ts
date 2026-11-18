/**
 * Agent instructions for the Weather Dashboard catalog app (catalog).
 */
import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const weatherDashboardAppInstructions = `# App System Instructions: Weather Dashboard

## Overview

\`app-weather-dashboard\` is a **hybrid** utilities catalog app for tracking weather across saved locations and exploring **live weather on a map**. UI: \`src/apps/weather-dashboard/front-end/App.vue\` + \`WeatherMapPanel.vue\`; server on **\`props.serverUrl\`** (port **4120**).

**Layout:** map above **Reports**; map and **Saved locations** share one row (map ~2/3, list ~1/3, list scrolls internally; stack below \`xl\`) so the map stays near-square.

**Map stack — fully keyless:** Leaflet + OpenStreetMap base tiles; **IEM** overlay catalog; **Open-Meteo** current conditions for click-to-probe. **Click the map** to zoom in and load conditions at that point. Saved locations render as markers. Popups use light chrome on purpose — Leaflet's hard-coded white bubble would otherwise paint shell-inherited near-white text on white.

### Overlays

Declared in \`shared/types/weather-overlays.ts\` — the **only** place to add a layer. Categories:

| Group | Layers | Kind |
|---|---|---|
| Radar | \`nexrad-n0q\`, \`q2-hsr\` | animated, −0…−55 min in 5-min steps |
| Precipitation | \`q2-p24h\`, \`q2-p48h\`, \`q2-p72h\` | static |
| Satellite | \`conus-goes-ir-4km\`, \`goes-east-vis-1km\` | static |

**Every layer needs a \`-900913\` (EPSG:3857) variant** — Leaflet's CRS. A layer in another projection renders misaligned. Verify with \`curl\` before adding.

Animated overlays auto-play; controls are play/pause, scrubber, speed 0.5×–4×. Rendering uses **two alternating tile layers** (one loading, one visible) because swapping \`src\` on a single layer flickers on every frame.

### Forecast overlays — implemented (WMS)

HRRR forecast reflectivity + precipitation, now through **+18 h** in 15-minute steps.

These are **not** served by the IEM tile cache — \`hrrr-refd\` is virtual and throws \`TileCacheLayerNotFoundException … name overloads\`. No URL-suffix form works. The addressing comes from IEM's \`tilecache.cfg\`: one WMS mapfile (\`/opt/iem/data/wms/model/hrrr_refd.map\`) with **one layer name per forecast step** (\`refd_0000\` … \`refd_2160\`).

Fetch via \`GET /api/weather/map/forecast/:overlayId/:forecast/:z/:x/:y.png\`, which converts z/x/y to an EPSG:3857 bbox (MapServer needs a bbox) and builds \`refd_\` + zero-padded minutes. Add forecast layers by declaring \`kind: 'forecast'\` + \`wms: { mapfile, layerPrefix }\` in \`weather-overlays.ts\`; nothing else changes.

Forecast frames use **negative** \`offsetMinutes\` so the shared label renders \`+3 h\` vs radar's \`−15 min\`.

**Config:** none. No API key required. \`OPENWEATHERMAP_API_KEY\` is no longer read by this app.

OWM's cloud / temperature / pressure / wind overlays were **removed**: IEM publishes no areal rasters for them. Do not reintroduce a keyed provider to restore them — point conditions are unaffected because Open-Meteo is global (ASOS/METAR is US-only).

## Data model

- **Locations** — name, latitude, longitude (\`weather_locations\`).
- **Observations** — location, condition (\`clear\` | \`partly-cloudy\` | \`cloudy\` | \`rain\` | \`snow\` | \`storm\` | \`fog\` | \`wind\`), temp °C, humidity %, wind kph, observed-at (\`weather_observations\`).

## API (app server, REST)

- \`GET /api/weather/locations\` — \`{ locations }\` with latest observation per row.
- \`GET /api/weather/locations/:id/history\` — \`{ history }\`.
- \`POST/DELETE /api/weather/locations[/:id]\`.
- \`POST/DELETE /api/weather/observations[/:id]\`.
- \`GET /api/weather/map/config\` — radar layers, attribution, provider tags (\`pointSource\`, \`tileSource\`). \`configured\` is always \`true\`.
- \`GET /api/weather/map/tiles/:layer/:z/:x/:y.png\` — proxied IEM NEXRAD tile, \`Cache-Control: max-age=300\`.
- \`GET /api/weather/map/point?lat=&lon=\` — current conditions at coordinates (Open-Meteo), \`Cache-Control: max-age=120\`. Maps WMO 4677 \`weather_code\` → \`ConditionKind\`.

## Integration (rm-64)

Host \`app-weather-dashboard\`, surface \`weather-dashboard.workspace\`. \`CatalogIntegrationHost\` + \`CatalogReportsPanel\`.

### Forms Builder

| Entity | \`entityKey\` | Segment | UI |
|--------|---------------|---------|-----|
| Location (primary) | \`location\` | \`locations\` | **City picker** → \`openPrimaryCreate(preset)\` / \`openPrimaryEdit(id, preset)\`; card **pencil** / **trash** |

**City picker is mandatory for create and edit.** Users cannot know a city's lat/long, so
\`CityPickerDialog\` resolves a US state + city into \`{ name, latitude, longitude }\` and only then
opens the Forms Builder binding with those values pre-filled. Do not wire the toolbar button or
the pencil straight to \`openPrimary*\` — that would ask users to type coordinates.

Pre-fill path: \`CatalogIntegrationHost.setPresetValues()\` → \`formPresetValues\` in the
integration context → \`resolveFormBindingRuntime()\` → \`useConnectorFormPanel\`, which applies
presets **after** connector hydration so edit mode is covered too.

Geocoding: \`GET /api/weather/geo/cities?q=&state=\` (Open-Meteo, keyless, US-only). State list
comes from \`/api/weather/map/config\`.

**Locations are the only persisted entity.** There is no observation entity, table, or connector
segment. Conditions are always live; the earlier \`weather_observations\` log and its \`Log\` button
were removed because persisted snapshots read as current weather when they are not. Do not
reintroduce condition storage.

Shell shows latest observation per location; history via \`GET .../history\`.

Edit prefill comes from the slot's \`contextKeys\`: catalog manifests emit \`[...parentKeys, idContextKey]\`, and the runtime reads the **last** key as the record id. A new catalog host therefore needs no per-slot wiring for edit/delete.

### Chart Builder

**None.** The \`reports.observations-by-condition\` pie was removed — it restated a handful of user-entered observations and added no signal. Do not re-add a chart slot without a real signal to show. Existing installs drop the stale seed binding via \`OBSOLETE_CATALOG_SLOTS\` in \`catalog-manifests.ts\`.

### Current conditions

Cards render **live conditions only**, always:

| Source | Refresh |
|---|---|
| \`GET /api/weather/live-conditions\` → Open-Meteo, 5-min server cache | polled every 5 min, plus on Refresh |

There is no fallback to a saved observation. If the provider fails, the card says
"Current conditions unavailable." — it never substitutes stale or seeded data, which is exactly
the bug that made Denver read \`-1.5 °C · snow\` in October.

**Units:** stored/transported as degrees C and km/h (\`temp_c\`, \`wind_kph\`); **displayed in °F and mph** via \`front-end/utils/temperature.ts\`. Convert at the edge only.

### Per-location forecast

Card **7-day forecast** link → \`LocationForecastDialog\` → \`GET /api/weather/locations/:id/forecast?days=7\` (Open-Meteo \`daily\`, 30-min server cache, days clamped 1–16).

\`timezone=auto\` returns dates in the **location's** zone so "Today" means today there — do not switch to UTC. Missing daily values map to \`NaN\`/\`null\`, never \`0\`.

The dialog follows the non-Forms-Builder styling rule (see AGENTS.md): \`lab-app-dialog lab-form-runtime\` + chrome tokens + \`:global()\` selectors, because PrimeVue teleports to \`<body>\`.

### HTTP

\`catalogAppRequest\` (Bearer JWT).

## Automation scope

- Root class \`weather-dashboard-app\`. All controls use \`useUniqueElementId()\`. \`lab-*\` theming.

${formatCatalogHostRecordAutomationSection({
  appId: 'app-weather-dashboard',
  displayName: 'Weather Dashboard',
  contextAreaClass: 'weather-dashboard-app',
  primaryRecordLabel: 'city name',
})}

User doc: \`docs/apps/weather-dashboard.md\`.
`;
