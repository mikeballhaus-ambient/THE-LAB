import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const HOME_DEMO_PACK_ID = 'home-demo';
export const HOME_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.HOME_MAINTENANCE_DEMO;

/** Bump when demo row shape or content changes so boot re-seeds tracked rows on upgraded installs. */
export const HOME_DEMO_SEED_REVISION = 2;
const HOME_DEMO_REVISION_FLAG = `${HOME_DEMO_BOOT_FLAG}:revision`;

type MaintenanceStatus = 'scheduled' | 'due' | 'done' | 'skipped';
type MaintenancePriority = 'low' | 'normal' | 'high';

interface TaskSpec {
  title: string;
  /** Offset in days relative to DEMO_TODAY; negative = past due. */
  dueOffset: number;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  notes: string;
  /** Optional spend in USD for reports and forms demo. */
  cost?: number;
}

interface AssetSpec {
  name: string;
  category: string;
  location: string;
  notes: string;
  tasks: readonly TaskSpec[];
}

function needsDemoRevisionRefresh(db: Database): boolean {
  try {
    const row = db
      .prepare('SELECT value FROM configs WHERE key = ? LIMIT 1')
      .get(HOME_DEMO_REVISION_FLAG) as { value?: string } | undefined;
    const applied = Number.parseInt(row?.value ?? '', 10);
    return !Number.isFinite(applied) || applied < HOME_DEMO_SEED_REVISION;
  } catch {
    return true;
  }
}

function recordDemoRevision(db: Database): void {
  db.prepare(
    `INSERT INTO configs (key, value, type, description, updated_at)
     VALUES (?, ?, 'number', 'Home maintenance demo seed revision', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(HOME_DEMO_REVISION_FLAG, String(HOME_DEMO_SEED_REVISION));
}

/**
 * Four assets with ten tasks. Every status and every priority appears (rule 6).
 */
const ASSETS: readonly AssetSpec[] = [
  {
    name: 'Furnace',
    category: 'HVAC',
    location: 'Basement',
    notes: 'High-efficiency unit installed with the house.',
    tasks: [
      {
        title: 'Replace air filter',
        dueOffset: -3,
        status: 'done',
        priority: 'normal',
        notes: 'MERV 13, 20x25x1.',
        cost: 28.5,
      },
      {
        title: 'Annual service call',
        dueOffset: 9,
        status: 'scheduled',
        priority: 'high',
        notes: 'Booked with the original installer.',
        cost: 185,
      },
      {
        title: 'Check condensate drain',
        dueOffset: 0,
        status: 'due',
        priority: 'low',
        notes: 'Watch for standing water.',
      },
    ],
  },
  {
    name: 'Water heater',
    category: 'Plumbing',
    location: 'Utility closet',
    notes: 'Tank unit, 50 gallon.',
    tasks: [
      {
        title: 'Flush the tank',
        dueOffset: 25,
        status: 'scheduled',
        priority: 'normal',
        notes: 'Annual flush to clear sediment.',
      },
      {
        title: 'Test the pressure relief valve',
        dueOffset: -10,
        status: 'done',
        priority: 'high',
        notes: 'Opened and reseated cleanly.',
        cost: 0,
      },
    ],
  },
  {
    name: 'Roof',
    category: 'Exterior',
    location: 'Main house',
    notes: 'Asphalt shingle, south-facing slope takes the sun.',
    tasks: [
      {
        title: 'Clear the gutters',
        dueOffset: -1,
        status: 'due',
        priority: 'high',
        notes: 'Leaves from the storm.',
        cost: 120,
      },
      {
        title: 'Inspect flashing around the chimney',
        dueOffset: 40,
        status: 'scheduled',
        priority: 'normal',
        notes: 'Check after the first freeze.',
        cost: 75,
      },
      {
        title: 'Patch the loose ridge shingle',
        dueOffset: -20,
        status: 'skipped',
        priority: 'low',
        notes: 'Roofer recommended replacing the whole ridge next spring.',
      },
    ],
  },
  {
    name: 'Dishwasher',
    category: 'Appliance',
    location: 'Kitchen',
    notes: 'Stainless, about six years old.',
    tasks: [
      {
        title: 'Run a cleaning cycle',
        dueOffset: -5,
        status: 'done',
        priority: 'low',
        notes: 'Used the citric acid tablets.',
        cost: 12.99,
      },
      {
        title: 'Clean the filter basket',
        dueOffset: 2,
        status: 'scheduled',
        priority: 'normal',
        notes: 'Remove and rinse under warm water.',
      },
    ],
  },
];

export function hasHomeDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, HOME_DEMO_PACK_ID).has();
}

export interface SeedHomeDemoResult {
  inserted: number;
}

export function seedHomeDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedHomeDemoResult {
  const ledger = new DemoSeedLedger(db, HOME_DEMO_PACK_ID);

  if (options?.adminApply && ledger.has()) {
    removeHomeDemo(db);
  }

  if (needsDemoRevisionRefresh(db)) {
    if (ledger.has()) {
      removeHomeDemo(db);
    }
  }

  if (shouldSkipDemoSeed(db, ledger, HOME_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  let inserted = 0;

  for (const asset of ASSETS) {
    const assetId = insertRow(db, 'home_assets', {
      name: asset.name,
      category: asset.category,
      location: asset.location,
      notes: asset.notes,
      created_at: `${DEMO_TODAY}T08:00:00`,
    });
    ledger.track('home_assets', assetId);
    inserted += 1;

    for (const task of asset.tasks) {
      const dueDate = shiftDemoDate(DEMO_TODAY, task.dueOffset);
      const completedAt =
        task.status === 'done' ? `${shiftDemoDate(dueDate, -1)}T16:00:00` : null;
      const taskId = insertRow(db, 'home_maintenance_tasks', {
        asset_id: assetId,
        title: task.title,
        due_date: dueDate,
        status: task.status,
        priority: task.priority,
        completed_at: completedAt,
        notes: task.notes,
        cost: task.cost ?? null,
      });
      ledger.track('home_maintenance_tasks', taskId);
      inserted += 1;
    }
  }

  recordDemoRevision(db);

  return { inserted };
}

export function removeHomeDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, HOME_DEMO_PACK_ID);
  return ledger.deleteTracked(['home_maintenance_tasks', 'home_assets']);
}

/** Asset names in the demo pack. */
export function homeDemoAssetNames(): string[] {
  return ASSETS.map((a) => a.name);
}

/** Every maintenance status present in the demo data (rule 6). */
export function homeDemoStatuses(): string[] {
  return [...new Set(ASSETS.flatMap((a) => a.tasks.map((t) => t.status)))];
}

/** Every maintenance priority present in the demo data (rule 6). */
export function homeDemoPriorities(): string[] {
  return [...new Set(ASSETS.flatMap((a) => a.tasks.map((t) => t.priority)))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const homeDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: HOME_DEMO_BOOT_FLAG,
  has: hasHomeDemoDataset,
  seed: seedHomeDemoIfMissing,
};
