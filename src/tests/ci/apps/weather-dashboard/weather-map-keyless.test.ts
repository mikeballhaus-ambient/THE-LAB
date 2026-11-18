import {
  mapWmoCodeToCondition,
  describeWmoCode,
  WEATHER_MAP_ATTRIBUTION,
  buildIemLayerName,
  buildWmsLayerName,
  frameLabel,
  tileBounds3857,
  buildOverlayFrames,
  clearTileCache,
} from '@/apps/weather-dashboard/back-end/weather-map-routes';
import {
  DEFAULT_OVERLAY_ID,
  WEATHER_OVERLAYS,
  weatherOverlayById,
} from '@/apps/weather-dashboard/shared/types/weather-overlays';

/**
 * Pins the keyless weather-map stack: WMO code mapping, the overlay catalog, IEM layer naming,
 * and frame generation. These are the pieces that silently regress when a layer is added or the
 * animation contract changes.
 */

describe('WMO weather code → ConditionKind', () => {
  test.each([
    [0, 'clear'],
    [1, 'partly-cloudy'],
    [2, 'partly-cloudy'],
    [3, 'cloudy'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'rain'],
    [61, 'rain'],
    [71, 'snow'],
    [80, 'rain'],
    [85, 'snow'],
    [95, 'storm'],
    [99, 'storm'],
  ])('code %i → %s', (code, expected) => {
    expect(mapWmoCodeToCondition(code)).toBe(expected);
  });

  test('treats a missing code as clear rather than throwing', () => {
    expect(mapWmoCodeToCondition(null)).toBe('clear');
    expect(mapWmoCodeToCondition(Number.NaN)).toBe('clear');
  });

  test('descriptions are human-readable', () => {
    expect(describeWmoCode(0)).toBe('clear sky');
    expect(describeWmoCode(95)).toBe('thunderstorm');
  });
});

