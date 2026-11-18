import {
  isCustomLabThemePresetId,
  type LabThemeCustomPresetId,
} from '@/shared/theme/lab-theme-preset-id';
import type { LabThemeCustomPresetDefinition } from '@/shared/theme/resolve-preset-definition';
import type { LabThemePresetLookup } from '@/shared/theme/resolve-preset-definition';
import type { LabThemeCustomPreset } from '@/shared/types/lab-theme';

const customPresets = new Map<LabThemeCustomPresetId, LabThemeCustomPresetDefinition>();

export function syncCustomLabPresetsFromServer(presets: LabThemeCustomPreset[]): void {
  customPresets.clear();
  for (const preset of presets) {
    if (!isCustomLabThemePresetId(preset.presetId)) {
      continue;
    }
    customPresets.set(preset.presetId, {
      id: preset.presetId,
      mode: preset.mode,
      displayName: preset.name,
      tokens: preset.tokens,
      builtin: false,
    });
  }
}

export function getLabThemePresetLookup(): LabThemePresetLookup {
  return { customPresets };
}

export function listCustomPresetDefinitions(): LabThemeCustomPresetDefinition[] {
  return [...customPresets.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }),
  );
}
