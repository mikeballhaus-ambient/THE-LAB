/**
 * Weather Dashboard data layer — saved locations only.
 *
 * Conditions are **always live** (Open-Meteo, see `weather-map-routes.ts`) and are never
 * persisted. Earlier revisions also stored user-entered observations snapshots; that table was
 * removed because stale rows inevitably get mistaken for current weather.
 */
import type { Database } from 'better-sqlite3';
import type { UpsertLocationInput, WeatherLocation } from '../shared/types';

interface LocationRow {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  created_at: string;
}

export function bootstrapWeatherTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS weather_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      latitude REAL NOT NULL DEFAULT 0,
      longitude REAL NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  // Drop the retired observation log if an older install still carries it.
  db.exec(`DROP TABLE IF EXISTS weather_observations;`);
}

function mapLocation(row: LocationRow): WeatherLocation {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    order: row.order,
    createdAt: row.created_at,
  };
}

export class WeatherRepository {
  constructor(private readonly db: Database) {}

  listLocations(): WeatherLocation[] {
    const rows = this.db
      .prepare(`SELECT * FROM weather_locations ORDER BY "order" ASC, id ASC`)
      .all() as LocationRow[];
    return rows.map(mapLocation);
  }

  getLocation(id: number): WeatherLocation | null {
    const row = this.db
      .prepare(`SELECT * FROM weather_locations WHERE id = ?`)
      .get(id) as LocationRow | undefined;
    return row ? mapLocation(row) : null;
  }

  updateLocation(id: number, input: UpsertLocationInput): WeatherLocation | null {
    if (!this.db.prepare(`SELECT id FROM weather_locations WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(`UPDATE weather_locations SET name = ?, latitude = ?, longitude = ? WHERE id = ?`)
      .run(input.name.trim(), input.latitude, input.longitude, id);
    return this.getLocation(id);
  }

  createLocation(input: UpsertLocationInput): WeatherLocation {
    const nextOrder =
      (
        this.db.prepare(`SELECT COALESCE(MAX("order"), -1) + 1 AS n FROM weather_locations`).get() as {
          n: number;
        }
      ).n ?? 0;
    const info = this.db
      .prepare(`INSERT INTO weather_locations (name, latitude, longitude, "order") VALUES (?, ?, ?, ?)`)
      .run(input.name.trim(), input.latitude, input.longitude, nextOrder);
    return mapLocation(
      this.db.prepare(`SELECT * FROM weather_locations WHERE id = ?`).get(info.lastInsertRowid) as LocationRow,
    );
  }

  deleteLocation(id: number): boolean {
    return this.db.prepare(`DELETE FROM weather_locations WHERE id = ?`).run(id).changes > 0;
  }
}
