import { getLabThemePresetLookup } from '@/shared/theme/lab-custom-presets-cache';
import { ensureResolvedLabTheme } from '@/shared/theme/resolve-lab-theme';
import { getAuthUser } from '@/shared/types';
import type { LabTheme, ResolvedLabTheme } from '@/shared/types/lab-theme';
import { parseLabTheme } from '@/shared/types/lab-theme';

const CACHE_VERSION = 1;

type CachedPlatformLabThemePayload = {
  version: number;
  userId: number;
  theme: LabTheme;
};

function storageKey(userId: number): string {
  return `lab_platform_theme_v${CACHE_VERSION}_${userId}`;
}

/** Full token map so bootstrap works before custom preset registry is loaded. */
export function themeSnapshotForClientCache(theme: LabTheme | ResolvedLabTheme): LabTheme {
  const resolved = ensureResolvedLabTheme(theme, getLabThemePresetLookup());
  return {
    mode: resolved.mode,
    presetId: resolved.presetId,
    tokens: { ...resolved.tokens },
  };
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function readCachedPlatformLabTheme(userId: number): LabTheme | null {
  if (!hasLocalStorage()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedPlatformLabThemePayload;
    if (parsed.version !== CACHE_VERSION || parsed.userId !== userId || !parsed.theme) {
      return null;
    }
    return parseLabTheme(parsed.theme);
  } catch {
    return null;
  }
}

export function readCachedPlatformLabThemeForCurrentUser(): LabTheme | null {
  const user = getAuthUser();
  if (!user?.userId) {
    return null;
  }
  return readCachedPlatformLabTheme(user.userId);
}

export function writeCachedPlatformLabTheme(
  theme: LabTheme | ResolvedLabTheme,
  userId: number,
): void {
  if (!hasLocalStorage()) {
    return;
  }
  try {
    const payload: CachedPlatformLabThemePayload = {
      version: CACHE_VERSION,
      userId,
      theme: themeSnapshotForClientCache(theme),
    };
    localStorage.setItem(storageKey(userId), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearCachedPlatformLabTheme(userId: number): void {
  if (!hasLocalStorage()) {
    return;
  }
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export function persistPlatformLabThemeToClientCache(theme: LabTheme | ResolvedLabTheme): void {
  const user = getAuthUser();
  if (!user?.userId) {
    return;
  }
  writeCachedPlatformLabTheme(theme, user.userId);
}
