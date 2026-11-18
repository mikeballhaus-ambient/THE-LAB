/**
 * Travel Itinerary data layer — trips + itinerary items in the app's SQLite DB.
 */
import type { Database } from 'better-sqlite3';
import type {
  ItineraryItem,
  ItineraryItemKind,
  Trip,
  TripWithItems,
  UpsertItineraryItemInput,
  UpsertTripInput,
} from '../shared/types';

interface TripRow {
  id: number;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  notes: string;
  created_at: string;
}

interface ItemRow {
  id: number;
  trip_id: number;
  kind: string;
  title: string;
  start_at: string;
  end_at: string;
  location: string;
  confirmation: string;
  order: number;
}

export function bootstrapTravelTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS travel_trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      destination TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS travel_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      kind TEXT NOT NULL DEFAULT 'activity',
      title TEXT NOT NULL,
      start_at TEXT NOT NULL DEFAULT '',
      end_at TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      confirmation TEXT NOT NULL DEFAULT '',
      "order" INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_travel_items_trip ON travel_items (trip_id);
  `);
}

function mapTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapItem(row: ItemRow): ItineraryItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    kind: row.kind as ItineraryItemKind,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    confirmation: row.confirmation,
    order: row.order,
  };
}

export class TravelRepository {
  constructor(private readonly db: Database) {}

  listTrips(): TripWithItems[] {
    const trips = this.db
      .prepare(`SELECT * FROM travel_trips ORDER BY start_date DESC, id DESC`)
      .all() as TripRow[];
    const items = this.db
      .prepare(`SELECT * FROM travel_items ORDER BY "order" ASC, id ASC`)
      .all() as ItemRow[];
    const byTrip = new Map<number, ItineraryItem[]>();
    for (const row of items) {
      const item = mapItem(row);
      const list = byTrip.get(item.tripId) ?? [];
      list.push(item);
      byTrip.set(item.tripId, list);
    }
    return trips.map((trip) => ({
      ...mapTrip(trip),
      items: byTrip.get(trip.id) ?? [],
    }));
  }

  createTrip(input: UpsertTripInput): Trip {
    const info = this.db
      .prepare(
        `INSERT INTO travel_trips (name, destination, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.name.trim(),
        input.destination.trim(),
        input.startDate,
        input.endDate,
        input.notes.trim(),
      );
    return mapTrip(this.db.prepare(`SELECT * FROM travel_trips WHERE id = ?`).get(info.lastInsertRowid) as TripRow);
  }

  updateTrip(id: number, input: UpsertTripInput): Trip | null {
    if (!this.db.prepare(`SELECT id FROM travel_trips WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE travel_trips SET name = ?, destination = ?, start_date = ?, end_date = ?, notes = ? WHERE id = ?`,
      )
      .run(
        input.name.trim(),
        input.destination.trim(),
        input.startDate,
        input.endDate,
        input.notes.trim(),
        id,
      );
    return mapTrip(this.db.prepare(`SELECT * FROM travel_trips WHERE id = ?`).get(id) as TripRow);
  }

  deleteTrip(id: number): boolean {
    this.db.prepare(`DELETE FROM travel_items WHERE trip_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM travel_trips WHERE id = ?`).run(id).changes > 0;
  }

  createItem(input: UpsertItineraryItemInput): ItineraryItem {
    const info = this.db
      .prepare(
        `INSERT INTO travel_items (trip_id, kind, title, start_at, end_at, location, confirmation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.tripId,
        input.kind,
        input.title.trim(),
        input.startAt,
        input.endAt,
        input.location.trim(),
        input.confirmation.trim(),
      );
    return mapItem(this.db.prepare(`SELECT * FROM travel_items WHERE id = ?`).get(info.lastInsertRowid) as ItemRow);
  }

  updateItem(id: number, input: UpsertItineraryItemInput): ItineraryItem | null {
    if (!this.db.prepare(`SELECT id FROM travel_items WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE travel_items SET trip_id = ?, kind = ?, title = ?, start_at = ?, end_at = ?, location = ?, confirmation = ? WHERE id = ?`,
      )
      .run(
        input.tripId,
        input.kind,
        input.title.trim(),
        input.startAt,
        input.endAt,
        input.location.trim(),
        input.confirmation.trim(),
        id,
      );
    return mapItem(this.db.prepare(`SELECT * FROM travel_items WHERE id = ?`).get(id) as ItemRow);
  }

  deleteItem(id: number): boolean {
    return this.db.prepare(`DELETE FROM travel_items WHERE id = ?`).run(id).changes > 0;
  }
}
