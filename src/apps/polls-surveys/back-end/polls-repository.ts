/**
 * Polls & Surveys data layer — polls, options, and votes with tallies.
 */
import type { Database } from 'better-sqlite3';
import type {
  CastVoteInput,
  Poll,
  PollKind,
  PollOption,
  PollStatus,
  PollWithResults,
  UpsertOptionInput,
  UpsertPollInput,
  PollListViewerContext,
} from '../shared/types';

interface PollRow {
  id: number;
  question: string;
  kind: string;
  status: string;
  allow_anonymous: number;
  allow_multiple_votes: number;
  created_at: string;
}
interface OptionRow {
  id: number;
  poll_id: number;
  label: string;
  order: number;
}
interface VoteRow {
  id: number;
  poll_id: number;
  option_id: number;
  voter: string;
  created_at: string;
}

function ensurePollsSchemaMigrations(db: Database): void {
  const columns = db.prepare(`PRAGMA table_info(polls)`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === 'allow_multiple_votes')) {
    db.exec(`ALTER TABLE polls ADD COLUMN allow_multiple_votes INTEGER NOT NULL DEFAULT 1`);
  }
  const voteColumns = db.prepare(`PRAGMA table_info(poll_votes)`).all() as Array<{ name: string }>;
  if (!voteColumns.some((column) => column.name === 'voter_id')) {
    db.exec(`ALTER TABLE poll_votes ADD COLUMN voter_id INTEGER`);
  }
}

