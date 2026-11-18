import {
  isBuiltinLabThemePresetId,
  type LabThemePresetId,
} from '@/shared/theme/lab-theme-preset-id';
import {
  getBuiltinPresetDefinition,
  type LabThemePresetDefinition,
} from '@/shared/theme/presets';
import type { LabThemeMode, LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

export interface LabThemeCustomPresetDefinition {
  id: LabThemePresetId;
  mode: LabThemeMode;
  displayName: string;
  tokens: LabThemeTokenMap;
  builtin: false;
}

export type AnyLabThemePresetDefinition = LabThemePresetDefinition | LabThemeCustomPresetDefinition;

export type LabThemePresetLookup = {
  customPresets?: Map<LabThemePresetId, LabThemeCustomPresetDefinition>;
};

export function resolvePresetDefinition(
  presetId: LabThemePresetId,
  lookup?: LabThemePresetLookup,
): AnyLabThemePresetDefinition {
  if (isBuiltinLabThemePresetId(presetId)) {
    return getBuiltinPresetDefinition(presetId);
  }
  const custom = lookup?.customPresets?.get(presetId);
  if (!custom) {
    throw new Error(`Unknown custom theme preset: ${presetId}`);
  }
  return custom;
}
