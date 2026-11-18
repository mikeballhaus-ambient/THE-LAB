import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';
import type { IApp } from '@/shared/types/app/app.d';

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.error ?? body.message ?? `HTTP ${response.status}`);
  }
  return body as T;
}

export interface PlatformAppTagsPayload {
  tags: PlatformAppTag[];
  catalogTagAssignments: Record<string, string[]>;
}

export async function fetchPlatformAppTags(): Promise<PlatformAppTagsPayload> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(`${base}/api/platform/app-tags`, labPlatformFetchInit());
  const body = await parseJson<{
    success: true;
    data: { tags: PlatformAppTag[]; catalogTagAssignments?: Record<string, string[]> };
  }>(response);
  return {
    tags: body.data.tags,
    catalogTagAssignments: body.data.catalogTagAssignments ?? {},
  };
}

export async function createPlatformAppTag(input: {
  id: string;
  label: string;
  description?: string;
  sortOrder?: number;
}): Promise<PlatformAppTag[]> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/app-tags`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { tags: PlatformAppTag[] } }>(response);
  return body.data.tags;
}

export async function updatePlatformAppTag(
  tagId: string,
  patch: { label?: string; description?: string; sortOrder?: number },
): Promise<PlatformAppTag[]> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/app-tags/${encodeURIComponent(tagId)}`,
    labPlatformFetchInit({ method: 'PUT', body: JSON.stringify(patch) }),
  );
  const body = await parseJson<{ success: true; data: { tags: PlatformAppTag[] } }>(response);
  return body.data.tags;
}

export interface DeleteTagBlockedError extends Error {
  code: 'TAG_IN_USE';
  apps: Array<{ appId: string; appName: string }>;
}

export async function deletePlatformAppTag(tagId: string): Promise<void> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/app-tags/${encodeURIComponent(tagId)}`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  const body = await response.json();
  if (response.status === 409 && body.error === 'TAG_IN_USE') {
    const err = new Error(body.message ?? 'Tag in use') as DeleteTagBlockedError;
    err.code = 'TAG_IN_USE';
    err.apps = body.apps ?? [];
    throw err;
  }
  if (!response.ok || !body.success) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
}

export async function setAppCatalogTags(appId: string, tagIds: string[]): Promise<IApp[]> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/apps/catalog-tags`,
    labPlatformFetchInit({
      method: 'PUT',
      body: JSON.stringify({ appId, tagIds }),
    }),
  );
  const body = await parseJson<{ success: true; data: { apps: IApp[] } }>(response);
  return body.data.apps;
}
