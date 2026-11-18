import type { LabThemeMode, LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

export const PERSONA_BADGE_SLUGS = [
  'chat',
  'orchestrator',
  'architect',
  'code',
  'debug',
  'qa',
] as const;

export type PersonaBadgeTintSlug = (typeof PERSONA_BADGE_SLUGS)[number];

/** Distinct hues for builtin personas — independent of grey-primary presets (Cloud Grey, etc.). */
export function resolvePersonaBadgeTints(
  tokens: LabThemeTokenMap,
  mode: LabThemeMode,
): Record<PersonaBadgeTintSlug, string> {
  const isLight = mode === 'light';
  return {
    chat: isLight ? '#2563eb' : '#60a5fa',
    orchestrator: isLight ? '#4f46e5' : '#818cf8',
    architect: isLight ? '#9333ea' : '#c084fc',
    code: tokens['chat-log-success'],
    debug: isLight ? '#ca8a04' : '#eab308',
    qa: tokens['chat-log-error'],
  };
}

export function applyPersonaBadgeTintVariables(
  root: HTMLElement,
  tokens: LabThemeTokenMap,
  mode: LabThemeMode,
): void {
  const tints = resolvePersonaBadgeTints(tokens, mode);
  for (const slug of PERSONA_BADGE_SLUGS) {
    root.style.setProperty(`--lab-persona-tint-${slug}`, tints[slug]);
  }
}
