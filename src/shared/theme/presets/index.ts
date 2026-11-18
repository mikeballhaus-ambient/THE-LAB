import type { LabThemeBuiltinPresetId } from '@/shared/theme/lab-theme-preset-id';
import type { LabThemeMode, LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';
import { AMBER_FORGE_DARK_TOKENS } from '@/shared/theme/presets/amber-forge-dark';
import { ARCTIC_ICE_LIGHT_TOKENS } from '@/shared/theme/presets/arctic-ice-light';
import { BLUSH_PETAL_LIGHT_TOKENS } from '@/shared/theme/presets/blush-petal-light';
import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import { CREAM_LINEN_LIGHT_TOKENS } from '@/shared/theme/presets/cream-linen-light';
import { FOREST_EMERALD_DARK_TOKENS } from '@/shared/theme/presets/forest-emerald-dark';
import { GRAPHITE_ZINC_DARK_TOKENS } from '@/shared/theme/presets/graphite-zinc-dark';
import { LAVENDER_MIST_LIGHT_TOKENS } from '@/shared/theme/presets/lavender-mist-light';
import { MIDNIGHT_VIOLET_DARK_TOKENS } from '@/shared/theme/presets/midnight-violet-dark';
import { MINT_SPRING_LIGHT_TOKENS } from '@/shared/theme/presets/mint-spring-light';
import { MOSS_OLIVE_DARK_TOKENS } from '@/shared/theme/presets/moss-olive-dark';
import { OCEAN_CYAN_DARK_TOKENS } from '@/shared/theme/presets/ocean-cyan-dark';
import { PAPER_WARM_LIGHT_TOKENS } from '@/shared/theme/presets/paper-warm-light';
import { PEACH_DAWN_LIGHT_TOKENS } from '@/shared/theme/presets/peach-dawn-light';
import { ROSE_NOIR_DARK_TOKENS } from '@/shared/theme/presets/rose-noir-dark';
import { SAGE_GARDEN_LIGHT_TOKENS } from '@/shared/theme/presets/sage-garden-light';
import { SKY_DAYLIGHT_LIGHT_TOKENS } from '@/shared/theme/presets/sky-daylight-light';
import { SLATE_INDIGO_DARK_TOKENS } from '@/shared/theme/presets/slate-indigo-dark';
import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import { STEEL_AZURE_DARK_TOKENS } from '@/shared/theme/presets/steel-azure-dark';

export interface LabThemePresetDefinition {
  id: LabThemeBuiltinPresetId;
  mode: LabThemeMode;
  displayName: string;
  tokens: LabThemeTokenMap;
  builtin: true;
}

const PRESET_MAP: Record<LabThemeBuiltinPresetId, LabThemePresetDefinition> = {
  'cloud-grey-dark': {
    id: 'cloud-grey-dark',
    mode: 'dark',
    displayName: 'Cloud Grey',
    tokens: CLOUD_GREY_DARK_TOKENS,
    builtin: true,
  },
  'slate-indigo-dark': {
    id: 'slate-indigo-dark',
    mode: 'dark',
    displayName: 'Slate Indigo',
    tokens: SLATE_INDIGO_DARK_TOKENS,
    builtin: true,
  },
  'forest-emerald-dark': {
    id: 'forest-emerald-dark',
    mode: 'dark',
    displayName: 'Forest Emerald',
    tokens: FOREST_EMERALD_DARK_TOKENS,
    builtin: true,
  },
  'ocean-cyan-dark': {
    id: 'ocean-cyan-dark',
    mode: 'dark',
    displayName: 'Ocean Cyan',
    tokens: OCEAN_CYAN_DARK_TOKENS,
    builtin: true,
  },
  'rose-noir-dark': {
    id: 'rose-noir-dark',
    mode: 'dark',
    displayName: 'Rose Noir',
    tokens: ROSE_NOIR_DARK_TOKENS,
    builtin: true,
  },
  'midnight-violet-dark': {
    id: 'midnight-violet-dark',
    mode: 'dark',
    displayName: 'Midnight Violet',
    tokens: MIDNIGHT_VIOLET_DARK_TOKENS,
    builtin: true,
  },
  'amber-forge-dark': {
    id: 'amber-forge-dark',
    mode: 'dark',
    displayName: 'Amber Forge',
    tokens: AMBER_FORGE_DARK_TOKENS,
    builtin: true,
  },
  'steel-azure-dark': {
    id: 'steel-azure-dark',
    mode: 'dark',
    displayName: 'Steel Azure',
    tokens: STEEL_AZURE_DARK_TOKENS,
    builtin: true,
  },
  'moss-olive-dark': {
    id: 'moss-olive-dark',
    mode: 'dark',
    displayName: 'Moss Olive',
    tokens: MOSS_OLIVE_DARK_TOKENS,
    builtin: true,
  },
  'graphite-zinc-dark': {
    id: 'graphite-zinc-dark',
    mode: 'dark',
    displayName: 'Graphite Zinc',
    tokens: GRAPHITE_ZINC_DARK_TOKENS,
    builtin: true,
  },
  'slate-lab-light': {
    id: 'slate-lab-light',
    mode: 'light',
    displayName: 'Slate Lab',
    tokens: SLATE_LAB_LIGHT_TOKENS,
    builtin: true,
  },
  'paper-warm-light': {
    id: 'paper-warm-light',
    mode: 'light',
    displayName: 'Paper Warm',
    tokens: PAPER_WARM_LIGHT_TOKENS,
    builtin: true,
  },
  'sky-daylight-light': {
    id: 'sky-daylight-light',
    mode: 'light',
    displayName: 'Sky Daylight',
    tokens: SKY_DAYLIGHT_LIGHT_TOKENS,
    builtin: true,
  },
  'mint-spring-light': {
    id: 'mint-spring-light',
    mode: 'light',
    displayName: 'Mint Spring',
    tokens: MINT_SPRING_LIGHT_TOKENS,
    builtin: true,
  },
  'lavender-mist-light': {
    id: 'lavender-mist-light',
    mode: 'light',
    displayName: 'Lavender Mist',
    tokens: LAVENDER_MIST_LIGHT_TOKENS,
    builtin: true,
  },
  'cream-linen-light': {
    id: 'cream-linen-light',
    mode: 'light',
    displayName: 'Cream Linen',
    tokens: CREAM_LINEN_LIGHT_TOKENS,
    builtin: true,
  },
  'peach-dawn-light': {
    id: 'peach-dawn-light',
    mode: 'light',
    displayName: 'Peach Dawn',
    tokens: PEACH_DAWN_LIGHT_TOKENS,
    builtin: true,
  },
  'arctic-ice-light': {
    id: 'arctic-ice-light',
    mode: 'light',
    displayName: 'Arctic Ice',
    tokens: ARCTIC_ICE_LIGHT_TOKENS,
    builtin: true,
  },
  'sage-garden-light': {
    id: 'sage-garden-light',
    mode: 'light',
    displayName: 'Sage Garden',
    tokens: SAGE_GARDEN_LIGHT_TOKENS,
    builtin: true,
  },
  'blush-petal-light': {
    id: 'blush-petal-light',
    mode: 'light',
    displayName: 'Blush Petal',
    tokens: BLUSH_PETAL_LIGHT_TOKENS,
    builtin: true,
  },
};

export function getBuiltinPresetDefinition(presetId: LabThemeBuiltinPresetId): LabThemePresetDefinition {
  return PRESET_MAP[presetId];
}

/** @deprecated Use getBuiltinPresetDefinition or resolvePresetDefinition */
export function getPresetDefinition(presetId: LabThemeBuiltinPresetId): LabThemePresetDefinition {
  return getBuiltinPresetDefinition(presetId);
}

export function listPresetDefinitions(): LabThemePresetDefinition[] {
  return Object.values(PRESET_MAP);
}

export function getDefaultPresetIdForMode(mode: LabThemeMode): LabThemeBuiltinPresetId {
  return mode === 'light' ? 'slate-lab-light' : 'cloud-grey-dark';
}

export function listPresetsForMode(mode: LabThemeMode): LabThemePresetDefinition[] {
  return listPresetDefinitions().filter((p) => p.mode === mode);
}
