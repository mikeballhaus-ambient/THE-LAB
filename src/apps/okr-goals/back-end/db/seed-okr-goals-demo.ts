import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, demoCastIdForName, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const OKR_GOALS_DEMO_PACK_ID = 'okr-goals-demo';
export const OKR_GOALS_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.OKR_GOALS_DEMO;

type KeyResultStatus = 'not-started' | 'on-track' | 'at-risk' | 'done';

interface KeyResultSpec {
  title: string;
  metric: string;
  baseline: number;
  target: number;
  current: number;
  status: KeyResultStatus;
}

interface ObjectiveSpec {
  title: string;
  owner: string;
  quarter: string;
  dayOffset: number;
  keyResults: readonly KeyResultSpec[];
}

/**
 * Three objectives with eight key results — every KR status appears at least once
 * (rule 6). Owners come from `DEMO_CAST`; never invent person names.
 */
const OBJECTIVES: readonly ObjectiveSpec[] = [
  {
    title: 'Ship the platform integration surface',
    owner: 'Mia Chen',
    quarter: 'Q4 2026',
    dayOffset: -40,
    keyResults: [
      {
        title: 'Catalog apps with a live connector',
        metric: 'apps',
        baseline: 0,
        target: 15,
        current: 15,
        status: 'done',
      },
      {
        title: 'Integration surfaces with a chart binding',
        metric: 'surfaces',
        baseline: 0,
        target: 20,
        current: 14,
        status: 'on-track',
      },
      {
        title: 'Open integration defects',
        metric: 'defects',
        baseline: 12,
        target: 0,
        current: 5,
        status: 'on-track',
      },
    ],
  },
  {
    title: 'Make the laboratory trustworthy for admins',
    owner: 'Jordan Lee',
    quarter: 'Q4 2026',
    dayOffset: -28,
    keyResults: [
      {
        title: 'Demo seed packs covering the catalog',
        metric: 'packs',
        baseline: 0,
        target: 15,
        current: 15,
        status: 'done',
      },
      {
        title: 'Backend tests passing in CI',
        metric: '%',
        baseline: 82,
        target: 100,
        current: 88,
        status: 'at-risk',
      },
      {
        title: 'Playbooks with a verify gate',
        metric: 'playbooks',
        baseline: 3,
        target: 10,
        current: 2,
        status: 'at-risk',
      },
    ],
  },
  {
    title: 'Grow the games portfolio',
    owner: 'Sam Patel',
    quarter: 'Q1 2027',
    dayOffset: -14,
    keyResults: [
      {
        title: 'Playable game apps',
        metric: 'games',
        baseline: 2,
        target: 9,
        current: 2,
        status: 'not-started',
      },
      {
        title: 'Games sharing the platform kit',
        metric: 'games',
        baseline: 0,
        target: 9,
        current: 0,
        status: 'not-started',
      },
    ],
  },
];

export function hasOkrGoalsDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, OKR_GOALS_DEMO_PACK_ID).has();
}

export interface SeedOkrGoalsDemoResult {
  inserted: number;
}

export function seedOkrGoalsDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedOkrGoalsDemoResult {
  const ledger = new DemoSeedLedger(db, OKR_GOALS_DEMO_PACK_ID);
  if (shouldSkipDemoSeed(db, ledger, OKR_GOALS_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  ensurePersonIdColumn(db, 'okr_objectives', 'owner_id');

  let inserted = 0;

  OBJECTIVES.forEach((objective, objectiveIndex) => {
    const created = shiftDemoDate(DEMO_TODAY, objective.dayOffset);
    const objectiveId = insertRow(db, 'okr_objectives', {
      title: objective.title,
      owner_name: objective.owner,
      owner_id: demoCastIdForName(objective.owner),
      quarter: objective.quarter,
      created_at: `${created}T09:00:00`,
    });
    ledger.track('okr_objectives', objectiveId);
    inserted += 1;

    objective.keyResults.forEach((kr, krIndex) => {
      const krId = insertRow(db, 'okr_key_results', {
        objective_id: objectiveId,
        title: kr.title,
        metric: kr.metric,
        baseline: kr.baseline,
        target: kr.target,
        current: kr.current,
        status: kr.status,
        order: krIndex,
      });
      ledger.track('okr_key_results', krId);
      inserted += 1;
    });

    void objectiveIndex;
  });

  return { inserted };
}

export function removeOkrGoalsDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, OKR_GOALS_DEMO_PACK_ID);
  return ledger.deleteTracked(['okr_key_results', 'okr_objectives']);
}

/** Every KR status present in the demo data (rule 6). */
export function okrGoalsDemoStatuses(): string[] {
  return [...new Set(OBJECTIVES.flatMap((o) => o.keyResults.map((kr) => kr.status)))];
}

/** Cast owners referenced by this seed. */
export function okrGoalsDemoCastNames(): string[] {
  return [...new Set(OBJECTIVES.map((o) => o.owner))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const okrGoalsDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: OKR_GOALS_DEMO_BOOT_FLAG,
  has: hasOkrGoalsDemoDataset,
  seed: seedOkrGoalsDemoIfMissing,
};
