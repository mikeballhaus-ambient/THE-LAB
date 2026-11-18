# Weather Dashboard (`app-weather-dashboard`)

Hybrid utilities app for saved locations and a live **weather map**.

## Layout

- **Weather map first**; it is the only content below the header.
- **Map and Saved locations share one row** (`xl` and up): map takes ~2/3, the location list ~1/3
  and scrolls internally. Below `xl` they stack. The two-column split keeps the map close to
  square instead of a full-width letterbox.
- Each location card: **current conditions** only — temperature, condition, humidity, wind.
  Actions are **pencil** (change location) and **trash** (delete location).

## Adding / changing a location

Users cannot be expected to know a city's latitude and longitude, so **neither create nor edit
opens the Forms Builder form directly**. Both go through a city picker first:

1. **New location** (or the card **pencil**) opens `CityPickerDialog`.
2. Pick a **US state** (optional filter) and type a **city** — the search is debounced and
   results show county plus resolved coordinates.
3. **Continue** resolves `{ name, latitude, longitude }` and opens the real location binding with
   those values pre-filled. The user can still adjust them in the form.

`name` is written as `"City, ST"` (e.g. `Denver, CO`) so cards read the same way as seeded rows.

### How the pre-fill works

`CatalogIntegrationHost` exposes `setPresetValues()` / `openPrimaryCreate(preset)` /
`openPrimaryEdit(id, preset)`. Presets travel as `formPresetValues` in the integration context and
are merged into `presetValues` by `resolveFormBindingRuntime()`.

Presets are applied **after** connector hydration in `useConnectorFormPanel`, which matters for
edit: previously presets were skipped entirely whenever a record id was present.

Geocoding is keyless (Open-Meteo) and proxied by the app server at
`GET /api/weather/geo/cities?q=&state=`. The state list ships in `/api/weather/map/config` so the
client does not duplicate it.
- All temperatures display in **°F** and wind in **mph**. Storage and transport stay in °C / kph
  (`temp_c`, `wind_kph`); conversion happens only in the UI layer.

## Current conditions are always live

Card data comes from `GET /api/weather/live-conditions` (Open-Meteo), polled every 5 minutes and
on **Refresh**. The server caches per location for 5 minutes.

There is **no condition storage at all**. `weather_locations` (name, lat, lon) is the only
persisted entity — it is configuration, not data. The former `weather_observations` table, its
`/history` endpoint, the `Log` action, and the `weather-observation` Forms Builder entity were
all removed. Conditions are fetched, never saved, so there is nothing stale to display.

## Per-location forecast

Each location card has a **7-day forecast** link opening `LocationForecastDialog`:

- Source: Open-Meteo `daily` block — `weather_code`, `temperature_2m_max/_min`,
  `precipitation_probability_max`, `wind_speed_10m_max`
- `GET /api/weather/locations/:id/forecast?days=7` (server caches 30 min, clamps days to 1–16)
- **`timezone=auto`** is deliberate: dates come back in the location's own zone, so "Today" means
  today *there*. Requesting UTC would shift the first/last day for distant locations.
- Missing values map to `NaN`/`null`, never `0` — a 0 °C day would read as real data.

The dialog follows the project rule for hand-built dialogs: `lab-app-dialog lab-form-runtime` +
integration chrome tokens, with `:global()` selectors because PrimeVue teleports to `<body>`.

## Reports

The **observations-by-condition** pie chart was removed. It restated a handful of
user-entered observations and added no signal. `OBSOLETE_CATALOG_SLOTS` in the catalog manifest
prune list removes the leftover seed binding on existing databases.

## Demo seed

Three locations seeded on first run: **Denver, CO**, **San Jose, CA**, **Washington, DC**.
Only the locations are meaningful now — seeded observations are inert legacy data that the UI no
longer displays.

## Map

Fully keyless — **no API key or account is required**.