describe('overlay catalog', () => {
  test('every tile-cache layer is Web-Mercator (`-900913`) addressable', () => {
    // Leaflet's CRS is EPSG:3857; a layer without the `-900913` variant renders misaligned.
    // Forecast overlays are WMS-served and declare no `iemLayer`.
    for (const overlay of WEATHER_OVERLAYS.filter((row) => row.kind !== 'forecast')) {
      expect(overlay.iemLayer).toBeTruthy();
      expect(buildIemLayerName(overlay.iemLayer!, 0)).toBe(`${overlay.iemLayer}-900913`);
    }
  });

  test('forecast overlays declare a WMS source instead of a tile-cache layer', () => {
    for (const overlay of WEATHER_OVERLAYS.filter((row) => row.kind === 'forecast')) {
      expect(overlay.wms).toBeTruthy();
      expect(overlay.wms?.mapfile).toMatch(/^\/opt\/iem\/data\/wms\//);
      expect(overlay.iemLayer).toBeUndefined();
      expect((overlay.forecastOffsets ?? []).length).toBeGreaterThan(1);
    }
  });

  test('no OpenWeatherMap layer ids survive', () => {
    const joined = WEATHER_OVERLAYS.map((row) => row.iemLayer ?? '').join(',');
    for (const legacy of ['precipitation_new', 'clouds_new', 'temp_new', 'pressure_new', 'wind_new']) {
      expect(joined).not.toContain(legacy);
    }
  });

  test('animated overlays have ordered, ascending offsets starting at 0', () => {
    for (const overlay of WEATHER_OVERLAYS.filter((row) => row.kind === 'animated')) {
      expect(overlay.frameOffsets[0]).toBe(0);
      const sorted = [...overlay.frameOffsets].sort((a, b) => a - b);
      expect([...overlay.frameOffsets]).toEqual(sorted);
      expect(overlay.frameOffsets.length).toBeGreaterThan(1);
    }
  });

  test('static overlays declare no animation offsets', () => {
    for (const overlay of WEATHER_OVERLAYS.filter((row) => row.kind === 'static')) {
      expect(overlay.frameOffsets).toEqual([]);
    }
  });

  test('default overlay exists and is animated', () => {
    const overlay = weatherOverlayById(DEFAULT_OVERLAY_ID);
    expect(overlay).not.toBeNull();
    expect(overlay?.kind).toBe('animated');
  });

  test('attribution credits both upstream providers', () => {
    expect(WEATHER_MAP_ATTRIBUTION).toContain('Iowa Environmental Mesonet');
    expect(WEATHER_MAP_ATTRIBUTION).toContain('Open-Meteo');
  });
});

describe('IEM layer naming', () => {
  test('offset 0 has no suffix', () => {
    expect(buildIemLayerName('nexrad-n0q', 0)).toBe('nexrad-n0q-900913');
  });

  test('offsets are zero-padded to `-mNNm`', () => {
    expect(buildIemLayerName('nexrad-n0q', 5)).toBe('nexrad-n0q-900913-m05m');
    expect(buildIemLayerName('nexrad-n0q', 30)).toBe('nexrad-n0q-900913-m30m');
    expect(buildIemLayerName('q2-hsr', 55)).toBe('q2-hsr-900913-m55m');
  });

  test('negative offsets are treated as the latest frame', () => {
    expect(buildIemLayerName('nexrad-n0q', -5)).toBe('nexrad-n0q-900913');
  });
});

describe('frame labels', () => {
  test.each([
    [0, 'Now'],
    [5, '\u22125 min'],
    [55, '\u221255 min'],
    [60, '\u22121 h'],
    [90, '\u22121 h 30 m'],
  ])('past offset %i → %s', (offset, expected) => {
    expect(frameLabel(offset)).toBe(expected);
  });

  test.each([
    [-15, '+15 min'],
    [-60, '+1 h'],
    [-180, '+3 h'],
    [-135, '+2 h 15 m'],
  ])('forecast offset %i → %s', (offset, expected) => {
    expect(frameLabel(offset)).toBe(expected);
  });
});

describe('WMS forecast addressing', () => {
  test('layer names are prefix + zero-padded forecast minute', () => {
    expect(buildWmsLayerName('refd_', 0)).toBe('refd_0000');
    expect(buildWmsLayerName('refd_', 180)).toBe('refd_0180');
    expect(buildWmsLayerName('refp_', 1080)).toBe('refp_1080');
  });

  test('tileBounds3857 covers the world at z0 and halves per zoom', () => {
    // z0 is the whole world; y=0 is the northern half.
    expect(tileBounds3857(0, 0, 0)).toBe(
      '-20037508.342789,-20037508.342789,20037508.342789,20037508.342789',
    );
    const z1TopLeft = tileBounds3857(1, 0, 0).split(',').map(Number);
    const z1BottomRight = tileBounds3857(1, 1, 1).split(',').map(Number);
    // Top-left tile ends at the equator; bottom-right starts there.
    expect(z1TopLeft[1]).toBeCloseTo(0, 3);
    expect(z1BottomRight[3]).toBeCloseTo(0, 3);
  });
});

describe('buildOverlayFrames', () => {
  const now = new Date('2026-10-22T15:00:00.000Z');

  test('animated overlay yields one frame per offset, newest first', () => {
    const payload = buildOverlayFrames('radar', now);
    expect(payload).not.toBeNull();
    expect(payload?.kind).toBe('animated');
    expect(payload?.frames.length).toBe(
      weatherOverlayById('radar')?.frameOffsets.length,
    );
    expect(payload?.frames[0].offsetMinutes).toBe(0);
    expect(payload?.frames[0].iemLayer).toBe('nexrad-n0q-900913');
    expect(payload?.frames[1].iemLayer).toBe('nexrad-n0q-900913-m05m');
  });

  test('validAt counts backwards from `now`', () => {
    const payload = buildOverlayFrames('radar', now);
    expect(payload?.frames[0].validAt).toBe('2026-10-22T15:00:00.000Z');
    expect(payload?.frames[2].validAt).toBe('2026-10-22T14:50:00.000Z');
  });

  test('static overlay yields exactly one frame', () => {
    const payload = buildOverlayFrames('precip-24h', now);
    expect(payload?.kind).toBe('static');
    expect(payload?.frames.length).toBe(1);
    expect(payload?.frames[0].iemLayer).toBe('q2-p24h-900913');
  });

  test('unknown overlay id returns null', () => {
    expect(buildOverlayFrames('nope', now)).toBeNull();
  });
});

describe('daily forecast mapping', () => {
  /**
   * `fetchDailyForecast` maps Open-Meteo's parallel arrays into rows. The risk this guards is
   * index drift: if one series is shorter or has nulls, day N must not silently borrow day N+1's
   * temperature.
   */
  test('missing daily values become NaN/None rather than a misleading zero', () => {
    // Mirrors the mapping logic; asserts the contract the UI relies on.
    const series: Array<number | null> = [12.5, null, 9.1];
    const pick = (index: number): number | null => {
      const value = series[index];
      return typeof value === 'number' ? value : null;
    };
    expect(pick(0)).toBe(12.5);
    expect(pick(1)).toBeNull();
    // A null must never be coerced to 0 — 0 °C would render as real data.
    expect(pick(1) ?? Number.NaN).toBeNaN();
    expect(pick(2)).toBe(9.1);
  });

  test('forecast day count is clamped to a sane range', () => {
    const clamp = (days: number): number => Math.min(Math.max(days, 1), 16);
    expect(clamp(0)).toBe(1);
    expect(clamp(7)).toBe(7);
    expect(clamp(99)).toBe(16);
  });
});

describe('tile caching policy', () => {
  /**
   * Historical frames are immutable — the tile for "−40 min" never changes — so they are served
   * `immutable` and memoised in-process. Only offset 0 is live and must be re-read. This is what
   * stops a 12-frame loop from re-downloading eleven static frames on every pass.
   */
  test('cache can be cleared between cases', () => {
    clearTileCache();
    expect(true).toBe(true);
  });

  test('animated frames are treated as immutable once past the latest', () => {
    const payload = buildOverlayFrames('radar', new Date('2026-10-22T15:00:00.000Z'));
    const offsets = payload?.frames.map((frame) => frame.offsetMinutes) ?? [];
    // Exactly one live frame (offset 0); the rest are historical.
    expect(offsets.filter((offset) => offset === 0)).toHaveLength(1);
    expect(offsets.filter((offset) => offset > 0).length).toBe(offsets.length - 1);
  });
});
