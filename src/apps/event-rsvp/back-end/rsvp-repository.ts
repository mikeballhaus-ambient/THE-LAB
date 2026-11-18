/**
 * Event RSVP data layer — events + guest RSVPs.
 */
import type { Database } from 'better-sqlite3';
import type {
  EventItem,
  EventWithRsvps,
  Rsvp,
  RsvpResponse,
  UpsertEventInput,
  UpsertRsvpInput,
} from '../shared/types';

interface EventRow {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location: string;
  capacity: number;
  created_at: string;
}
interface RsvpRow {
  id: number;
  event_id: number;
  guest_name: string;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  guest_user_id?: number | null;
  response: string;
  headcount: number;
  note: string;
  created_at: string;
}

export function bootstrapRsvpTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rsvp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      starts_at TEXT NOT NULL DEFAULT '',
      ends_at TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      capacity INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rsvp_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      guest_name TEXT NOT NULL,
      response TEXT NOT NULL DEFAULT 'yes',
      headcount INTEGER NOT NULL DEFAULT 1,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_rsvp_event ON rsvp_responses (event_id);
  `);
}

function mapEvent(row: EventRow): EventItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    capacity: row.capacity,
    createdAt: row.created_at,
  };
}
function mapRsvp(row: RsvpRow): Rsvp {
  return {
    id: row.id,
    eventId: row.event_id,
    guestName: row.guest_name,
    guestUserId: row.guest_user_id ?? null,
    response: row.response as RsvpResponse,
    headcount: row.headcount,
    note: row.note,
    createdAt: row.created_at,
  };
}

export class RsvpRepository {
  constructor(private readonly db: Database) {}

  list(): EventWithRsvps[] {
    const events = this.db.prepare(`SELECT * FROM rsvp_events ORDER BY starts_at ASC, id DESC`).all() as EventRow[];
    const byEvent = new Map<number, Rsvp[]>();
    for (const row of this.db.prepare(`SELECT * FROM rsvp_responses ORDER BY created_at ASC, id ASC`).all() as RsvpRow[]) {
      const r = mapRsvp(row);
      const list = byEvent.get(r.eventId) ?? [];
      list.push(r);
      byEvent.set(r.eventId, list);
    }
    return events.map((e) => {
      const rsvps = byEvent.get(e.id) ?? [];
      const attending = rsvps.filter((r) => r.response === 'yes').reduce((sum, r) => sum + r.headcount, 0);
      return { ...mapEvent(e), rsvps, attending };
    });
  }

  createEvent(input: UpsertEventInput): EventItem {
    const info = this.db
      .prepare(`INSERT INTO rsvp_events (title, description, starts_at, ends_at, location, capacity) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(input.title.trim(), input.description.trim(), input.startsAt, input.endsAt, input.location.trim(), input.capacity);
    return mapEvent(this.db.prepare(`SELECT * FROM rsvp_events WHERE id = ?`).get(info.lastInsertRowid) as EventRow);
  }

  updateEvent(id: number, input: UpsertEventInput): EventItem | null {
    if (!this.db.prepare(`SELECT id FROM rsvp_events WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE rsvp_events SET title = ?, description = ?, starts_at = ?, ends_at = ?, location = ?, capacity = ? WHERE id = ?`,
      )
      .run(
        input.title.trim(),
        input.description.trim(),
        input.startsAt,
        input.endsAt,
        input.location.trim(),
        input.capacity,
        id,
      );
    return mapEvent(this.db.prepare(`SELECT * FROM rsvp_events WHERE id = ?`).get(id) as EventRow);
  }

  deleteEvent(id: number): boolean {
    this.db.prepare(`DELETE FROM rsvp_responses WHERE event_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM rsvp_events WHERE id = ?`).run(id).changes > 0;
  }

  addRsvp(input: UpsertRsvpInput): Rsvp {
    const info = this.db
      .prepare(
        `INSERT INTO rsvp_responses (event_id, guest_name, guest_user_id, response, headcount, note) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.eventId,
        input.guestName.trim(),
        input.guestUserId ?? null,
        input.response,
        input.headcount,
        input.note.trim(),
      );
    return mapRsvp(this.db.prepare(`SELECT * FROM rsvp_responses WHERE id = ?`).get(info.lastInsertRowid) as RsvpRow);
  }

  updateRsvp(id: number, input: UpsertRsvpInput): Rsvp | null {
    if (!this.db.prepare(`SELECT id FROM rsvp_responses WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE rsvp_responses SET event_id = ?, guest_name = ?, guest_user_id = ?, response = ?, headcount = ?, note = ? WHERE id = ?`,
      )
      .run(
        input.eventId,
        input.guestName.trim(),
        input.guestUserId ?? null,
        input.response,
        input.headcount,
        input.note.trim(),
        id,
      );
    return mapRsvp(this.db.prepare(`SELECT * FROM rsvp_responses WHERE id = ?`).get(id) as RsvpRow);
  }

  deleteRsvp(id: number): boolean {
    return this.db.prepare(`DELETE FROM rsvp_responses WHERE id = ?`).run(id).changes > 0;
  }
}
