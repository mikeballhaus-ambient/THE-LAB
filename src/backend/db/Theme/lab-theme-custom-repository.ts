import { Repository } from '../Repository';
import { LAB_THEME_CUSTOM_PRESETS_TABLE } from './lab-theme-custom-schema';

export interface LabThemeCustomPresetRow {
  id: string;
  name: string;
  mode: string;
  tokensJson: string;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

type DbRow = {
  id: string;
  name: string;
  mode: string;
  tokens_json: string;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRow): LabThemeCustomPresetRow {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    tokensJson: row.tokens_json,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LabThemeCustomPresetRepository extends Repository {
  close(): void {
    /* prepared per call */
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    this.db.exec(LAB_THEME_CUSTOM_PRESETS_TABLE);
  }

  listAll(): LabThemeCustomPresetRow[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, mode, tokens_json, created_by_user_id, created_at, updated_at
         FROM lab_theme_custom_presets
         ORDER BY name COLLATE NOCASE`,
      )
      .all() as DbRow[];
    return rows.map(mapRow);
  }

  getById(id: string): LabThemeCustomPresetRow | null {
    const row = this.db
      .prepare(
        `SELECT id, name, mode, tokens_json, created_by_user_id, created_at, updated_at
         FROM lab_theme_custom_presets WHERE id = ?`,
      )
      .get(id) as DbRow | undefined;
    return row ? mapRow(row) : null;
  }

  insert(row: {
    id: string;
    name: string;
    mode: string;
    tokensJson: string;
    createdByUserId: number | null;
  }): LabThemeCustomPresetRow {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO lab_theme_custom_presets
         (id, name, mode, tokens_json, created_by_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(row.id, row.name, row.mode, row.tokensJson, row.createdByUserId, now, now);
    const created = this.getById(row.id);
    if (!created) {
      throw new Error('Failed to create custom theme preset');
    }
    return created;
  }

  update(row: {
    id: string;
    name: string;
    mode: string;
    tokensJson: string;
  }): LabThemeCustomPresetRow {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE lab_theme_custom_presets
         SET name = ?, mode = ?, tokens_json = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(row.name, row.mode, row.tokensJson, now, row.id);
    const updated = this.getById(row.id);
    if (!updated) {
      throw new Error('Custom theme preset not found');
    }
    return updated;
  }

  deleteById(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM lab_theme_custom_presets WHERE id = ?`).run(id);
    return result.changes > 0;
  }
}

export const labThemeCustomPresetRepository = new LabThemeCustomPresetRepository();
