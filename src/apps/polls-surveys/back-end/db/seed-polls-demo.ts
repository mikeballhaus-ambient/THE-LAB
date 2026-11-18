import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, demoCastIdForIndex, demoCastNameForIndex, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const POLLS_DEMO_PACK_ID = 'polls-demo';
export const POLLS_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.POLLS_SURVEYS_DEMO;

/** Bump when demo row shape or content changes so boot re-seeds tracked rows on upgraded installs. */
export const POLLS_DEMO_SEED_REVISION = 2;
const POLLS_DEMO_REVISION_FLAG = `${POLLS_DEMO_BOOT_FLAG}:revision`;

function needsDemoRevisionRefresh(db: Database): boolean {
  try {
    const row = db
      .prepare('SELECT value FROM configs WHERE key = ? LIMIT 1')
      .get(POLLS_DEMO_REVISION_FLAG) as { value?: string } | undefined;
    const applied = Number.parseInt(row?.value ?? '', 10);
    return !Number.isFinite(applied) || applied < POLLS_DEMO_SEED_REVISION;
  } catch {
    return true;
  }
}

function recordDemoRevision(db: Database): void {
  db.prepare(
    `INSERT INTO configs (key, value, type, description, updated_at)
     VALUES (?, ?, 'number', 'Polls demo seed revision', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(POLLS_DEMO_REVISION_FLAG, String(POLLS_DEMO_SEED_REVISION));
}

type PollKind = 'single' | 'multi';
type PollStatus = 'draft' | 'open' | 'closed';

interface PollSpec {
  question: string;
  kind: PollKind;
  status: PollStatus;
  allowAnonymous: boolean;
  allowMultipleVotes: boolean;
  dayOffset: number;
  options: readonly string[];
  /** Option index → number of votes to cast. */
  votesByOption: readonly number[];
}

/**
 * Three polls, twelve options, thirteen votes. Every poll status and every kind
 * appears (rule 6). Voters come from `DEMO_CAST` and set `voter_id`.
 *
 * Newest poll (list sort) is the **open** integration poll with four choices — not a one-option draft.
 */
const POLLS: readonly PollSpec[] = [
  {
    question: 'Which integration surface should we build next?',
    kind: 'single',
    status: 'open',
    allowAnonymous: false,
    allowMultipleVotes: false,
    dayOffset: -2,
    options: [
      'Cross-app record search',
      'Scheduled report delivery',
      'Per-app webhook subscriptions',
      'Bulk import from CSV',
    ],
    votesByOption: [3, 2, 1, 0],
  },
  {
    question: 'Which games should get the shared match kit next?',
    kind: 'multi',
    status: 'closed',
    allowAnonymous: true,
    allowMultipleVotes: true,
    dayOffset: -9,
    options: ['Chess', 'Checkers', 'Battleship', 'Connect Four'],
    votesByOption: [4, 1, 1, 1],
  },
  {
    question: 'How often should demo data be refreshed?',
    kind: 'single',
    status: 'draft',
    allowAnonymous: true,
    allowMultipleVotes: true,
    dayOffset: -18,
    options: [
      'Every backend restart',
      'Weekly on a schedule',
      'Manual from Settings only',
      'Never — stable on purpose',
    ],
    votesByOption: [0, 0, 0, 0],
  },
];

export function hasPollsDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, POLLS_DEMO_PACK_ID).has();
}

export interface SeedPollsDemoResult {
  inserted: number;
}

export function seedPollsDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedPollsDemoResult {
  const ledger = new DemoSeedLedger(db, POLLS_DEMO_PACK_ID);

  if (options?.adminApply && ledger.has()) {
    removePollsDemo(db);
  }

  if (needsDemoRevisionRefresh(db)) {
    if (ledger.has()) {
      removePollsDemo(db);
    }
  }

  const expectedTrackedRows =
    POLLS.length +
    POLLS.reduce((n, p) => n + p.options.length, 0) +
    POLLS.reduce((n, p) => n + p.votesByOption.reduce((s, c) => s + c, 0), 0);

  if (!needsDemoRevisionRefresh(db) && ledger.has() && ledger.count() !== expectedTrackedRows) {
    removePollsDemo(db);
  }

  if (shouldSkipDemoSeed(db, ledger, POLLS_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  ensurePersonIdColumn(db, 'poll_votes', 'voter_id');

  let inserted = 0;
  let voterIndex = 0;

  for (const poll of POLLS) {
    const created = shiftDemoDate(DEMO_TODAY, poll.dayOffset);
    const pollId = insertRow(db, 'polls', {
      question: poll.question,
      kind: poll.kind,
      status: poll.status,
      allow_anonymous: poll.allowAnonymous ? 1 : 0,
      allow_multiple_votes: poll.allowMultipleVotes ? 1 : 0,
      created_at: `${created}T09:00:00`,
    });
    ledger.track('polls', pollId);
    inserted += 1;

    const optionIds: number[] = [];
    poll.options.forEach((label, index) => {
      const optionId = insertRow(db, 'poll_options', {
        poll_id: pollId,
        label,
        order: index,
      });
      ledger.track('poll_options', optionId);
      optionIds.push(optionId);
      inserted += 1;
    });

    poll.votesByOption.forEach((voteCount, optionIndex) => {
      const optionId = optionIds[optionIndex];
      if (optionId == null) return;
      for (let v = 0; v < voteCount; v++) {
        const voteId = insertRow(db, 'poll_votes', {
          poll_id: pollId,
          option_id: optionId,
          voter: demoCastNameForIndex(voterIndex),
          voter_id: demoCastIdForIndex(voterIndex),
          created_at: `${created}T12:00:00`,
        });
        ledger.track('poll_votes', voteId);
        inserted += 1;
        voterIndex += 1;
      }
    });
  }

  recordDemoRevision(db);

  return { inserted };
}

export function removePollsDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, POLLS_DEMO_PACK_ID);
  return ledger.deleteTracked(['poll_votes', 'poll_options', 'polls']);
}

/** Every poll status present in the demo data (rule 6). */
export function pollsDemoStatuses(): string[] {
  return [...new Set(POLLS.map((p) => p.status))];
}

/** Every poll kind present in the demo data (rule 6). */
export function pollsDemoKinds(): string[] {
  return [...new Set(POLLS.map((p) => p.kind))];
}

/** Cast voters used by the seeded votes. */
export function pollsDemoVoterNames(): string[] {
  const total = POLLS.reduce((sum, p) => sum + p.votesByOption.reduce((s, n) => s + n, 0), 0);
  return [...new Set(Array.from({ length: total }, (_, i) => demoCastNameForIndex(i)))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const pollsDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: POLLS_DEMO_BOOT_FLAG,
  has: hasPollsDemoDataset,
  seed: seedPollsDemoIfMissing,
};
