import { applyLabTheme } from '@/shared/theme/apply-lab-theme';
import { readCachedPlatformLabThemeForCurrentUser } from '@/shared/theme/lab-theme-client-cache';
import { getDefaultLabTheme, resolveLabTheme } from '@/shared/theme/resolve-lab-theme';
import type { LabTheme, ResolvedLabTheme } from '@/shared/types/lab-theme';

let activeTheme: ResolvedLabTheme = resolveLabTheme(getDefaultLabTheme());

export function getActiveLabTheme(): ResolvedLabTheme {
  return activeTheme;
}

/** Phase 3 draft session will call this; Phase 1 bootstraps default once. */
export function setActiveLabTheme(theme: LabTheme | ResolvedLabTheme, root?: HTMLElement): ResolvedLabTheme {
  activeTheme = applyLabTheme(theme, root ?? document.documentElement);
  return activeTheme;
}

export function bootstrapLabTheme(root?: HTMLElement): ResolvedLabTheme {
  const cached = readCachedPlatformLabThemeForCurrentUser();
  if (cached) {
    return setActiveLabTheme(resolveLabTheme(cached), root);
  }
  return setActiveLabTheme(getDefaultLabTheme(), root);
}