export function bootstrapPollsTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'single',
      status TEXT NOT NULL DEFAULT 'draft',
      allow_anonymous INTEGER NOT NULL DEFAULT 1,
      allow_multiple_votes INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      voter TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options (poll_id);
    CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes (poll_id);
  `);
  ensurePollsSchemaMigrations(db);
}

function mapPoll(row: PollRow): Poll {
  return {
    id: row.id,
    question: row.question,
    kind: row.kind as PollKind,
    status: row.status as PollStatus,
    allowAnonymous: row.allow_anonymous === 1,
    allowMultipleVotes: row.allow_multiple_votes === 1,
    createdAt: row.created_at,
  };
}
function mapOption(row: OptionRow): PollOption {
  return { id: row.id, pollId: row.poll_id, label: row.label, order: row.order };
}

function viewerHasVotedOnPoll(
  db: Database,
  pollId: number,
  viewer: PollListViewerContext,
): boolean {
  if (viewer.voterId != null) {
    const byId = db
      .prepare(`SELECT 1 AS ok FROM poll_votes WHERE poll_id = ? AND voter_id = ? LIMIT 1`)
      .get(pollId, viewer.voterId) as { ok: number } | undefined;
    return Boolean(byId);
  }
  const label = viewer.voter.trim();
  if (!label) {
    return false;
  }
  const byName = db
    .prepare(`SELECT 1 AS ok FROM poll_votes WHERE poll_id = ? AND voter = ? LIMIT 1`)
    .get(pollId, label) as { ok: number } | undefined;
  return Boolean(byName);
}

export class PollsRepository {
  constructor(private readonly db: Database) {}

  list(viewer?: PollListViewerContext): PollWithResults[] {
    const polls = this.db.prepare(`SELECT * FROM polls ORDER BY created_at DESC, id DESC`).all() as PollRow[];
    const optionRows = this.db.prepare(`SELECT * FROM poll_options ORDER BY "order" ASC, id ASC`).all() as OptionRow[];
    const voteRows = this.db.prepare(`SELECT * FROM poll_votes`).all() as VoteRow[];
    return polls.map((p) => {
      const options = optionRows.filter((o) => o.poll_id === p.id).map(mapOption);
      const votes = voteRows.filter((v) => v.poll_id === p.id);
      const results = options.map((o) => ({
        ...o,
        votes: votes.filter((v) => v.option_id === o.id).length,
      }));
      return {
        ...mapPoll(p),
        options: results,
        totalVotes: votes.length,
        viewerHasVoted:
          viewer && !mapPoll(p).allowMultipleVotes
            ? viewerHasVotedOnPoll(this.db, p.id, viewer)
            : undefined,
      };
    });
  }

  createPoll(input: UpsertPollInput): Poll {
    const info = this.db
      .prepare(
        `INSERT INTO polls (question, kind, status, allow_anonymous, allow_multiple_votes) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.question.trim(),
        input.kind,
        input.status,
        input.allowAnonymous ? 1 : 0,
        (input.allowMultipleVotes ?? true) ? 1 : 0,
      );
    return mapPoll(this.db.prepare(`SELECT * FROM polls WHERE id = ?`).get(info.lastInsertRowid) as PollRow);
  }

  getPoll(id: number): Poll | null {
    const row = this.db.prepare(`SELECT * FROM polls WHERE id = ?`).get(id) as PollRow | undefined;
    return row ? mapPoll(row) : null;
  }

  updatePoll(id: number, input: UpsertPollInput): Poll | null {
    if (!this.db.prepare(`SELECT id FROM polls WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE polls SET question = ?, kind = ?, status = ?, allow_anonymous = ?, allow_multiple_votes = ? WHERE id = ?`,
      )
      .run(
        input.question.trim(),
        input.kind,
        input.status,
        input.allowAnonymous ? 1 : 0,
        (input.allowMultipleVotes ?? true) ? 1 : 0,
        id,
      );
    return mapPoll(this.db.prepare(`SELECT * FROM polls WHERE id = ?`).get(id) as PollRow);
  }

  setStatus(id: number, status: PollStatus): Poll | null {
    if (!this.db.prepare(`SELECT id FROM polls WHERE id = ?`).get(id)) return null;
    this.db.prepare(`UPDATE polls SET status = ? WHERE id = ?`).run(status, id);
    return mapPoll(this.db.prepare(`SELECT * FROM polls WHERE id = ?`).get(id) as PollRow);
  }

  deletePoll(id: number): boolean {
    this.db.prepare(`DELETE FROM poll_options WHERE poll_id = ?`).run(id);
    this.db.prepare(`DELETE FROM poll_votes WHERE poll_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM polls WHERE id = ?`).run(id).changes > 0;
  }

  addOption(input: UpsertOptionInput): PollOption {
    const nextOrder =
      (
        this.db
          .prepare(`SELECT COALESCE(MAX("order"), -1) + 1 AS n FROM poll_options WHERE poll_id = ?`)
          .get(input.pollId) as { n: number }
      ).n ?? 0;
    const info = this.db
      .prepare(`INSERT INTO poll_options (poll_id, label, "order") VALUES (?, ?, ?)`)
      .run(input.pollId, input.label.trim(), nextOrder);
    return mapOption(this.db.prepare(`SELECT * FROM poll_options WHERE id = ?`).get(info.lastInsertRowid) as OptionRow);
  }

  updateOption(id: number, input: UpsertOptionInput): PollOption | null {
    if (!this.db.prepare(`SELECT id FROM poll_options WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(`UPDATE poll_options SET poll_id = ?, label = ? WHERE id = ?`)
      .run(input.pollId, input.label.trim(), id);
    return mapOption(this.db.prepare(`SELECT * FROM poll_options WHERE id = ?`).get(id) as OptionRow);
  }

  deleteOption(id: number): boolean {
    this.db.prepare(`DELETE FROM poll_votes WHERE option_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM poll_options WHERE id = ?`).run(id).changes > 0;
  }

  /** Cast a vote (only when the poll is open and the option belongs to it). */
  castVote(input: CastVoteInput): { ok: boolean; error?: string } {
    const poll = this.db.prepare(`SELECT * FROM polls WHERE id = ?`).get(input.pollId) as PollRow | undefined;
    if (!poll) return { ok: false, error: 'Poll not found' };
    if (poll.status !== 'open') return { ok: false, error: 'Poll is not open' };
    const option = this.db
      .prepare(`SELECT * FROM poll_options WHERE id = ? AND poll_id = ?`)
      .get(input.optionId, input.pollId) as OptionRow | undefined;
    if (!option) return { ok: false, error: 'Option not found for this poll' };
    const mapped = mapPoll(poll);
    if (!mapped.allowMultipleVotes) {
      const viewer: PollListViewerContext = {
        voter: input.voter,
        voterId: input.voterId ?? null,
      };
      if (viewerHasVotedOnPoll(this.db, input.pollId, viewer)) {
        return { ok: false, error: 'You have already voted on this poll' };
      }
    }
    this.db
      .prepare(
        `INSERT INTO poll_votes (poll_id, option_id, voter, voter_id) VALUES (?, ?, ?, ?)`,
      )
      .run(input.pollId, input.optionId, input.voter.trim(), input.voterId ?? null);
    return { ok: true };
  }
}
