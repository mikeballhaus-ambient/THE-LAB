import { LAB_THEME_TOKEN_KEYS } from '@/shared/theme/lab-theme-token-keys';
import type { LabThemePresetLookup } from '@/shared/theme/resolve-preset-definition';
import { resolvePresetDefinition } from '@/shared/theme/resolve-preset-definition';
import type { LabTheme, ResolvedLabTheme } from '@/shared/types/lab-theme';

export function getDefaultLabTheme(): LabTheme {
  return {
    mode: 'dark',
    presetId: 'cloud-grey-dark',
  };
}

export function resolveLabTheme(theme: LabTheme, lookup?: LabThemePresetLookup): ResolvedLabTheme {
  const preset = resolvePresetDefinition(theme.presetId, lookup);
  const mode = theme.mode ?? preset.mode;
  const tokens = { ...preset.tokens, ...theme.tokens };
  return {
    mode,
    presetId: theme.presetId,
    tokens,
  };
}

export function ensureResolvedLabTheme(
  theme: LabTheme | ResolvedLabTheme,
  lookup?: LabThemePresetLookup,
): ResolvedLabTheme {
  const tokens = theme.tokens;
  if (tokens && LAB_THEME_TOKEN_KEYS.every((k) => typeof tokens[k] === 'string')) {
    return theme as ResolvedLabTheme;
  }
  return resolveLabTheme(theme as LabTheme, lookup);
}
