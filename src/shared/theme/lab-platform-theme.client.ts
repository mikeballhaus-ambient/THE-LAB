import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import { setActiveLabTheme } from '@/shared/theme/lab-theme-state';
import {
  hydrateLabThemeFromPlatform,
  refreshCustomLabPresets,
  syncSavedThemeFromServer,
} from '@/shared/theme/lab-theme-draft-store';
import type { LabTheme } from '@/shared/types/lab-theme';
import { parseLabTheme } from '@/shared/types/lab-theme';
import type { ThemeUpdatedEventData } from '@/shared/types/socket-events';

export async function fetchPlatformLabTheme(): Promise<LabTheme | null> {
  try {
    const res = await fetch(
      `${resolvePlatformBackendUrlForClient()}/api/platform/theme`,
      labPlatformFetchInit(),
    );
    if (res.status === 401) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as { success?: boolean; data?: { theme?: LabTheme } };
    if (!json.data?.theme) {
      return null;
    }
    return parseLabTheme(json.data.theme);
  } catch {
    return null;
  }
}

export function applyFetchedPlatformLabTheme(theme: LabTheme): void {
  setActiveLabTheme(theme);
}

export async function loadAndApplyPlatformLabTheme(): Promise<LabTheme | null> {
  return hydrateLabThemeFromPlatform();
}

export function handleThemeUpdatedSocketEvent(data: ThemeUpdatedEventData): void {
  if (!data?.theme) {
    return;
  }
  try {
    const theme = parseLabTheme(data.theme);
    void refreshCustomLabPresets().then(() => {
      syncSavedThemeFromServer(theme, true);
    });
  } catch {
    /* ignore invalid broadcast */
  }
}

export async function savePlatformLabTheme(
  theme: LabTheme,
): Promise<{ success: true; theme: LabTheme } | { success: false; error: string }> {
  try {
    const res = await fetch(
      `${resolvePlatformBackendUrlForClient()}/api/platform/theme`,
      labPlatformFetchInit({
        method: 'PUT',
        body: JSON.stringify(theme),
      }),
    );
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      data?: { theme?: LabTheme };
    };
    if (!res.ok || !json.success) {
      return { success: false, error: json.error ?? `Save failed (${res.status})` };
    }
    const saved = json.data?.theme ?? (json.data as { theme?: LabTheme } | undefined)?.theme;
    if (!saved) {
      return { success: false, error: 'Invalid save response' };
    }
    return { success: true, theme: parseLabTheme(saved) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Save failed',
    };
  }
}
