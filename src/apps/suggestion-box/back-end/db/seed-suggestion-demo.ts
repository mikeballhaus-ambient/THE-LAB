import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, demoCastIdForName, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const SUGGESTION_DEMO_PACK_ID = 'suggestion-demo';
export const SUGGESTION_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.SUGGESTION_BOX_DEMO;

type SuggestionStatus = 'open' | 'planned' | 'in-progress' | 'done' | 'declined';

interface SuggestionSpec {
  title: string;
  body: string;
  author: string;
  status: SuggestionStatus;
  votes: number;
  dayOffset: number;
}

/**
 * Five suggestions, one per status (rule 6). Authors come from `DEMO_CAST`.
 */
const SUGGESTIONS: readonly SuggestionSpec[] = [
  {
    title: 'Keyboard-first command palette',
    body: 'A single shortcut to jump between apps and search records would save a lot of clicking.',
    author: 'Mia Chen',
    status: 'open',
    votes: 14,
    dayOffset: -30,
  },
  {
    title: 'Per-app demo data reset button',
    body: 'Make it obvious which demo packs are present and let me remove just one at a time.',
    author: 'Jordan Lee',
    status: 'planned',
    votes: 22,
    dayOffset: -24,
  },
  {
    title: 'Pin a chart to the app lobby',
    body: 'Let me surface the one chart I actually look at on the app card instead of opening the app.',
    author: 'Sam Patel',
    status: 'in-progress',
    votes: 18,
    dayOffset: -16,
  },
  {
    title: 'Dark theme for the games lobby',
    body: 'The boards look great but the lobby around them is very bright in the evening.',
    author: 'Casey Hayes',
    status: 'done',
    votes: 9,
    dayOffset: -10,
  },
  {
    title: 'Real-time chat inside each app',
    body: 'A per-app channel would replace the side conversations happening in email.',
    author: 'Drew Ward',
    status: 'declined',
    votes: 3,
    dayOffset: -5,
  },
];

export function hasSuggestionDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, SUGGESTION_DEMO_PACK_ID).has();
}

export interface SeedSuggestionDemoResult {
  inserted: number;
}

export function seedSuggestionDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedSuggestionDemoResult {
  const ledger = new DemoSeedLedger(db, SUGGESTION_DEMO_PACK_ID);
  if (shouldSkipDemoSeed(db, ledger, SUGGESTION_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  ensurePersonIdColumn(db, 'suggestions', 'author_id');

  let inserted = 0;

  for (const suggestion of SUGGESTIONS) {
    const created = shiftDemoDate(DEMO_TODAY, suggestion.dayOffset);
    const id = insertRow(db, 'suggestions', {
      title: suggestion.title,
      body: suggestion.body,
      author: suggestion.author,
      author_id: demoCastIdForName(suggestion.author),
      status: suggestion.status,
      votes: suggestion.votes,
      created_at: `${created}T09:00:00`,
      updated_at: `${DEMO_TODAY}T09:00:00`,
    });
    ledger.track('suggestions', id);
    inserted += 1;
  }

  return { inserted };
}

export function removeSuggestionDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, SUGGESTION_DEMO_PACK_ID);
  return ledger.deleteTracked(['suggestions']);
}

/** Every suggestion status present in the demo data (rule 6). */
export function suggestionDemoStatuses(): string[] {
  return [...new Set(SUGGESTIONS.map((s) => s.status))];
}

/** Cast authors referenced by this seed. */
export function suggestionDemoAuthors(): string[] {
  return [...new Set(SUGGESTIONS.map((s) => s.author))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const suggestionDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: SUGGESTION_DEMO_BOOT_FLAG,
  has: hasSuggestionDemoDataset,
  seed: seedSuggestionDemoIfMissing,
};
