import type { LabThemeMode } from '@/shared/theme/lab-theme-token-keys';
import type { LabTheme, ResolvedLabTheme } from '@/shared/types/lab-theme';
import { LAB_THEME_TOKEN_KEYS } from '@/shared/theme/lab-theme-token-keys';
import { getLabThemePresetLookup } from '@/shared/theme/lab-custom-presets-cache';
import { resolveLabTheme } from '@/shared/theme/resolve-lab-theme';
import { applyPersonaBadgeTintVariables } from '@/shared/theme/lab-persona-badge-tints';

function toCssVarName(key: string): string {
  return `--lab-${key}`;
}

export function applyLabThemeModeClass(mode: LabThemeMode, root: HTMLElement = document.documentElement): void {
  const next = mode === 'light' ? 'app-light' : 'app-dark';
  const prev = mode === 'light' ? 'app-dark' : 'app-light';
  root.classList.remove(prev);
  root.classList.add(next);
  if (typeof document !== 'undefined' && document.body && document.body !== root) {
    document.body.classList.remove(prev);
    document.body.classList.add(next);
  }
}

export function buildCardGradientValue(tokens: ResolvedLabTheme['tokens']): string {
  const angle = tokens['card-gradient-angle'];
  const s1 = tokens['card-gradient-stop-1'];
  const p1 = tokens['card-gradient-stop-1-pos'];
  const s2 = tokens['card-gradient-stop-2'];
  const p2 = tokens['card-gradient-stop-2-pos'];
  const s3 = tokens['card-gradient-stop-3'];
  const p3 = tokens['card-gradient-stop-3-pos'];
  return `linear-gradient(${angle}, ${s1} ${p1}, ${s2} ${p2}, ${s3} ${p3})`;
}

function hasFullTokenMap(theme: LabTheme | ResolvedLabTheme): theme is ResolvedLabTheme {
  const tokens = (theme as ResolvedLabTheme).tokens;
  if (!tokens) return false;
  return LAB_THEME_TOKEN_KEYS.every((k) => typeof tokens[k] === 'string');
}

export function applyLabTheme(
  theme: LabTheme | ResolvedLabTheme,
  root: HTMLElement = document.documentElement,
): ResolvedLabTheme {
  const resolved = hasFullTokenMap(theme)
    ? theme
    : resolveLabTheme(theme as LabTheme, getLabThemePresetLookup());

  applyLabThemeModeClass(resolved.mode, root);

  for (const key of LAB_THEME_TOKEN_KEYS) {
    root.style.setProperty(toCssVarName(key), resolved.tokens[key]);
  }

  root.style.setProperty('--lab-card-gradient', buildCardGradientValue(resolved.tokens));

  // Derived aliases (not in LAB_THEME_TOKEN_KEYS) used by shell/catalog CSS.
  root.style.setProperty(
    '--lab-general-bg-muted',
    'color-mix(in srgb, var(--lab-general-text-muted) 10%, var(--lab-general-bg))',
  );
  root.style.setProperty('--lab-accent-primary', resolved.tokens['button-border-hover']);

  const t = resolved.tokens;
  const isLight = resolved.mode === 'light';
  root.style.setProperty(
    '--lab-workspace-tab-active-bg',
    isLight
      ? `color-mix(in srgb, ${t['button-border-hover']} 14%, ${t['general-bg']})`
      : t['prime-surface-600'],
  );
  root.style.setProperty(
    '--lab-workspace-tab-inactive-bg',
    isLight
      ? `color-mix(in srgb, ${t['general-border']} 38%, ${t['general-bg']})`
      : t['prime-surface-900'],
  );
  root.style.setProperty(
    '--lab-workspace-tab-inactive-hover-bg',
    isLight
      ? `color-mix(in srgb, ${t['general-border']} 52%, ${t['general-bg']})`
      : t['prime-surface-800'],
  );
  root.style.setProperty(
    '--lab-workspace-tab-active-text',
    isLight ? t['general-text'] : t['button-outlined-text-hover'],
  );

  // Structural aliases (Tailwind `text-lab-text`, `bg-lab-surface-*`, shell CSS) — not preset keys.
  root.style.setProperty('--lab-text', t['general-text']);
  root.style.setProperty('--lab-text-primary', t['general-text']);
  root.style.setProperty('--lab-text-muted', t['general-text-muted']);
  root.style.setProperty('--lab-muted', t['general-text-muted']);
  root.style.setProperty('--lab-border', t['general-border']);
  root.style.setProperty(
    '--lab-border-subtle',
    `color-mix(in srgb, ${t['general-border']} 55%, transparent)`,
  );
  root.style.setProperty('--lab-surface-base', t['general-bg']);
  root.style.setProperty('--lab-surface', t['general-bg']);
  root.style.setProperty(
    '--lab-surface-card',
    isLight
      ? `color-mix(in srgb, ${t['prime-surface-0']} 88%, ${t['general-bg']})`
      : `color-mix(in srgb, ${t['prime-surface-900']} 72%, ${t['general-bg']})`,
  );
  root.style.setProperty(
    '--lab-surface-hover',
    `color-mix(in srgb, ${t['general-border']} 28%, ${t['general-bg']})`,
  );
  root.style.setProperty('--lab-general-shadow', isLight ? t['general-text'] : '#000000');
  root.style.setProperty('--lab-warning-text', t['chat-log-error']);
  root.style.setProperty(
    '--lab-form-control-bg',
    `color-mix(in srgb, ${t['general-border']} 22%, ${t['general-bg']})`,
  );
  root.style.setProperty(
    '--lab-form-control-border',
    `color-mix(in srgb, ${t['general-border']} 90%, transparent)`,
  );
  root.style.setProperty(
    '--lab-select-overlay-bg',
    isLight
      ? t['general-bg']
      : `color-mix(in srgb, ${t['prime-surface-900']} 88%, ${t['general-bg']})`,
  );
  root.style.setProperty(
    '--lab-select-option-hover-bg',
    isLight
      ? `color-mix(in srgb, ${t['button-border-hover']} 12%, ${t['general-bg']})`
      : `color-mix(in srgb, ${t['button-bg']} 28%, ${t['prime-surface-900']})`,
  );
  root.style.setProperty(
    '--lab-select-option-selected-bg',
    isLight
      ? `color-mix(in srgb, ${t['button-border-hover']} 18%, ${t['general-bg']})`
      : `color-mix(in srgb, ${t['button-border-hover']} 22%, ${t['prime-surface-900']})`,
  );
  root.style.setProperty('--lab-surface-ground', t['general-bg']);
  root.style.setProperty('--lab-text-accent', t['button-border-hover']);
  root.style.setProperty('--lab-text-secondary', t['general-text-muted']);

  root.style.setProperty(
    '--lab-chat-tab-active-bg',
    isLight
      ? `color-mix(in srgb, ${t['button-border-hover']} 14%, ${t['general-bg']})`
      : t['chat-tab-active-bg'],
  );
  root.style.setProperty(
    '--lab-chat-tab-active-text',
    isLight ? t['general-text'] : t['chat-tab-text'],
  );
  root.style.setProperty(
    '--lab-chat-tab-inactive-hover-bg',
    isLight
      ? `color-mix(in srgb, ${t['general-border']} 42%, ${t['general-bg']})`
      : `color-mix(in srgb, ${t['chat-tab-active-bg']} 75%, transparent)`,
  );

  applyPersonaBadgeTintVariables(root, t, resolved.mode);

  return resolved;
}
