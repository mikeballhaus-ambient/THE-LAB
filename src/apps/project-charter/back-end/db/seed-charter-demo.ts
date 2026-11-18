import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, demoCastIdForName, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, ensureTextColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const CHARTER_DEMO_PACK_ID = 'charter-demo';
export const CHARTER_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.PROJECT_CHARTER_DEMO;

type CharterStatus = 'draft' | 'active';

interface CharterSpec {
  title: string;
  sponsor: string;
  /** Lead stakeholder — drives `stakeholders_owner_id`. */
  leadStakeholder: string;
  stakeholders: readonly string[];
  purpose: string;
  scope: string;
  outOfScope: string;
  goals: string;
  status: CharterStatus;
  dayOffset: number;
}

/**
 * Two charters. Only `draft` and `active` are used — the test pins that set, so
 * `on-hold` / `complete` must not appear here.
 */
const CHARTERS: readonly CharterSpec[] = [
  {
    title: 'Laboratory integration platform',
    sponsor: 'Taylor Nguyen',
    leadStakeholder: 'Mia Chen',
    stakeholders: ['Mia Chen', 'Jordan Lee', 'Sam Patel'],
    purpose:
      'Give every catalog app a uniform way to expose records, lookups and charts to the rest of the laboratory.',
    scope:
      'Connector contracts, discovery manifests, chart bindings, and the Settings demo-data surface.',
    outOfScope: 'Third-party marketplace distribution and per-tenant isolation.',
    goals:
      'All catalog apps discoverable; every integration surface with at least one chart; demo packs for every app.',
    status: 'active',
    dayOffset: -45,
  },
  {
    title: 'Games portfolio expansion',
    sponsor: 'Jordan Lee',
    leadStakeholder: 'Sam Patel',
    stakeholders: ['Sam Patel', 'Casey Hayes'],
    purpose:
      'Extend the laboratory games catalogue beyond Solitaire and Word Tile onto the shared match kit.',
    scope: 'Seven additional games on the shared turn-based platform, each with an MVP board.',
    outOfScope: 'Server-authoritative PvP with fog of war, and real-money poker.',
    goals: 'Every game playable against a friend; shared score and leaderboard contract.',
    status: 'draft',
    dayOffset: -12,
  },
];

export function hasCharterDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, CHARTER_DEMO_PACK_ID).has();
}

export interface SeedCharterDemoResult {
  inserted: number;
}

export function seedCharterDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedCharterDemoResult {
  const ledger = new DemoSeedLedger(db, CHARTER_DEMO_PACK_ID);
  if (shouldSkipDemoSeed(db, ledger, CHARTER_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  ensurePersonIdColumn(db, 'charters', 'sponsor_id');
  ensurePersonIdColumn(db, 'charters', 'stakeholders_owner_id');
  ensureTextColumn(db, 'charters', 'stakeholder_user_ids', '[]');

  let inserted = 0;

  for (const charter of CHARTERS) {
    const created = shiftDemoDate(DEMO_TODAY, charter.dayOffset);
    const stakeholderIds = charter.stakeholders.map((name) => String(demoCastIdForName(name)));
    const id = insertRow(db, 'charters', {
      title: charter.title,
      sponsor: charter.sponsor,
      sponsor_id: demoCastIdForName(charter.sponsor),
      purpose: charter.purpose,
      scope: charter.scope,
      out_of_scope: charter.outOfScope,
      stakeholders: charter.stakeholders.join('; '),
      stakeholder_user_ids: JSON.stringify(stakeholderIds),
      stakeholders_owner_id: demoCastIdForName(charter.leadStakeholder),
      goals: charter.goals,
      status: charter.status,
      created_at: `${created}T09:00:00`,
      updated_at: `${DEMO_TODAY}T09:00:00`,
    });
    ledger.track('charters', id);
    inserted += 1;
  }

  return { inserted };
}

export function removeCharterDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, CHARTER_DEMO_PACK_ID);
  return ledger.deleteTracked(['charters']);
}

/** Every charter status present in the demo data (rule 6). */
export function charterDemoStatuses(): string[] {
  return [...new Set(CHARTERS.map((c) => c.status))];
}

/** Cast people referenced as sponsor or stakeholder. */
export function charterDemoCastNames(): string[] {
  return [...new Set(CHARTERS.flatMap((c) => [c.sponsor, ...c.stakeholders]))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const charterDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: CHARTER_DEMO_BOOT_FLAG,
  has: hasCharterDemoDataset,
  seed: seedCharterDemoIfMissing,
};
