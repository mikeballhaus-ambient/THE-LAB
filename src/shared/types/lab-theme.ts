import { z } from 'zod';
import { isLabThemePresetId } from '@/shared/theme/lab-theme-preset-id';
import {
  LAB_THEME_MODES,
  type LabThemeMode,
  type LabThemeTokenKey,
  type LabThemeTokenMap,
} from '@/shared/theme/lab-theme-token-keys';
import type { LabThemePresetId } from '@/shared/theme/lab-theme-preset-id';

export type { LabThemeMode, LabThemePresetId, LabThemeTokenKey, LabThemeTokenMap };

export interface LabTheme {
  mode: LabThemeMode;
  presetId: LabThemePresetId;
  /** Fine-tune overrides merged over the repo preset at resolve time. */
  tokens?: Partial<LabThemeTokenMap>;
}

export interface ResolvedLabTheme {
  mode: LabThemeMode;
  presetId: LabThemePresetId;
  tokens: LabThemeTokenMap;
}

export interface LabThemeCustomPreset {
  id: string;
  presetId: LabThemePresetId;
  name: string;
  mode: LabThemeMode;
  tokens: LabThemeTokenMap;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number | null;
}

const labThemePresetIdSchema = z.string().refine(isLabThemePresetId, {
  message: 'Invalid presetId',
});

export const LabThemeSchema = z.object({
  mode: z.enum(LAB_THEME_MODES),
  presetId: labThemePresetIdSchema,
  tokens: z.record(z.string(), z.string().min(1)).optional(),
});

export function parseLabTheme(input: unknown): LabTheme {
  return LabThemeSchema.parse(input);
}
