import type { Database } from 'better-sqlite3';
import {
  CATALOG_DEMO_BOOT_FLAG_KEYS,
  catalogDemoSeedPackFor,
} from '@/shared/config/catalog-demo-seed-packs';

/** App `configs` keys — suppress auto-seed on boot after admin Remove in Settings. */
export const APP_SEED_BOOT_FLAG_KEYS = {
  CRM_DEMO: 'crm_demo_seed_disabled',
  TASK_LIST_DEMO: 'task_list_demo_seed_disabled',
  HELP_DESK_KANBAN: 'help_desk_kanban_seed_disabled',
  HELP_DESK_DEMO_TICKETS: 'help_desk_demo_tickets_seed_disabled',
  FORMS_BUILDER_PLATFORM: 'forms_builder_platform_seed_disabled',
  CHART_BUILDER_SAMPLES: 'chart_builder_samples_seed_disabled',
  LAB_WORKFLOWS_DEMO: 'lab_workflows_demo_seed_disabled',
  LAB_APPROVALS_DEMO: 'lab_approvals_demo_seed_disabled',
  LAB_LEDGER_DEMO: 'lab_ledger_demo_seed_disabled',
  LAB_APP_BUILDER_DEMO: 'lab_app_builder_demo_seed_disabled',

  // Wave C catalog demo packs (single source: catalog-demo-seed-packs.ts)
  ...CATALOG_DEMO_BOOT_FLAG_KEYS,
  KNOWLEDGE_BASE_DOCS: CATALOG_DEMO_BOOT_FLAG_KEYS.KNOWLEDGE_BASE_DOCS,
} as const;

export function getAppSeedBootFlagKey(appId: string, packId: string): string | undefined {
  switch (appId) {
    case 'app-lab-crm':
      if (packId === 'crm-demo-records') {
        return APP_SEED_BOOT_FLAG_KEYS.CRM_DEMO;
      }
      break;
    case 'app-lab-tasklist':
      if (packId === 'task-list-demo') {
        return APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO;
      }
      break;
    case 'app-lab-helpdesk':
      if (packId === 'kanban-defaults') {
        return APP_SEED_BOOT_FLAG_KEYS.HELP_DESK_KANBAN;
      }
      if (packId === 'help-desk-demo-tickets') {
        return APP_SEED_BOOT_FLAG_KEYS.HELP_DESK_DEMO_TICKETS;
      }
      break;
    case 'app-lab-formsbuilder':
      if (packId === 'forms-builder-platform-forms') {
        return APP_SEED_BOOT_FLAG_KEYS.FORMS_BUILDER_PLATFORM;
      }
      break;
    case 'app-lab-chartbuilder':
      if (packId === 'chart-samples') {
        return APP_SEED_BOOT_FLAG_KEYS.CHART_BUILDER_SAMPLES;
      }
      break;
    case 'app-lab-workflow-studio':
      if (packId === 'phase2-platform-demo') {
        return APP_SEED_BOOT_FLAG_KEYS.LAB_WORKFLOWS_DEMO;
      }
      break;
    case 'app-lab-approvals-policies':
      if (packId === 'phase2-platform-demo') {
        return APP_SEED_BOOT_FLAG_KEYS.LAB_APPROVALS_DEMO;
      }
      break;
    case 'app-lab-financial-ledger':
      if (packId === 'phase2-platform-demo') {
        return APP_SEED_BOOT_FLAG_KEYS.LAB_LEDGER_DEMO;
      }
      break;
    case 'app-lab-app-builder':
      if (packId === 'phase2-platform-demo') {
        return APP_SEED_BOOT_FLAG_KEYS.LAB_APP_BUILDER_DEMO;
      }
      break;
    default: {
      const catalogPack = catalogDemoSeedPackFor(appId);
      if (catalogPack && catalogPack.packId === packId) {
        return catalogPack.bootFlagKey;
      }
      break;
    }
  }
  return undefined;
}

export function isAppSeedBootDisabled(db: Database, flagKey: string): boolean {
  try {
    const row = db.prepare('SELECT value FROM configs WHERE key = ? LIMIT 1').get(flagKey) as
      | { value: string }
      | undefined;
    return row?.value === '1';
  } catch {
    return false;
  }
}

export function setAppSeedBootDisabled(db: Database, flagKey: string, disabled: boolean): void {
  if (disabled) {
    db.prepare(
      `INSERT INTO configs (key, value, type, description, updated_at)
       VALUES (?, '1', 'boolean', 'Set by Settings demo data remove', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = '1', updated_at = datetime('now')`,
    ).run(flagKey);
    return;
  }
  db.prepare('DELETE FROM configs WHERE key = ?').run(flagKey);
}

export function syncAppSeedBootFlagForPack(
  db: Database,
  appId: string,
  packId: string,
  disabled: boolean,
): void {
  const flagKey = getAppSeedBootFlagKey(appId, packId);
  if (!flagKey) {
    return;
  }
  setAppSeedBootDisabled(db, flagKey, disabled);
}
