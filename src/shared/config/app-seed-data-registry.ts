import type { AppSeedDataManifest, AppSeedPackManifest } from '@/shared/types/app/app-seed-data';
import { PROTECTED_PLATFORM_APP_IDS } from '@/shared/types/app/protected-apps';
import {
  APP_DISPLAY_NAMES,
  CATALOG_DEMO_SEED_PACKS,
} from '@/shared/config/catalog-demo-seed-packs';

const infrastructure = (): Pick<AppSeedPackManifest, 'tier' | 'allowRemove'> => ({
  tier: 'infrastructure',
  allowRemove: false,
});

const demo = (): Pick<AppSeedPackManifest, 'tier' | 'allowRemove'> => ({
  tier: 'demo',
  allowRemove: true,
});

/** Main lab DB seed packs (handled on platform backend, not app servers). */
export const PLATFORM_LAB_SEED_MANIFEST: AppSeedDataManifest = {
  appId: 'platform-lab',
  appName: 'THE-LAB (platform)',
  packs: [
    {
      packId: 'lab-demo-users',
      label: 'Lab demo users',
      description:
        'Local test accounts (mia.chen@lab.local, etc.). Excludes OIDC sign-in users. Bootstrap admin is never removed.',
      ...demo(),
    },
  ],
};

/** Static manifests for Settings UI and platform orchestration (status fetched from app servers). */
export const APP_SEED_DATA_MANIFESTS: AppSeedDataManifest[] = [
  {
    appId: 'app-lab-chartbuilder',
    appName: 'Chart Builder',
    packs: [
      {
        packId: 'chart-samples',
        label: 'Platform chart definitions',
        description: 'Shared chart_seed_* templates used by CRM, Task List, and Help Desk dashboards.',
        // Infrastructure: shared platform templates. Removing them breaks the
        // dashboards that bind to them, so `allowRemove` stays false.
        ...infrastructure(),
      },
    ],
  },
  {
    appId: 'app-lab-formsbuilder',
    appName: 'Forms Builder',
    packs: [
      {
        packId: 'forms-builder-platform-forms',
        label: 'Platform connector forms',
        description: 'Published forms and data connectors required for CRM, Task List, and Help Desk FormMounter.',
        // Infrastructure: required by FormMounter mounts. Not removable.
        ...infrastructure(),
      },
    ],
  },
  {
    appId: 'app-lab-crm',
    appName: 'CRM',
    packs: [
      {
        packId: 'crm-demo-records',
        label: 'CRM demo records',
        description: 'Sample contacts, leads, pipeline, products, and inventory for training and dashboards.',
        ...demo(),
      },
    ],
  },
  {
    appId: 'app-lab-tasklist',
    appName: 'Task List',
    packs: [
      {
        packId: 'task-list-demo',
        label: 'Task List demo data',
        description: 'Sample lists and tasks for landing reports and training.',
        ...demo(),
      },
    ],
  },
  {
    appId: 'app-lab-workflow-studio',
    appName: 'Workflow Studio',
    packs: [
      {
        packId: 'phase2-platform-demo',
        label: 'Workflows demo sample',
        description: 'Sample user workflow on task-completed events (main DB).',
        ...demo(),
      },
    ],
  },
  {
    appId: 'app-lab-approvals-policies',
    appName: 'Approvals & Policies',
    packs: [
      {
        packId: 'phase2-platform-demo',
        label: 'Approval policy demo sample',
        description: 'Demo 3 step approval policy + Workflow Studio ledger chain (main DB).',
        ...demo(),
      },
    ],
  },
  {
    appId: 'app-lab-financial-ledger',
    appName: 'Financial Ledger',
    packs: [
      {
        packId: 'phase2-platform-demo',
        label: 'Ledger accounts demo sample',
        description: 'Demo cash and revenue accounts (main DB).',
        ...demo(),
      },
    ],
  },
  {
    appId: 'app-lab-app-builder',
    appName: 'App Builder',
    packs: [
      {
        packId: 'phase2-platform-demo',
        label: 'Catalog tag demo sample',
        description: 'Demo catalog tag for training (main DB).',
        ...demo(),
      },
    ],
  },
  {
    appId: 'app-lab-helpdesk',
    appName: 'Help Desk',
    packs: [
      {
        packId: 'kanban-defaults',
        label: 'Default kanban boards',
        description: 'System kanban views (status, priority, assignee).',
        ...demo(),
      },
      {
        packId: 'help-desk-demo-tickets',
        label: 'Help Desk demo tickets',
        description: 'Sample tickets for queue metrics and training.',
        ...demo(),
      },
    ],
  },
  ...CATALOG_DEMO_SEED_PACKS.map(
    (pack): AppSeedDataManifest => ({
      appId: pack.appId,
      appName: APP_DISPLAY_NAMES[pack.appId] ?? pack.appId,
      packs: [
        {
          packId: pack.packId,
          label: pack.label,
          description: pack.description,
          ...demo(),
        },
      ],
    }),
  ),
];

export function listAllSeedDataManifests(): AppSeedDataManifest[] {
  return [PLATFORM_LAB_SEED_MANIFEST, ...APP_SEED_DATA_MANIFESTS];
}

export function getAppSeedManifest(appId: string): AppSeedDataManifest | undefined {
  if (appId === PLATFORM_LAB_SEED_MANIFEST.appId) {
    return PLATFORM_LAB_SEED_MANIFEST;
  }
  return APP_SEED_DATA_MANIFESTS.find((m) => m.appId === appId);
}

export function isPlatformLabSeedAppId(appId: string): boolean {
  return appId === PLATFORM_LAB_SEED_MANIFEST.appId;
}

export function isProtectedAppWithSeedSupport(appId: string): boolean {
  return (PROTECTED_PLATFORM_APP_IDS as readonly string[]).includes(appId);
}

export function packAllowsRemove(appId: string, packId: string): boolean {
  const manifest = getAppSeedManifest(appId);
  const pack = manifest?.packs.find((p) => p.packId === packId);
  return pack?.allowRemove === true;
}

export interface AppSeedPackTarget {
  appId: string;
  appName: string;
  packId: string;
  pack: AppSeedPackManifest;
}

export function listSeedPackTargets(tier?: AppSeedPackManifest['tier']): AppSeedPackTarget[] {
  const out: AppSeedPackTarget[] = [];
  for (const manifest of listAllSeedDataManifests()) {
    for (const pack of manifest.packs) {
      if (tier && pack.tier !== tier) {
        continue;
      }
      out.push({
        appId: manifest.appId,
        appName: manifest.appName,
        packId: pack.packId,
        pack,
      });
    }
  }
  return out;
}
