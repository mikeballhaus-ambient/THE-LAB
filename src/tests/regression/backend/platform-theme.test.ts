import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { labThemeRepository } from '@/backend/db/Theme/lab-theme-repository';
import { labThemeService } from '@/backend/db/Theme/lab-theme-service';
import { getDefaultLabTheme } from '@/shared/theme/resolve-lab-theme';

describe('platform theme persistence (rm-49 phase 2)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    await labThemeRepository.bootstrap(db);
  });

  afterAll(() => {
    labThemeRepository.close();
    db.close();
  });

  test('seeds cloud-grey-dark singleton row', () => {
    const theme = labThemeService.getPlatformTheme();
    expect(theme.presetId).toBe('cloud-grey-dark');
    expect(theme.mode).toBe('dark');
  });

  test('savePlatformTheme persists overrides and rejects invalid preset', () => {
    const invalid = labThemeService.savePlatformTheme({
      mode: 'dark',
      presetId: 'not-real',
    });
    expect(invalid.success).toBe(false);

    const saved = labThemeService.savePlatformTheme({
      ...getDefaultLabTheme(),
      tokens: { 'general-bg': '#112233' },
    });
    expect(saved.success).toBe(true);
    if (saved.success) {
      expect(saved.theme.tokens?.['general-bg']).toBe('#112233');
    }

    const loaded = labThemeService.getPlatformTheme();
    expect(loaded.tokens?.['general-bg']).toBe('#112233');
  });
});
