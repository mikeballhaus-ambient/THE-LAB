import type { Database } from 'better-sqlite3';
import {
  labWorkflowDefinitionContentKey,
  preserveLabWorkflowCanvasLayout,
} from '@/shared/utils/lab-workflow-graph-viewport';
import { APP_SEED_BOOT_FLAG_KEYS } from '@/shared/config/app-seed-boot-flags';
import type { AppSeedOperationResult, AppSeedPackStatus } from '@/shared/types/app/app-seed-data';
import { labWorkflowsRepository } from '../LabWorkflows/lab-workflows-repository';
import { labWorkflowWebhooksRepository } from '../LabWorkflows/lab-workflow-webhooks-repository';
import { labApprovalsRepository } from '../LabApprovals/lab-approvals-repository';
import { labLedgerRepository } from '../LabLedger/lab-ledger-repository';
import {
  DEMO_LEDGER_JOURNAL_MARKER_ENTRY_ID,
  DEMO_LEDGER_NORTHWIND_ENTRY_ID,
  DEMO_LEDGER_NORTHWIND_TRAVEL_ENTRY_ID,
  DEMO_LEDGER_SUMMIT_ENTRY_ID,
  deleteSeededLedgerEntries,
  purgeNonCanonicalLedgerJournalEntries,
  seedDefaultLedgerJournalIfMissing,
  seedPlatformCatalogLedgerDemoJournalIfMissing,
} from '../LabLedger/lab-ledger-journal-seed';
import { appTagsRepository } from '../AppTags/app-tags-repository';
import {
  DEMO_APPROVAL_POLICY_SEEDS,
  DEMO_WORKFLOW_SEEDS,
  DEMO_WORKFLOW_WEBHOOK_LOOP_ID,
  REMOVED_DEMO_WORKFLOW_IDS,
} from '@/shared/utils/demo-workflow-seed-catalog';
import { hashWebhookToken } from '@/shared/utils/lab-workflow-webhook-auth';
import type { LabApprovalPolicyDefinitionV1 } from '@/shared/types/lab-approval';

/**
 * Token for the loop demo's **test** endpoint.
 *
 * Fixed and documented rather than random: the demo's whole point is a URL a reader can copy from the
 * docs and call. It is seeded only into `test_token_hash`, so even a leaked value runs a **preview** —
 * it cannot notify anyone. The live endpoint gets a random secret that is never printed, which is the
 * right way round: convenience where it is harmless, secrecy where it is not.
 */
export const DEMO_WEBHOOK_LOOP_TEST_TOKEN = 'demo-loop-hook-test';
export const DEMO_WEBHOOK_LOOP_SLUG = 'demo-loop';


/**
 * Demo seed pack id for the platform catalog apps.
 *
 * The value `'phase2-platform-demo'` is **legacy and must not change**: it is persisted in
 * `platform_seed_boot_flags.key` and appears in existing installs. Renaming it requires a
 * data migration that also handles installs where the pack was removed. Treat as opaque.
 */
export const PLATFORM_CATALOG_DEMO_PACK_ID = 'phase2-platform-demo';

export const PLATFORM_CATALOG_APP_IDS = [
  'app-lab-workflow-studio',
  'app-lab-approvals-policies',
  'app-lab-financial-ledger',
  'app-lab-app-builder',
] as const;

export type PlatformCatalogAppId = (typeof PLATFORM_CATALOG_APP_IDS)[number];

export function isPlatformCatalogAppId(appId: string): boolean {
  return (PLATFORM_CATALOG_APP_IDS as readonly string[]).includes(appId);
}

export { DEMO_WORKFLOW_ID } from '@/shared/utils/demo-workflow-seed-catalog';
export const DEMO_POLICY_ID = 'a1000003-0003-4003-8003-000000000003';
export const DEMO_LEDGER_CASH_ID = 'a1000004-0004-4004-8004-000000000004';
export const DEMO_LEDGER_REVENUE_ID = 'a1000005-0005-4005-8005-000000000005';
export const DEMO_CATALOG_TAG_ID = 'demo-training';

