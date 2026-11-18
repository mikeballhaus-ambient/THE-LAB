import { isBuiltinLabThemePresetId, isCustomLabThemePresetId } from '@/shared/theme/lab-theme-preset-id';
import { getDefaultLabTheme } from '@/shared/theme/resolve-lab-theme';
import { labThemeCustomPresetService } from './lab-theme-custom-service';
import { labThemeRepository } from './lab-theme-repository';
import type { LabTheme } from '@/shared/types/lab-theme';
import { LabThemeSchema, parseLabTheme } from '@/shared/types/lab-theme';

function rowToTheme(row: { mode: string; presetId: string; tokensJson: string | null }): LabTheme {
  let tokens: LabTheme['tokens'];
  if (row.tokensJson) {
    try {
      const parsed = JSON.parse(row.tokensJson) as Record<string, string>;
      tokens = Object.keys(parsed).length > 0 ? parsed : undefined;
    } catch {
      tokens = undefined;
    }
  }
  return parseLabTheme({
    mode: row.mode,
    presetId: row.presetId,
    tokens,
  });
}

function themeToStorage(theme: LabTheme): {
  mode: string;
  presetId: string;
  tokensJson: string | null;
} {
  const tokens = theme.tokens;
  const hasOverrides = tokens && Object.keys(tokens).length > 0;
  return {
    mode: theme.mode,
    presetId: theme.presetId,
    tokensJson: hasOverrides ? JSON.stringify(tokens) : null,
  };
}

export class LabThemeService {
  ensureSeedRow(): void {
    const existing = labThemeRepository.getSingleton();
    if (existing) {
      return;
    }
    const defaults = getDefaultLabTheme();
    const storage = themeToStorage(defaults);
    labThemeRepository.upsertSingleton(storage);
  }

  getPlatformTheme(): LabTheme {
    this.ensureSeedRow();
    const row = labThemeRepository.getSingleton();
    if (!row) {
      return getDefaultLabTheme();
    }
    return rowToTheme(row);
  }

  savePlatformTheme(theme: unknown): { success: true; theme: LabTheme } | { success: false; error: string } {
    const parsed = LabThemeSchema.safeParse(theme);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }
    const presetId = parsed.data.presetId;
    if (!isBuiltinLabThemePresetId(presetId) && !isCustomLabThemePresetId(presetId)) {
      return { success: false, error: 'Invalid presetId' };
    }
    if (isCustomLabThemePresetId(presetId) && !labThemeCustomPresetService.assertCustomPresetExists(presetId)) {
      return { success: false, error: 'Custom theme preset not found' };
    }
    const storage = themeToStorage(parsed.data);
    const row = labThemeRepository.upsertSingleton(storage);
    return { success: true, theme: rowToTheme(row) };
  }
}

export const labThemeService = new LabThemeService();
