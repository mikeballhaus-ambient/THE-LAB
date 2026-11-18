import { isLabAppPublicPath } from '@/shared/server/lab-app-http-auth';

/**
 * Regression cover for "broken map icons".
 *
 * Leaflet loads radar tiles as `<img src="...">`. Those requests cannot carry an `Authorization`
 * header, so the app-server auth hook rejected them with a JSON 401 — which the browser then
 * masked as opaque-response blocking (ORB), presenting as broken images rather than an auth
 * failure. The tile prefix must therefore be public.
 *
 * The tile route is registered via `createAppServer({ additionalPublicPathPrefixes: [...] })` in
 * the weather app server. This test pins the auth predicate that the hook actually uses.
 */

const WEATHER_TILE_PREFIXES = ['/api/weather/map/tiles/'] as const;
const DEFAULT_PREFIXES = ['/health', '/api/v1/forms/submit/', '/api/v2/forms/submit/'] as const;
const PUBLIC = [...DEFAULT_PREFIXES, ...WEATHER_TILE_PREFIXES];

describe('weather map tile auth', () => {
  test('tile requests are treated as public', () => {
    expect(
      isLabAppPublicPath('/api/weather/map/tiles/nexrad-n0q-900913/5/7/12.png', PUBLIC),
    ).toBe(true);
  });

  test('every time-step layer variant is public', () => {
    for (const layer of [
      'nexrad-n0q-900913',
      'nexrad-n0q-900913-m05m',
      'nexrad-n0q-900913-m10m',
      'nexrad-n0q-900913-m15m',
      'nexrad-n0q-900913-m30m',
    ]) {
      expect(isLabAppPublicPath(`/api/weather/map/tiles/${layer}/6/14/24.png`, PUBLIC)).toBe(
        true,
      );
    }
  });

  test('query strings do not defeat the prefix match', () => {
    expect(
      isLabAppPublicPath('/api/weather/map/tiles/nexrad-n0q-900913/5/7/12.png?v=2', PUBLIC),
    ).toBe(true);
  });

  test('non-tile weather endpoints still require auth', () => {
    // Point lookups and location CRUD go through fetch with a bearer token, so they must NOT
    // be public — the exemption is scoped to the tile prefix only.
    expect(isLabAppPublicPath('/api/weather/map/point', PUBLIC)).toBe(false);
    expect(isLabAppPublicPath('/api/weather/live-conditions', PUBLIC)).toBe(false);
    expect(isLabAppPublicPath('/api/weather/locations', PUBLIC)).toBe(false);
  });

  test('without the exemption the tile path would have been rejected', () => {
    const tilePath = '/api/weather/map/tiles/nexrad-n0q-900913/5/7/12.png';
    expect(isLabAppPublicPath(tilePath, DEFAULT_PREFIXES)).toBe(false);
  });
});
