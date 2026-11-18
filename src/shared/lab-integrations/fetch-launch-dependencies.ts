import { getLabPlatformAuthHeaders } from '@/shared/composables/useLabPlatformAuth';
import { resolveLaunchDependencyIds } from './resolve-launch-dependencies';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`;

/** Avoid an empty workspace tab while launch-deps HTTP stalls (CI agents, slow backend). */
export const LAUNCH_DEPS_FETCH_TIMEOUT_MS = 8_000;

export async function fetchLaunchDependencyIds(hostAppId: string): Promise<string[] | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/platform/lab-integrations/launch-deps/${encodeURIComponent(hostAppId)}`,
      {
        credentials: 'include',
        headers: getLabPlatformAuthHeaders(),
        signal: AbortSignal.timeout(LAUNCH_DEPS_FETCH_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {
      success?: boolean;
      data?: { dependencyAppIds?: string[] };
    };
    return payload.data?.dependencyAppIds ?? null;
  } catch {
    return null;
  }
}

/** Client fallback when platform API is unavailable (uses registry deps + optional bindings). */
export function resolveLaunchDependencyIdsLocal(
  registryDependencyIds: readonly string[],
  bindings: readonly LabIntegrationBindingRecord[],
  hostAppId: string,
): string[] {
  return resolveLaunchDependencyIds(registryDependencyIds, bindings, hostAppId);
}
