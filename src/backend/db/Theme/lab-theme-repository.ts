import { getDefaultLabTheme } from '@/shared/theme/resolve-lab-theme';
import { Repository } from '../Repository';
import { labThemeCustomPresetRepository } from './lab-theme-custom-repository';
import { LAB_THEME_SETTINGS_TABLE } from './lab-theme-schema';

export interface LabThemeSettingsRow {
  id: number;
  mode: string;
  presetId: string;
  tokensJson: string | null;
  updatedAt: string;
}

type DbRow = {
  id: number;
  mode: string;
  preset_id: string;
  tokens_json: string | null;
  updated_at: string;
};

function mapRow(row: DbRow): LabThemeSettingsRow {
  return {
    id: row.id,
    mode: row.mode,
    presetId: row.preset_id,
    tokensJson: row.tokens_json,
    updatedAt: row.updated_at,
  };
}

export class LabThemeRepository extends Repository {
  close(): void {
    /* prepared per call */
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    this.db.exec(LAB_THEME_SETTINGS_TABLE);
    await labThemeCustomPresetRepository.bootstrap(this.db);
    await labThemeCustomPresetRepository.initialize();
    if (!this.getSingleton()) {
      const defaults = getDefaultLabTheme();
      this.upsertSingleton({
        mode: defaults.mode,
        presetId: defaults.presetId,
        tokensJson: null,
      });
    }
  }

  getSingleton(): LabThemeSettingsRow | null {
    const row = this.db
      .prepare(
        `SELECT id, mode, preset_id, tokens_json, updated_at FROM lab_theme_settings WHERE id = 1`,
      )
      .get() as DbRow | undefined;
    return row ? mapRow(row) : null;
  }

  upsertSingleton(input: {
    mode: string;
    presetId: string;
    tokensJson: string | null;
  }): LabThemeSettingsRow {
    const updatedAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO lab_theme_settings (id, mode, preset_id, tokens_json, updated_at)
         VALUES (1, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           mode = excluded.mode,
           preset_id = excluded.preset_id,
           tokens_json = excluded.tokens_json,
           updated_at = excluded.updated_at`,
      )
      .run(input.mode, input.presetId, input.tokensJson, updatedAt);
    const row = this.getSingleton();
    if (!row) {
      throw new Error('Failed to persist lab theme settings');
    }
    return row;
  }
}

export const labThemeRepository = new LabThemeRepository();
