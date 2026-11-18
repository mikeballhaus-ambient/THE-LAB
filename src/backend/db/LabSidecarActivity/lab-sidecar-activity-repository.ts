import { Repository } from '../Repository';
import { LAB_SIDECAR_ACTIVITY_SETTINGS_TABLE } from './lab-sidecar-activity-schema';
import {
  DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS,
  type LabSidecarActivitySettings,
} from '@/shared/types/lab-sidecar-activity-settings';

export interface LabSidecarActivitySettingsRow {
  id: number;
  thinkingLabel: string;
  workingLabelsJson: string;
  rotateIntervalMs: number;
  updatedAt: string;
}

type DbRow = {
  id: number;
  thinking_label: string;
  working_labels_json: string;
  rotate_interval_ms: number;
  updated_at: string;
};

function mapRow(row: DbRow): LabSidecarActivitySettingsRow {
  return {
    id: row.id,
    thinkingLabel: row.thinking_label,
    workingLabelsJson: row.working_labels_json,
    rotateIntervalMs: row.rotate_interval_ms,
    updatedAt: row.updated_at,
  };
}

function settingsToStorage(settings: LabSidecarActivitySettings): {
  thinkingLabel: string;
  workingLabelsJson: string;
  rotateIntervalMs: number;
} {
  return {
    thinkingLabel: settings.thinkingLabel,
    workingLabelsJson: JSON.stringify(settings.workingLabels),
    rotateIntervalMs: settings.rotateIntervalMs,
  };
}

export class LabSidecarActivityRepository extends Repository {
  close(): void {
    /* prepared per call */
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    this.db.exec(LAB_SIDECAR_ACTIVITY_SETTINGS_TABLE);
    if (!this.getSingleton()) {
      this.upsertSingleton(DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS);
    }
  }

  getSingleton(): LabSidecarActivitySettingsRow | null {
    const row = this.db
      .prepare(
        `SELECT id, thinking_label, working_labels_json, rotate_interval_ms, updated_at
         FROM lab_sidecar_activity_settings WHERE id = 1`,
      )
      .get() as DbRow | undefined;
    return row ? mapRow(row) : null;
  }

  upsertSingleton(settings: LabSidecarActivitySettings): LabSidecarActivitySettingsRow {
    const storage = settingsToStorage(settings);
    const updatedAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO lab_sidecar_activity_settings
           (id, thinking_label, working_labels_json, rotate_interval_ms, updated_at)
         VALUES (1, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           thinking_label = excluded.thinking_label,
           working_labels_json = excluded.working_labels_json,
           rotate_interval_ms = excluded.rotate_interval_ms,
           updated_at = excluded.updated_at`,
      )
      .run(
        storage.thinkingLabel,
        storage.workingLabelsJson,
        storage.rotateIntervalMs,
        updatedAt,
      );
    const row = this.getSingleton();
    if (!row) {
      throw new Error('Failed to persist lab sidecar activity settings');
    }
    return row;
  }
}

export const labSidecarActivityRepository = new LabSidecarActivityRepository();
