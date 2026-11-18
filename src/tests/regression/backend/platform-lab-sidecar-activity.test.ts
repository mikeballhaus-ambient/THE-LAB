import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { labSidecarActivityRepository } from '@/backend/db/LabSidecarActivity/lab-sidecar-activity-repository';
import { labSidecarActivityService } from '@/backend/db/LabSidecarActivity/lab-sidecar-activity-service';
import { DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS } from '@/shared/types/lab-sidecar-activity-settings';

describe('platform lab sidecar activity settings', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    await labSidecarActivityRepository.bootstrap(db);
  });

  afterAll(() => {
    labSidecarActivityRepository.close();
    db.close();
  });

  test('seeds default singleton row', () => {
    const settings = labSidecarActivityService.getPlatformSettings();
    expect(settings.thinkingLabel).toBe(DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS.thinkingLabel);
    expect(settings.workingLabels.length).toBeGreaterThan(0);
    expect(settings.rotateIntervalMs).toBe(DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS.rotateIntervalMs);
  });

  test('savePlatformSettings persists and validates', () => {
    const invalid = labSidecarActivityService.savePlatformSettings({
      thinkingLabel: '',
      workingLabels: [],
      rotateIntervalMs: 500,
    });
    expect(invalid.success).toBe(false);

    const saved = labSidecarActivityService.savePlatformSettings({
      thinkingLabel: 'Pondering…',
      workingLabels: ['Mixing reagents…'],
      rotateIntervalMs: 3000,
    });
    expect(saved.success).toBe(true);
    if (saved.success) {
      expect(saved.settings.thinkingLabel).toBe('Pondering…');
    }

    const loaded = labSidecarActivityService.getPlatformSettings();
    expect(loaded.thinkingLabel).toBe('Pondering…');
    expect(loaded.workingLabels).toEqual(['Mixing reagents…']);
  });
});
