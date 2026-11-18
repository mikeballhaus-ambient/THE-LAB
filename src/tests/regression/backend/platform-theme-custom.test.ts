import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { labThemeCustomPresetService } from '@/backend/db/Theme/lab-theme-custom-service';
import { labThemeRepository } from '@/backend/db/Theme/lab-theme-repository';
import { labThemeService } from '@/backend/db/Theme/lab-theme-service';
import { createCustomLabThemePresetId } from '@/shared/theme/lab-theme-preset-id';

describe('platform custom theme presets (rm-49 phase 9)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    await labThemeRepository.bootstrap(db);
  });

  afterAll(() => {
    labThemeRepository.close();
    db.close();
  });

  test('creates custom preset from built-in duplicate', () => {
    const created = labThemeCustomPresetService.createCustomPreset({
      name: 'Test dark',
      mode: 'dark',
      duplicateFromPresetId: 'cloud-grey-dark',
      createdByUserId: 1,
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }
    expect(created.preset.name).toBe('Test dark');
    expect(created.preset.tokens['general-bg']).toBeTruthy();
  });

  test('platform theme can reference custom preset id', () => {
    const created = labThemeCustomPresetService.createCustomPreset({
      name: 'Active custom',
      mode: 'dark',
      duplicateFromPresetId: 'cloud-grey-dark',
      createdByUserId: 1,
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }
    const saved = labThemeService.savePlatformTheme({
      mode: 'dark',
      presetId: created.preset.presetId,
    });
    expect(saved.success).toBe(true);
  });

  test('cannot delete active custom preset', () => {
    const created = labThemeCustomPresetService.createCustomPreset({
      name: 'Locked',
      mode: 'dark',
      createdByUserId: null,
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }
    labThemeService.savePlatformTheme({
      mode: 'dark',
      presetId: created.preset.presetId,
    });
    const deleted = labThemeCustomPresetService.deleteCustomPreset(created.preset.id);
    expect(deleted.success).toBe(false);
  });

  test('delete succeeds when custom preset is not active', () => {
    const created = labThemeCustomPresetService.createCustomPreset({
      name: 'Disposable',
      mode: 'dark',
      createdByUserId: null,
    });
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }
    const deleted = labThemeCustomPresetService.deleteCustomPreset(created.preset.id);
    expect(deleted.success).toBe(true);
  });

  test('rejects invalid custom preset on platform save', () => {
    const saved = labThemeService.savePlatformTheme({
      mode: 'dark',
      presetId: createCustomLabThemePresetId('00000000-0000-4000-8000-000000000099'),
    });
    expect(saved.success).toBe(false);
  });
});
