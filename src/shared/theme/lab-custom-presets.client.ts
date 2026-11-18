import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabThemeCustomPreset } from '@/shared/types/lab-theme';

export async function fetchCustomLabPresets(): Promise<LabThemeCustomPreset[]> {
  try {
    const res = await fetch(
      `${resolvePlatformBackendUrlForClient()}/api/platform/theme/custom-presets`,
      labPlatformFetchInit(),
    );
    if (res.status === 401 || !res.ok) {
      return [];
    }
    const json = (await res.json()) as { data?: { presets?: LabThemeCustomPreset[] } };
    return json.data?.presets ?? [];
  } catch {
    return [];
  }
}

export async function createCustomLabPreset(input: {
  name: string;
  mode: 'light' | 'dark';
  duplicateFromPresetId?: string;
}): Promise<{ success: true; preset: LabThemeCustomPreset } | { success: false; error: string }> {
  const res = await fetch(
    `${resolvePlatformBackendUrlForClient()}/api/platform/theme/custom-presets`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    data?: { preset?: LabThemeCustomPreset };
  };
  if (!res.ok || !json.success || !json.data?.preset) {
    return { success: false, error: json.error ?? 'Create failed' };
  }
  return { success: true, preset: json.data.preset };
}

export async function updateCustomLabPreset(
  id: string,
  body: { name?: string; mode?: 'light' | 'dark'; tokens?: LabThemeCustomPreset['tokens'] },
): Promise<{ success: true; preset: LabThemeCustomPreset } | { success: false; error: string }> {
  const res = await fetch(
    `${resolvePlatformBackendUrlForClient()}/api/platform/theme/custom-presets/${id}`,
    labPlatformFetchInit({ method: 'PUT', body: JSON.stringify(body) }),
  );
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    data?: { preset?: LabThemeCustomPreset };
  };
  if (!res.ok || !json.success || !json.data?.preset) {
    return { success: false, error: json.error ?? 'Update failed' };
  }
  return { success: true, preset: json.data.preset };
}

export async function deleteCustomLabPreset(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const res = await fetch(
    `${resolvePlatformBackendUrlForClient()}/api/platform/theme/custom-presets/${id}`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !json.success) {
    return { success: false, error: json.error ?? 'Delete failed' };
  }
  return { success: true };
}
