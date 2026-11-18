import { getLabPlatformAuthHeaders } from '@/shared/composables/useLabPlatformAuth';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`;

export async function fetchLabIntegrationBindings(
  hostAppId: string,
): Promise<LabIntegrationBindingRecord[] | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/platform/lab-integrations/bindings?hostAppId=${encodeURIComponent(hostAppId)}`,
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
      data?: { bindings?: LabIntegrationBindingRecord[] };
    };
    return payload.data?.bindings ?? [];
  } catch {
    return null;
  }
}
