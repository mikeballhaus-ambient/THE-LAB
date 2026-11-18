import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.error ?? body.message ?? `HTTP ${response.status}`);
  }
  return body as T;
}

/** All integration services across apps (for workflow/rules designers). Not the same as per-host bindings. */
export async function fetchLabIntegrationServiceCatalog(): Promise<LabIntegrationServiceCatalogResponse> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-integrations/service-catalog`,
    labPlatformFetchInit(),
  );
  const body = await parseJson<{ success: true; data: LabIntegrationServiceCatalogResponse }>(response);
  return body.data;
}

/** Live connector GET for workflow/rules designers (same path runtime uses). */
export async function fetchIntegrationConnectorRecord(
  providerAppId: string,
  serviceId: string,
  recordId: string | number,
): Promise<Record<string, unknown> | null> {
  const base = resolvePlatformBackendUrlForClient();
  const id = encodeURIComponent(String(recordId));
  const url = `${base}/api/platform/lab-integrations/hub/${encodeURIComponent(providerAppId)}/services/${encodeURIComponent(serviceId)}/records/${id}`;
  const response = await fetch(url, labPlatformFetchInit());
  if (response.status === 404) {
    return null;
  }
  const body = await parseJson<{ success: true; data: { record: Record<string, unknown> } }>(response);
  return body.data.record;
}