- **Base map:** [OpenStreetMap](https://www.openstreetmap.org/) tiles via Leaflet.
- **Overlays:** [Iowa Environmental Mesonet](https://mesonet.agron.iastate.edu/) tile cache,
  Web-Mercator (`-900913`) XYZ PNGs:

  | Group | Layer | Kind |
  |---|---|---|
  | Radar | Composite reflectivity (`nexrad-n0q`) | animated, −0…−55 min in 5-min steps |
  | Radar | Storm relative (`q2-hsr`) | animated, same cadence |
  | Precipitation | Accumulation 24 / 48 / 72 h (`q2-p24h` / `q2-p48h` / `q2-p72h`) | static |
  | Satellite | GOES infrared (`conus-goes-ir-4km`) | static |
  | Satellite | GOES visible (`goes-east-vis-1km`) | static |

  **Every layer must have a `-900913` variant.** Leaflet's CRS is EPSG:3857; a layer published
  only in another projection renders misaligned against the OSM base map. The catalog in
  [`weather-overlays.ts`](../src/apps/weather-dashboard/shared/types/weather-overlays.ts) is the
  single place layers are declared — adding one requires no other change.
- **Point conditions:** [Open-Meteo](https://open-meteo.com/) current conditions by lat/lon —
  global, so any saved location resolves.
- **Interaction:** Click anywhere on the map to zoom in and fetch current conditions at that
  point. Saved locations appear as markers; click a marker to focus the map.

### Animated overlays

Animated layers loop automatically on open. Controls sit above the map:

| Control | Behaviour |
|---|---|
| **Play / pause** | Toggles the loop |
| **Scrubber** | Drag to any frame; scrubbing pauses playback |
| **Speed** | 0.5× / 1× / 2× / 4× — changing it mid-play restarts the timer at the new rate |

Frames come from `GET /api/weather/map/frames?overlay=<id>`; the client never hardcodes offsets.
Rendering uses **two tile layers alternated per frame** (one loading, one visible) — swapping
`src` on a single layer blanks it while new tiles load, which flickers on every frame.

`validAt` is derived from the offset at request time, so the label reads "−15 min" rather than
claiming an exact scan time IEM does not expose.

### Upstream proxying

Both upstreams are proxied through the app server, which sets polite cache headers (5 minutes for
tiles, 1 minute for frame lists, 2 minutes for conditions) and identifies itself with a
`User-Agent`. The tile route only serves catalog layers and catalog frames, so it cannot be used
to reach arbitrary upstream paths.

### Attribution

Displayed on the map and required by the upstream terms:

```
Radar © Iowa Environmental Mesonet · Conditions © Open-Meteo
```

## What was removed

The previous integration used OpenWeatherMap Weather Maps 1.0, which required a paid API key.
That offered cloud, temperature, pressure and wind rasters in addition to precipitation. IEM
publishes **no areal rasters** for those four, so they remain unavailable — but radar animation,
**precipitation accumulation**, and **satellite** were gained in exchange. Point conditions did
not lose any capability: Open-Meteo is global, whereas ASOS/METAR (the other keyless option) is
US-only.

### Forecast overlays — implemented

**HRRR forecast reflectivity and precipitation** are available, now through **+18 h in 15-minute
steps** (73 frames).

The tile cache cannot serve these. `hrrr-refd` is a *virtual* layer:

```
TileCacheLayerNotFoundException: Layer hrrr-refd can not be called directly,
it is virtual and needs to be called with name overloads.
```

No URL-suffix form works (`…/hrrr-refd/refd_0000/…`, timestamps, numeric indices, `-900913` — all
404). The resolution came from IEM's own `tilecache.cfg`, which shows the layer is one WMS
mapfile with **one layer name per forecast step**:

```ini
[hrrr-refd]
type=WMS
metadata_baseurl=http://iem-backend.local/cgi-bin/mapserv/mapserv.fcgi?map=/opt/iem/data/wms/model/hrrr_refd.map&transparent=true&
layers=refd_0000
```

So forecast tiles are fetched from the **mapserv WMS endpoint**, not the tile cache:

```
GET /api/weather/map/forecast/:overlayId/:forecast/:z/:x/:y.png
```

The proxy converts Leaflet's `z/x/y` into an EPSG:3857 bbox (MapServer requires a bbox, not a
tile index), resolves `refd_` + zero-padded minutes (`refd_0180` = +3 h), and caches the result.
Available layer names were read from each mapfile's `GetCapabilities`; `refd_0000` … `refd_2160`
(+36 h) exist, and the app exposes the first 18 h where 15-minute granularity is genuine.

Forecast frames carry a **negative** `offsetMinutes`, so the shared label logic renders `+3 h`
while past radar frames render `−15 min` — one code path, no special-casing in the UI.

## Configuration

None. `OPENWEATHERMAP_API_KEY` is no longer read by this app and can be deleted from `.env`.

## Data

Locations and observations remain in the app SQLite database. The map uses external services
only for live radar tiles and point lookups — it does not replace saved observations.

## Failure modes

| Symptom | Cause |
|---|---|
| `tile_fetch_failed` / blank overlay | IEM unreachable or timed out (8 s budget) |
| `weather_fetch_failed` | Open-Meteo unreachable or returned non-JSON |
| `weather_unavailable` | Open-Meteo responded without a `current` block |

Radar is US-only coverage; the base map and point conditions still work worldwide.
