import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { LabCommsRepository } from '@/backend/db/Comms/lab-comms-repository';
import {
  LAB_PLATFORM_SYSTEM_USER_EMAIL,
  LAB_PLATFORM_SYSTEM_USER_ID,
} from '@/shared/config/lab-platform-system-user';

/**
 * When the automation account moves id, every `dm:<user>:<old>` channel id must move with it or the
 * workflow thread is orphaned — the rows survive but no client asks for that channel. The migration must
 * also refuse when a rewrite would fuse two conversations, which is unrecoverable.
 */

const LEGACY_AUTOMATION_ID = 12;
const HUMAN_ID = 3;

/** Canonical DM channel id: ascending ids, matching `dmChannelId()`. */
function dm(a: number, b: number): string {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return `dm:${lo}:${hi}`;
}

const USERS = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'active',
    is_system INTEGER NOT NULL DEFAULT 0
  );
`;

function memoryDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(USERS);
  db.prepare(
    `INSERT INTO users (id, email, name, role, status) VALUES (?, 'human@test', 'Human', 'member', 'active')`,
  ).run(HUMAN_ID);
  return db;
}

function addUser(
  db: Database.Database,
  id: number,
  email: string,
  isSystem: number,
): void {
  db.prepare(
    `INSERT INTO users (id, email, name, role, status, is_system) VALUES (?, ?, 'THE-LAB', 'viewer', 'active', ?)`,
  ).run(id, email, isSystem);
}

/** A pre-move database: the automation row lives at id 12 and nothing occupies id 2. */
function legacyDb(): Database.Database {
  const db = memoryDb();
  addUser(db, LEGACY_AUTOMATION_ID, LAB_PLATFORM_SYSTEM_USER_EMAIL, 1);
  return db;
}

/** A human (not the automation account) sitting on the currently reserved id. */
function addUser2(db: Database.Database, email: string): void {
  db.prepare(
    `INSERT INTO users (id, email, name, role, status, is_system) VALUES (?, ?, 'Demo Person', 'member', 'active', 0)`,
  ).run(LAB_PLATFORM_SYSTEM_USER_ID, email);
}

async function bootstrap(db: Database.Database): Promise<LabCommsRepository> {
  const repository = new LabCommsRepository();
  await repository.bootstrap(db);
  return repository;
}

function insertLegacyThread(
  repository: LabCommsRepository,
  db: Database.Database,
  channelId: string,
  /** Must exist — `lab_comms_messages.sender_user_id` is a foreign key. */
  senderUserId: number = LEGACY_AUTOMATION_ID,
): void {
  repository.insertMessage({
    id: 'legacy-1',
    channelId: channelId as never,
    type: 'dm.text',
    senderUserId,
    sentAt: '2026-10-26T14:49:19.608Z',
    payload: { text: 'Loop demo finished: stepValue reached 3.' },
  });
  db.prepare(
    `INSERT INTO lab_comms_channel_members (channel_id, user_id, joined_at) VALUES (?, ?, 'now')`,
  ).run(channelId, HUMAN_ID);
  db.prepare(
    `INSERT INTO lab_comms_read_cursors (user_id, channel_id, last_read_at) VALUES (?, ?, 'now')`,
  ).run(HUMAN_ID, channelId);
}

function channelIds(db: Database.Database, table: string): string[] {
  return (
    db.prepare(`SELECT channel_id FROM ${table} ORDER BY channel_id`).all() as {
      channel_id: string;
    }[]
  ).map((row) => row.channel_id);
}

describe('automation DM channel migration', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('rewrites legacy dm:<user>:12 rows to dm:2:<user> across every comms table', async () => {
    const db = legacyDb();
    const repository = await bootstrap(db);
    // The migration already ran during bootstrap, before any rows existed — seed, then re-run.
    insertLegacyThread(repository, db, dm(HUMAN_ID, LEGACY_AUTOMATION_ID));

    await repository.initialize();

    const next = dm(HUMAN_ID, LAB_PLATFORM_SYSTEM_USER_ID);
    expect(channelIds(db, 'lab_comms_messages')).toEqual([next]);
    expect(channelIds(db, 'lab_comms_channel_members')).toEqual([next]);
    expect(channelIds(db, 'lab_comms_read_cursors')).toEqual([next]);
    // The message itself is preserved, not just the channel key.
    const row = db.prepare(`SELECT sender_user_id FROM lab_comms_messages`).get() as {
      sender_user_id: number;
    };
    expect(row.sender_user_id).toBe(LEGACY_AUTOMATION_ID);
    db.close();
  });

  test('does nothing when no row holds the automation email at another id', async () => {
    // A fresh database: the automation row already lives at the current id, and id 12 is free, so a
    // `:12` channel is an ordinary person's conversation and must not be rewritten.
    const db = memoryDb();
    addUser(db, LAB_PLATFORM_SYSTEM_USER_ID, LAB_PLATFORM_SYSTEM_USER_EMAIL, 1);
    addUser(db, LEGACY_AUTOMATION_ID, 'someone-else@test', 0);
    const repository = await bootstrap(db);
    insertLegacyThread(repository, db, dm(HUMAN_ID, LEGACY_AUTOMATION_ID), LEGACY_AUTOMATION_ID);

    await repository.initialize();

    // Untouched: with no legacy row to identify, a `:12` channel is just an unrelated conversation.
    expect(channelIds(db, 'lab_comms_messages')).toEqual([dm(HUMAN_ID, LEGACY_AUTOMATION_ID)]);
    db.close();
  });

  test('refuses to migrate when a human occupies the target id, even with no DMs', async () => {
    // This is the real-world shape: the old ordering handed id 2 to a demo user, so rewriting
    // `dm:*:12` into `dm:2:*` would re-point every automation thread at a real person's account.
    const db = legacyDb();
    addUser2(db, 'mia.chen@lab.local');
    const repository = await bootstrap(db);
    insertLegacyThread(repository, db, dm(HUMAN_ID, LEGACY_AUTOMATION_ID));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await repository.initialize();

    expect(channelIds(db, 'lab_comms_messages')).toEqual([dm(HUMAN_ID, LEGACY_AUTOMATION_ID)]);
    expect(warn).toHaveBeenCalled();
    db.close();
  });

  test('is idempotent — a second boot does not re-key or duplicate the thread', async () => {
    const db = legacyDb();
    const repository = await bootstrap(db);
    insertLegacyThread(repository, db, dm(HUMAN_ID, LEGACY_AUTOMATION_ID));

    await repository.initialize();
    const afterFirst = channelIds(db, 'lab_comms_messages');
    await repository.initialize();

    expect(channelIds(db, 'lab_comms_messages')).toEqual(afterFirst);
    const count = db.prepare(`SELECT COUNT(*) AS c FROM lab_comms_messages`).get() as { c: number };
    expect(count.c).toBe(1);
    db.close();
  });
});
