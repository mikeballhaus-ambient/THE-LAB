import { describe, test, expect } from '@jest/globals';
import {
  APP_SEED_DATA_MANIFESTS,
  listSeedPackTargets,
  packAllowsRemove,
} from '@/shared/config/app-seed-data-registry';
import { PROTECTED_PLATFORM_APP_IDS } from '@/shared/types/app/protected-apps';

describe('app-seed-data-registry', () => {
  test('covers all protected platform apps', () => {
    const manifestIds = new Set(APP_SEED_DATA_MANIFESTS.map((m) => m.appId));
    for (const appId of PROTECTED_PLATFORM_APP_IDS) {
      expect(manifestIds.has(appId)).toBe(true);
    }
  });

  test('infrastructure packs cannot be removed', () => {
    expect(packAllowsRemove('app-lab-chartbuilder', 'chart-samples')).toBe(false);
    expect(packAllowsRemove('app-lab-formsbuilder', 'forms-builder-platform-forms')).toBe(false);
  });

  test('demo packs can be removed', () => {
    expect(packAllowsRemove('app-lab-crm', 'crm-demo-records')).toBe(true);
    expect(packAllowsRemove('app-lab-tasklist', 'task-list-demo')).toBe(true);
    expect(packAllowsRemove('platform-lab', 'lab-demo-users')).toBe(true);
  });

  test('platform lab demo users pack is defined', () => {
    expect(packAllowsRemove('platform-lab', 'lab-demo-users')).toBe(true);
    expect(packAllowsRemove('platform-lab', 'chart-samples')).toBe(false);
  });

  test('listSeedPackTargets separates demo and infrastructure tiers', () => {
    const demo = listSeedPackTargets('demo');
    const infra = listSeedPackTargets('infrastructure');
    expect(demo.some((t) => t.packId === 'lab-demo-users')).toBe(true);
    expect(demo.some((t) => t.packId === 'chart-samples')).toBe(false);
    expect(infra.some((t) => t.packId === 'chart-samples')).toBe(true);
    expect(infra.every((t) => t.pack.tier === 'infrastructure')).toBe(true);
  });
});
