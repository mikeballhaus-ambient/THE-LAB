import { LAB_THEME_PRESET_IDS } from '@/shared/theme/lab-theme-token-keys';

export const LAB_THEME_BUILTIN_PRESET_IDS = LAB_THEME_PRESET_IDS;

export type LabThemeBuiltinPresetId = (typeof LAB_THEME_PRESET_IDS)[number];

export type LabThemeCustomPresetId = `custom:${string}`;

export type LabThemePresetId = LabThemeBuiltinPresetId | LabThemeCustomPresetId;

const CUSTOM_PRESET_PATTERN = /^custom:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBuiltinLabThemePresetId(id: string): id is LabThemeBuiltinPresetId {
  return (LAB_THEME_PRESET_IDS as readonly string[]).includes(id);
}

export function isCustomLabThemePresetId(id: string): id is LabThemeCustomPresetId {
  return CUSTOM_PRESET_PATTERN.test(id);
}

export function isLabThemePresetId(id: string): id is LabThemePresetId {
  return isBuiltinLabThemePresetId(id) || isCustomLabThemePresetId(id);
}

export function createCustomLabThemePresetId(uuid: string): LabThemeCustomPresetId {
  return `custom:${uuid}` as LabThemeCustomPresetId;
}

export function customPresetUuidFromId(id: LabThemeCustomPresetId): string {
  return id.slice('custom:'.length);
}
