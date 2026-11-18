import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, demoCastIdForName, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, ensureTextColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const ONBOARDING_DEMO_PACK_ID = 'onboarding-demo';
export const ONBOARDING_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.ONBOARDING_CHECKLIST_DEMO;

/** Story B anchor — the same hire appears in the Support Fundamentals quiz attempt. */
export const ONBOARDING_DEMO_SUPPORT_HIRE = 'Riley Brooks';
export const ONBOARDING_DEMO_SUPPORT_ROLE = 'Support Engineer';

type TaskStatus = 'todo' | 'doing' | 'done';

interface TaskSpec {
  title: string;
  owner: string;
  status: TaskStatus;
  /** Days from `DEMO_TODAY` for task due date; omitted tasks have no due date. */
  dueOffset?: number;
}

interface ChecklistSpec {
  newHire: string;
  role: string;
  startOffset: number;
  tasks: readonly TaskSpec[];
}

/**
 * Three checklists with twelve tasks total. All three statuses appear (rule 6),
 * and hire + task owners are cast members with `*_id` columns set.
 */
const CHECKLISTS: readonly ChecklistSpec[] = [
  {
    newHire: ONBOARDING_DEMO_SUPPORT_HIRE,
    role: ONBOARDING_DEMO_SUPPORT_ROLE,
    startOffset: -10,
    tasks: [
      { title: 'Sign the employment agreement', owner: 'Taylor Nguyen', status: 'done' },
      { title: 'Issue laptop and access badge', owner: 'Casey Hayes', status: 'done' },
      { title: 'Create the platform user account', owner: 'Mia Chen', status: 'done' },
      { title: 'Walk through the Help Desk queue', owner: 'Sam Patel', status: 'doing' },
      {
        title: 'Complete Support Fundamentals training',
        owner: 'Riley Brooks',
        status: 'todo',
        dueOffset: -3,
      },
      { title: 'Shadow two customer calls', owner: 'Jordan Lee', status: 'todo' },
    ],
  },
  {
    newHire: 'Blake Torres',
    role: 'Integration Engineer',
    startOffset: -4,
    tasks: [
      { title: 'Sign the employment agreement', owner: 'Taylor Nguyen', status: 'done' },
      { title: 'Issue development workstation', owner: 'Casey Hayes', status: 'doing' },
      { title: 'Read the connector contract guide', owner: 'Mia Chen', status: 'todo' },
      { title: 'Pair on a catalog app connector', owner: 'Sam Patel', status: 'todo' },
    ],
  },
  {
    newHire: 'Cameron Foster',
    role: 'Data Analyst',
    startOffset: 2,
    tasks: [
      { title: 'Sign the employment agreement', owner: 'Taylor Nguyen', status: 'todo' },
      { title: 'Request analytics dataset access', owner: 'Drew Ward', status: 'todo' },
    ],
  },
];

export function hasOnboardingDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, ONBOARDING_DEMO_PACK_ID).has();
}

export interface SeedOnboardingDemoResult {
  inserted: number;
}

export function seedOnboardingDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedOnboardingDemoResult {
  const ledger = new DemoSeedLedger(db, ONBOARDING_DEMO_PACK_ID);
  if (shouldSkipDemoSeed(db, ledger, ONBOARDING_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  ensurePersonIdColumn(db, 'onboarding_checklists', 'new_hire_id');
  ensurePersonIdColumn(db, 'onboarding_tasks', 'owner_id');
  ensureTextColumn(db, 'onboarding_tasks', 'due_date');

  let inserted = 0;

  for (const checklist of CHECKLISTS) {
    const startDate = shiftDemoDate(DEMO_TODAY, checklist.startOffset);
    const checklistId = insertRow(db, 'onboarding_checklists', {
      new_hire: checklist.newHire,
      new_hire_id: demoCastIdForName(checklist.newHire),
      role: checklist.role,
      start_date: startDate,
      created_at: `${DEMO_TODAY}T08:00:00`,
    });
    ledger.track('onboarding_checklists', checklistId);
    inserted += 1;

    checklist.tasks.forEach((task, index) => {
      const taskId = insertRow(db, 'onboarding_tasks', {
        checklist_id: checklistId,
        title: task.title,
        owner: task.owner,
        owner_id: demoCastIdForName(task.owner),
        due_date:
          task.dueOffset === undefined ? '' : shiftDemoDate(DEMO_TODAY, task.dueOffset),
        status: task.status,
        order: index,
      });
      ledger.track('onboarding_tasks', taskId);
      inserted += 1;
    });
  }

  return { inserted };
}

export function removeOnboardingDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, ONBOARDING_DEMO_PACK_ID);
  return ledger.deleteTracked(['onboarding_tasks', 'onboarding_checklists']);
}

/** Every task status present in the demo data (rule 6). */
export function onboardingDemoTaskStatuses(): string[] {
  return [...new Set(CHECKLISTS.flatMap((c) => c.tasks.map((t) => t.status)))];
}

/** Every cast person referenced as a hire or a task owner. */
export function onboardingDemoPersonNames(): string[] {
  return [
    ...new Set(
      CHECKLISTS.flatMap((c) => [c.newHire, ...c.tasks.map((t) => t.owner)]),
    ),
  ];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const onboardingDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: ONBOARDING_DEMO_BOOT_FLAG,
  has: hasOnboardingDemoDataset,
  seed: seedOnboardingDemoIfMissing,
};
