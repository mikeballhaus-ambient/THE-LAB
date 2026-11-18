import { getLabPlatformAuthHeaders } from '@/shared/composables/useLabPlatformAuth';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import { parseAppLabIntegrationManifest } from '@/shared/types/schemas/lab-integration-manifest-schema';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`;

export async function fetchLabIntegrationManifest(
  hostAppId: string,
): Promise<AppLabIntegrationManifestV1 | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/platform/lab-integrations/manifest/${encodeURIComponent(hostAppId)}`,
      {
        credentials: 'include',
        headers: getLabPlatformAuthHeaders(),
      },
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {
      success?: boolean;
      data?: { manifest?: AppLabIntegrationManifestV1 };
    };
    const raw = payload.data?.manifest;
    if (!raw) {
      return null;
    }
    return parseAppLabIntegrationManifest(raw);
  } catch {
    return null;
  }
}
