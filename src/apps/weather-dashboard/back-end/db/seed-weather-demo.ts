import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY } from '@/shared/config/demo-data-cast';
import { insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const WEATHER_DEMO_PACK_ID = 'weather-demo';
export const WEATHER_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.WEATHER_DASHBOARD_DEMO;

/**
 * Seed revision. Bump when the demo *locations* change.
 *
 * `shouldSkipDemoSeed()` short-circuits on `ledger.has()`, so an existing install would keep
 * the original Denver/Seattle/Austin rows forever. Tracking the revision in the boot-flag table
 * lets an upgraded install replace the previous demo locations instead of silently keeping them.
 */
const WEATHER_DEMO_SEED_REVISION = 2;
const WEATHER_DEMO_REVISION_FLAG = `${WEATHER_DEMO_BOOT_FLAG}:revision`;

function needsDemoRevisionRefresh(db: Database): boolean {
  try {
    const row = db
      .prepare('SELECT value FROM configs WHERE key = ? LIMIT 1')
      .get(WEATHER_DEMO_REVISION_FLAG) as { value?: string } | undefined;
    const applied = Number.parseInt(row?.value ?? '', 10);
    return !Number.isFinite(applied) || applied < WEATHER_DEMO_SEED_REVISION;
  } catch {
    // No configs table yet (fresh DB) — treat as needing a seed.
    return true;
  }
}

function recordDemoRevision(db: Database): void {
  db.prepare(
    `INSERT INTO configs (key, value, type, description, updated_at)
     VALUES (?, ?, 'number', 'Weather demo seed revision', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(WEATHER_DEMO_REVISION_FLAG, String(WEATHER_DEMO_SEED_REVISION));
}

interface LocationSpec {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Three saved locations. That is the whole seed.
 *
 * Conditions are always live, so seeding observation snapshots would only create data that
 * looks current but isn't — the exact failure mode that had Denver reporting -1.5 °C in October.
 */
const LOCATIONS: readonly LocationSpec[] = [
  { name: 'Denver, CO', latitude: 39.7392, longitude: -104.9903 },
  { name: 'San Jose, CA', latitude: 37.3382, longitude: -121.8863 },
  { name: 'Washington, DC', latitude: 38.9072, longitude: -77.0369 },
];

export function hasWeatherDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, WEATHER_DEMO_PACK_ID).has();
}

export interface SeedWeatherDemoResult {
  inserted: number;
}

export function seedWeatherDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedWeatherDemoResult {
  const ledger = new DemoSeedLedger(db, WEATHER_DEMO_PACK_ID);

  // A revision bump supersedes the old demo locations: remove only the rows this pack created,
  // then fall through to a fresh seed. User-added locations are untouched (ledger-tracked only).
  if (needsDemoRevisionRefresh(db)) {
    if (ledger.has()) {
      ledger.deleteTracked(['weather_locations']);
    }
  } else if (shouldSkipDemoSeed(db, ledger, WEATHER_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  let inserted = 0;

  LOCATIONS.forEach((location, locationIndex) => {
    const locationId = insertRow(db, 'weather_locations', {
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      order: locationIndex,
      created_at: `${DEMO_TODAY}T08:00:00`,
    });
    ledger.track('weather_locations', locationId);
    inserted += 1;
  });

  recordDemoRevision(db);
  return { inserted };
}

export function removeWeatherDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, WEATHER_DEMO_PACK_ID);
  return ledger.deleteTracked(['weather_locations']);
}

/** Location names in the demo pack (order is significant to the test). */
export function weatherDemoLocationNames(): string[] {
  return LOCATIONS.map((l) => l.name);
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const weatherDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: WEATHER_DEMO_BOOT_FLAG,
  has: hasWeatherDemoDataset,
  seed: seedWeatherDemoIfMissing,
};
