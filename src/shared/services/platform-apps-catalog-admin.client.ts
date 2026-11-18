import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { IApp } from '@/shared/types/app/app.d';

export async function fetchPlatformAppsCatalogAdmin(): Promise<IApp[]> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/apps/catalog-admin`,
    labPlatformFetchInit({ method: 'GET' }),
  );
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
  return body.data.apps as IApp[];
}