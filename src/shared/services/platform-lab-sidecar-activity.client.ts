import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import {
  parseLabSidecarActivitySettings,
  type LabSidecarActivitySettings,
} from '@/shared/types/lab-sidecar-activity-settings';
import type { LabSidecarActivityUpdatedEventData } from '@/shared/types/socket-events';

export async function fetchPlatformLabSidecarActivitySettings(): Promise<LabSidecarActivitySettings | null> {
  try {
    const res = await fetch(
      `${resolvePlatformBackendUrlForClient()}/api/platform/lab-sidecar-activity`,
      labPlatformFetchInit(),
    );
    if (res.status === 401) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as {
      success?: boolean;
      data?: { settings?: LabSidecarActivitySettings };
    };
    if (!json.data?.settings) {
      return null;
    }
    return parseLabSidecarActivitySettings(json.data.settings);
  } catch {
    return null;
  }
}

export async function savePlatformLabSidecarActivitySettings(
  settings: LabSidecarActivitySettings,
): Promise<
  { success: true; settings: LabSidecarActivitySettings } | { success: false; error: string }
> {
  try {
    const res = await fetch(
      `${resolvePlatformBackendUrlForClient()}/api/platform/lab-sidecar-activity`,
      labPlatformFetchInit({
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    );
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      data?: LabSidecarActivityUpdatedEventData;
    };
    if (!res.ok || !json.success) {
      return { success: false, error: json.error ?? `Save failed (${res.status})` };
    }
    const saved = json.data?.settings;
    if (!saved) {
      return { success: false, error: 'Invalid save response' };
    }
    return { success: true, settings: parseLabSidecarActivitySettings(saved) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Save failed',
    };
  }
}

export async function resetPlatformLabSidecarActivitySettings(): Promise<
  { success: true; settings: LabSidecarActivitySettings } | { success: false; error: string }
> {
  try {
    const res = await fetch(
      `${resolvePlatformBackendUrlForClient()}/api/platform/lab-sidecar-activity/reset`,
      labPlatformFetchInit({ method: 'POST' }),
    );
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      data?: LabSidecarActivityUpdatedEventData;
    };
    if (!res.ok || !json.success) {
      return { success: false, error: json.error ?? `Reset failed (${res.status})` };
    }
    const saved = json.data?.settings;
    if (!saved) {
      return { success: false, error: 'Invalid reset response' };
    }
    return { success: true, settings: parseLabSidecarActivitySettings(saved) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Reset failed',
    };
  }
}

export function handleLabSidecarActivityUpdatedSocketEvent(
  data: LabSidecarActivityUpdatedEventData,
): LabSidecarActivitySettings | null {
  if (!data?.settings) {
    return null;
  }
  try {
    return parseLabSidecarActivitySettings(data.settings);
  } catch {
    return null;
  }
}