/** Bump when demo workflow JSON changes so startup sync can refresh existing DBs. */
export const DEMO_AUTOMATION_DEFINITION_REVISION = 28;
const SAMPLE_CATALOG_TAG_DESCRIPTION = 'Sample tag for training and the app catalog.';
const DEMO_LEDGER_CASH_NAME = 'Demo Cash';
const DEMO_LEDGER_REVENUE_NAME = 'Demo Revenue';

/** Drop stale manual/test approval requests on seeded demo policies (CRM, timesheet, expense, etc.). */
function purgeDemoApprovalRequests(): boolean {
  const policyIds = DEMO_APPROVAL_POLICY_SEEDS.map((seed) => seed.id);
  return labApprovalsRepository.deleteRequestsForPolicyIds(policyIds) > 0;
}

/**
 * Drop journal rows from CRM Post entry, workflow `ledger_post_entry`, and manual tests.
 * Runs only when the platform ledger demo pack is present and demo boot seeding is enabled.
 */
export function purgeTestLedgerJournalEntriesOnDemoSync(db: Database): boolean {
  if (isPlatformSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.LAB_LEDGER_DEMO)) {
    return false;
  }
  if (!labLedgerRepository.getAccountById(DEMO_LEDGER_CASH_ID)) {
    return false;
  }
  const removed = purgeNonCanonicalLedgerJournalEntries();
  if (removed > 0) {
    seedDefaultLedgerJournalIfMissing(1);
    seedPlatformCatalogLedgerDemoJournalIfMissing(1);
  }
  return removed > 0;
}

function syncDemoApprovalPolicies(): boolean {
  let changed = false;
  for (const seed of DEMO_APPROVAL_POLICY_SEEDS) {
    const policy = labApprovalsRepository.getPolicyById(seed.id);
    if (!policy) {
      continue;
    }
    const seedDefinition = JSON.parse(seed.definitionJson) as LabApprovalPolicyDefinitionV1;
    if (
      policy.name !== seed.name ||
      policy.description !== seed.description ||
      JSON.stringify(policy.definition) !== seed.definitionJson
    ) {
      labApprovalsRepository.updatePolicy({
        ...policy,
        name: seed.name,
        description: seed.description,
        definition: seedDefinition,
      });
      changed = true;
    }
  }
  return changed;
}

export interface SeedApplyOptions {
  adminApply?: boolean;
}

function ensurePlatformSeedBootSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_seed_boot_flags (
      key TEXT PRIMARY KEY NOT NULL,
      disabled INTEGER NOT NULL DEFAULT 0
    );
  `);
}

function isPlatformSeedBootDisabled(db: Database, flagKey: string): boolean {
  ensurePlatformSeedBootSchema(db);
  const row = db
    .prepare('SELECT disabled FROM platform_seed_boot_flags WHERE key = ? LIMIT 1')
    .get(flagKey) as { disabled: number } | undefined;
  return row?.disabled === 1;
}

function setPlatformSeedBootDisabled(db: Database, flagKey: string, disabled: boolean): void {
  ensurePlatformSeedBootSchema(db);
  if (disabled) {
    db.prepare(
      `INSERT INTO platform_seed_boot_flags (key, disabled) VALUES (?, 1)
       ON CONFLICT(key) DO UPDATE SET disabled = 1`,
    ).run(flagKey);
    return;
  }
  db.prepare('DELETE FROM platform_seed_boot_flags WHERE key = ?').run(flagKey);
}

function bootFlagForApp(appId: PlatformCatalogAppId): string {
  switch (appId) {
    case 'app-lab-workflow-studio':
      return APP_SEED_BOOT_FLAG_KEYS.LAB_WORKFLOWS_DEMO;
    case 'app-lab-approvals-policies':
      return APP_SEED_BOOT_FLAG_KEYS.LAB_APPROVALS_DEMO;
    case 'app-lab-financial-ledger':
      return APP_SEED_BOOT_FLAG_KEYS.LAB_LEDGER_DEMO;
    case 'app-lab-app-builder':
      return APP_SEED_BOOT_FLAG_KEYS.LAB_APP_BUILDER_DEMO;
    default:
      return '';
  }
}

export function hasPlatformCatalogDemoForApp(db: Database, appId: PlatformCatalogAppId): boolean {
  switch (appId) {
    case 'app-lab-workflow-studio':
      return DEMO_WORKFLOW_SEEDS.every((seed) => Boolean(labWorkflowsRepository.getById(seed.id)));
    case 'app-lab-approvals-policies':
      return DEMO_APPROVAL_POLICY_SEEDS.every((seed) =>
        Boolean(labApprovalsRepository.getPolicyById(seed.id)),
      );
    case 'app-lab-financial-ledger':
      return Boolean(labLedgerRepository.getAccountById(DEMO_LEDGER_CASH_ID));
    case 'app-lab-app-builder':
      return appTagsRepository.listTags().some((t) => t.id === DEMO_CATALOG_TAG_ID);
    default:
      return false;
  }
}


/**
 * Bring a demo row's **content** up to date with the code seed, without touching its **layout**.
 *
 * ## Why layout is excluded from the comparison
 *
 * Node positions and viewport are the author's work, not seed data. Comparing the full JSON meant a
 * graph the user had dragged into shape looked "different" from the seed on every backend start, so
 * the sync rewrote the row — and because the seed's own definition is produced by
 * `autoArrangeLabWorkflowGraph`, the rewrite replaced the user's layout with auto-arrange's. The
 * symptom was exactly "it's fine until I restart the lab, then the nodes move".
 *
 * Position is therefore preserved per node id: an existing node keeps where it was put, and only a
 * node the seed newly introduced takes the seed's arranged position. The comparison uses
 * {@link labWorkflowDefinitionContentKey} so a pure layout difference no longer counts as a change
 * and does not trigger a write at all.
 */
function purgeRemovedDemoWorkflows(): boolean {
  let changed = false;
  for (const id of REMOVED_DEMO_WORKFLOW_IDS) {
    if (labWorkflowsRepository.getById(id)) {
      labWorkflowsRepository.deleteWorkflow(id);
      changed = true;
    }
  }
  return changed;
}

function syncDemoAutomationDefinitions(db: Database, _createdByUserId: number): boolean {
  let changed = false;
  if (purgeRemovedDemoWorkflows()) {
    changed = true;
  }

  for (const seed of DEMO_WORKFLOW_SEEDS) {
    const workflow = labWorkflowsRepository.getById(seed.id);
    if (!workflow) {
      continue;
    }
    const seedDefinition = seed.buildDefinition();
    const merged = preserveLabWorkflowCanvasLayout(
      seedDefinition,
      workflow.definition as typeof seedDefinition,
    );
    const next = {
      ...workflow,
      name: seed.name,
      scope: 'global' as const,
      ownerUserId: null,
      description: seed.description,
      definition: merged,
      priority: seed.priority,
    };
    const contentChanged =
      labWorkflowDefinitionContentKey(workflow.definition as typeof seedDefinition) !==
      labWorkflowDefinitionContentKey(seedDefinition);
    if (
      workflow.name !== next.name ||
      workflow.scope !== 'global' ||
      workflow.ownerUserId != null ||
      workflow.description !== next.description ||
      workflow.priority !== next.priority ||
      contentChanged
    ) {
      labWorkflowsRepository.updateWorkflow(next);
      changed = true;
    }
  }

  const policyChanged = syncDemoApprovalPolicies();
  if (policyChanged) {
    changed = true;
  }
  if (purgeDemoApprovalRequests()) {
    changed = true;
  }
  if (purgeTestLedgerJournalEntriesOnDemoSync(db)) {
    changed = true;
  }
  if (seedApprovalsDemo(_createdByUserId)) {
    changed = true;
  }
  if (seedWorkflowsDemo(_createdByUserId)) {
    changed = true;
  }

  const cash = labLedgerRepository.getAccountById(DEMO_LEDGER_CASH_ID);
  if (cash && cash.name !== DEMO_LEDGER_CASH_NAME) {
    labLedgerRepository.updateAccount({ ...cash, name: DEMO_LEDGER_CASH_NAME });
    changed = true;
  }
  const revenue = labLedgerRepository.getAccountById(DEMO_LEDGER_REVENUE_ID);
  if (revenue && revenue.name !== DEMO_LEDGER_REVENUE_NAME) {
    labLedgerRepository.updateAccount({ ...revenue, name: DEMO_LEDGER_REVENUE_NAME });
    changed = true;
  }
  if (seedPlatformCatalogLedgerDemoJournalIfMissing(_createdByUserId)) {
    changed = true;
  }

  const tag = appTagsRepository.listTags().find((row) => row.id === DEMO_CATALOG_TAG_ID);
  if (tag) {
    if (tag.description !== SAMPLE_CATALOG_TAG_DESCRIPTION) {
      appTagsRepository.updateTag(DEMO_CATALOG_TAG_ID, { description: SAMPLE_CATALOG_TAG_DESCRIPTION });
      changed = true;
    }
  }

  return changed;
}

function seedWorkflowsDemo(createdByUserId: number): boolean {
  let inserted = false;
  for (const seed of DEMO_WORKFLOW_SEEDS) {
    if (labWorkflowsRepository.getById(seed.id)) {
      continue;
    }
    labWorkflowsRepository.insertWorkflow({
      id: seed.id,
      name: seed.name,
      description: seed.description,
      scope: 'global',
      ownerUserId: null,
      createdByUserId,
      enabled: true,
      priority: seed.priority,
      definitionJson: JSON.stringify(seed.buildDefinition()),
    });
    inserted = true;
  }
  return inserted;
}

/**
 * Create the loop demo's webhook pair if it is missing (phase 37).
 *
 * Runs **after** `insertWorkflow`, because `lab_workflow_webhooks.workflow_id` is a foreign key — the
 * same reason the run-resume table needs its workflow first.
 *
 * Guarded on `slugExists` rather than on the workflow: every install that already has the loop
 * workflow from `cd14ee5` is in the "workflow exists, webhook does not" state, and this is what
 * repairs them.
 *
 * The **live** secret is random and never printed. The **test** secret is a fixed constant, documented
 * in the app instructions, so the demo is one copy-paste. That asymmetry is the safety property: the
 * shareable value can only ever run a preview.
 */
/**
 * Fill in the plaintext test secret on a hook seeded before that column existed.
 *
 * Only the **test** value is repairable: it is a documented constant. The live secret on such a row
 * was random and never recorded, so it is left as `''` and the panel offers regenerate — which is the
 * honest state, not a bug.
 */
function repairSeededWebhookLoopDemo(): void {
  const existing = labWorkflowWebhooksRepository
    .listForWorkflow(DEMO_WORKFLOW_WEBHOOK_LOOP_ID)
    .find((hook) => hook.slug === DEMO_WEBHOOK_LOOP_SLUG);
  if (!existing || existing.testSecret) {
    return;
  }
  labWorkflowWebhooksRepository.setSecret(
    existing.workflowId,
    existing.id,
    'test',
    {
      tokenHash: hashWebhookToken(DEMO_WEBHOOK_LOOP_TEST_TOKEN),
      secret: DEMO_WEBHOOK_LOOP_TEST_TOKEN,
    },
  );
}

/**
 * The loop demo seeds **no webhook endpoint** on purpose.
 *
 * A webhook is a credential the author mints, not demo data. Seeding one meant the demo opened with a
 * test URL and a live URL already in place, so nobody ever walked the flow the feature exists to
 * teach: press *Create webhook endpoint*, copy the test URL, POST to it, adopt the captured shape.
 * It also shipped a live URL nobody had chosen to create.
 *
 * `repairSeededWebhookLoopDemo()` is kept for installs that already carry the old seeded row, so an
 * existing lab keeps a working test URL instead of silently losing it.
 */
function seedWebhookLoopDemo(): boolean {
  repairSeededWebhookLoopDemo();
  return false;
}

function seedApprovalsDemo(createdByUserId: number): boolean {
  let inserted = false;
  for (const seed of DEMO_APPROVAL_POLICY_SEEDS) {
    if (labApprovalsRepository.getPolicyById(seed.id)) {
      continue;
    }
    labApprovalsRepository.insertPolicy({
      id: seed.id,
      name: seed.name,
      description: seed.description,
      enabled: true,
      createdByUserId,
      definitionJson: seed.definitionJson,
    });
    inserted = true;
  }
  return inserted;
}

function seedLedgerDemo(): boolean {
  let inserted = false;
  if (!labLedgerRepository.getAccountById(DEMO_LEDGER_CASH_ID)) {
    labLedgerRepository.insertAccount({
      id: DEMO_LEDGER_CASH_ID,
      code: 'DEMO-CASH',
      name: DEMO_LEDGER_CASH_NAME,
      type: 'asset',
      normalBalance: 'debit',
      enabled: true,
    });
    inserted = true;
  }
  if (!labLedgerRepository.getAccountById(DEMO_LEDGER_REVENUE_ID)) {
    labLedgerRepository.insertAccount({
      id: DEMO_LEDGER_REVENUE_ID,
      code: 'DEMO-REV',
      name: DEMO_LEDGER_REVENUE_NAME,
      type: 'revenue',
      normalBalance: 'credit',
      enabled: true,
    });
    inserted = true;
  }
  if (seedPlatformCatalogLedgerDemoJournalIfMissing(1)) {
    inserted = true;
  }
  return inserted;
}

function seedCatalogTagDemo(): boolean {
  if (appTagsRepository.listTags().some((t) => t.id === DEMO_CATALOG_TAG_ID)) {
    return false;
  }
  appTagsRepository.createTag({
    id: DEMO_CATALOG_TAG_ID,
    label: 'Demo training',
    description: SAMPLE_CATALOG_TAG_DESCRIPTION,
    sortOrder: 900,
  });
  return true;
}

export function seedPlatformCatalogDemoForAppIfMissing(
  db: Database,
  appId: PlatformCatalogAppId,
  options?: SeedApplyOptions,
): { inserted: boolean } {
  const flagKey = bootFlagForApp(appId);
  if (!options?.adminApply && flagKey && isPlatformSeedBootDisabled(db, flagKey)) {
    return { inserted: false };
  }
  if (hasPlatformCatalogDemoForApp(db, appId)) {
    return { inserted: false };
  }

  const createdByUserId = 1;
  let inserted = false;
  switch (appId) {
    case 'app-lab-workflow-studio':
      inserted = seedWorkflowsDemo(createdByUserId);
      // Ordered after the workflows: the webhook row has a foreign key to the workflow, and the loop
      // demo is one of the workflows just seeded.
      if (seedWebhookLoopDemo()) {
        inserted = true;
      }
      break;
    case 'app-lab-approvals-policies':
      inserted = seedApprovalsDemo(createdByUserId);
      break;
    case 'app-lab-financial-ledger':
      inserted = seedLedgerDemo();
      break;
    case 'app-lab-app-builder':
      inserted = seedCatalogTagDemo();
      break;
    default:
      break;
  }

  if (inserted && hasPlatformCatalogDemoForApp(db, appId) && flagKey) {
    setPlatformSeedBootDisabled(db, flagKey, false);
  }
  return { inserted };
}

export function removePlatformCatalogDemoForApp(db: Database, appId: PlatformCatalogAppId): number {
  let removed = 0;
  switch (appId) {
    case 'app-lab-workflow-studio':
      for (const seed of DEMO_WORKFLOW_SEEDS) {
        if (labWorkflowsRepository.getById(seed.id)) {
          labWorkflowsRepository.deleteWorkflow(seed.id);
          removed += 1;
        }
      }
      break;
    case 'app-lab-approvals-policies':
      if (labApprovalsRepository.getPolicyById(DEMO_POLICY_ID)) {
        labApprovalsRepository.deletePolicy(DEMO_POLICY_ID);
        removed = 1;
      }
      break;
    case 'app-lab-financial-ledger':
      removed += deleteSeededLedgerEntries([
        DEMO_LEDGER_JOURNAL_MARKER_ENTRY_ID,
        DEMO_LEDGER_NORTHWIND_ENTRY_ID,
        DEMO_LEDGER_NORTHWIND_TRAVEL_ENTRY_ID,
        DEMO_LEDGER_SUMMIT_ENTRY_ID,
      ]);
      if (labLedgerRepository.getAccountById(DEMO_LEDGER_CASH_ID)) {
        labLedgerRepository.deleteAccount(DEMO_LEDGER_CASH_ID);
        removed += 1;
      }
      if (labLedgerRepository.getAccountById(DEMO_LEDGER_REVENUE_ID)) {
        labLedgerRepository.deleteAccount(DEMO_LEDGER_REVENUE_ID);
        removed += 1;
      }
      break;
    case 'app-lab-app-builder':
      if (appTagsRepository.listTags().some((t) => t.id === DEMO_CATALOG_TAG_ID)) {
        const result = appTagsRepository.deleteTag(DEMO_CATALOG_TAG_ID);
        if (!result.blocked) {
          removed = 1;
        }
      }
      break;
    default:
      break;
  }
  const flagKey = bootFlagForApp(appId);
  if (removed > 0 && flagKey) {
    setPlatformSeedBootDisabled(db, flagKey, true);
  }
  return removed;
}

export function seedAllPlatformCatalogDemoIfMissing(db: Database): void {
  ensurePlatformSeedBootSchema(db);
  syncDemoAutomationDefinitions(db, 1);
  for (const appId of PLATFORM_CATALOG_APP_IDS) {
    seedPlatformCatalogDemoForAppIfMissing(db, appId);
  }
}

export function getPlatformCatalogSeedStatus(
  db: Database,
  appId: string,
): AppSeedPackStatus[] {
  if (!isPlatformCatalogAppId(appId)) {
    return [];
  }
  const present = hasPlatformCatalogDemoForApp(db, appId as PlatformCatalogAppId);
  return [
    {
      packId: PLATFORM_CATALOG_DEMO_PACK_ID,
      present,
      serverReachable: true,
      message: present
        ? 'Demo sample data is present (main database).'
        : 'Apply to insert sample records for this platform app.',
    },
  ];
}

export function executePlatformCatalogSeedPack(
  db: Database,
  appId: string,
  packId: string,
  action: 'apply' | 'remove',
): AppSeedOperationResult {
  if (!isPlatformCatalogAppId(appId)) {
    return { success: false, content: `Not a phase-2 platform catalog app: ${appId}` };
  }
  if (packId !== PLATFORM_CATALOG_DEMO_PACK_ID) {
    return { success: false, content: `Unknown pack: ${packId}` };
  }
  const catalogAppId = appId as PlatformCatalogAppId;
  if (action === 'remove') {
    const removed = removePlatformCatalogDemoForApp(db, catalogAppId);
    return {
      success: true,
      content:
        removed > 0
          ? `Removed ${removed} demo record(s) for ${appId}.`
          : 'No demo dataset was present.',
    };
  }
  const { inserted } = seedPlatformCatalogDemoForAppIfMissing(db, catalogAppId, { adminApply: true });
  const present = hasPlatformCatalogDemoForApp(db, catalogAppId);
  return {
    success: present,
    content: inserted
      ? `Inserted demo sample data for ${appId}.`
      : present
        ? 'Demo sample data is already present.'
        : 'Demo seed did not apply — check server logs.',
  };
}
