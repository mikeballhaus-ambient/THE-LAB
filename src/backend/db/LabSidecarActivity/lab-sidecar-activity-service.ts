import { labSidecarActivityRepository } from './lab-sidecar-activity-repository';
import {
  DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS,
  LabSidecarActivitySettingsSchema,
  parseLabSidecarActivitySettings,
  type LabSidecarActivitySettings,
} from '@/shared/types/lab-sidecar-activity-settings';

function rowToSettings(row: {
  thinkingLabel: string;
  workingLabelsJson: string;
  rotateIntervalMs: number;
}): LabSidecarActivitySettings {
  let workingLabels: string[] = DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS.workingLabels;
  try {
    const parsed = JSON.parse(row.workingLabelsJson) as unknown;
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')) {
      workingLabels = parsed;
    }
  } catch {
    /* use defaults */
  }
  return parseLabSidecarActivitySettings({
    thinkingLabel: row.thinkingLabel,
    workingLabels,
    rotateIntervalMs: row.rotateIntervalMs,
  });
}

export class LabSidecarActivityService {
  ensureSeedRow(): void {
    const existing = labSidecarActivityRepository.getSingleton();
    if (existing) {
      return;
    }
    labSidecarActivityRepository.upsertSingleton(DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS);
  }

  getPlatformSettings(): LabSidecarActivitySettings {
    this.ensureSeedRow();
    const row = labSidecarActivityRepository.getSingleton();
    if (!row) {
      return DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS;
    }
    return rowToSettings(row);
  }

  savePlatformSettings(
    body: unknown,
  ): { success: true; settings: LabSidecarActivitySettings } | { success: false; error: string } {
    const parsed = LabSidecarActivitySettingsSchema.safeParse(body);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }
    const row = labSidecarActivityRepository.upsertSingleton(parsed.data);
    return { success: true, settings: rowToSettings(row) };
  }

  resetToDefaults(): LabSidecarActivitySettings {
    const row = labSidecarActivityRepository.upsertSingleton(DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS);
    return rowToSettings(row);
  }
}

export const labSidecarActivityService = new LabSidecarActivityService();
