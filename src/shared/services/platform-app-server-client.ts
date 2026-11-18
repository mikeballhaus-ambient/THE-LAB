import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { PlatformAppServerEntry, PlatformAppServersResponse } from '@/shared/types/platform-app-servers';
import { urlForAppId } from '@/shared/services/app-server-url-resolution';

export type FetchPlatformAppServersOptions = {
  platformBaseUrl?: string;
  ids?: string[];
  /** @deprecated Ignored for browser calls — identity comes from session cookie / Bearer JWT. */
  labUserId?: number | string;
};

export async function fetchPlatformAppServerUrls(
  options: FetchPlatformAppServersOptions = {},
): Promise<PlatformAppServerEntry[]> {
  const base = (options.platformBaseUrl ?? resolvePlatformBackendUrlForClient()).replace(/\/$/, '');
  const params = new URLSearchParams();
  if (options.ids?.length) {
    params.set('ids', options.ids.join(','));
  }
  const qs = params.toString();
  const url = `${base}/api/platform/apps/server-urls${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, labPlatformFetchInit());
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Platform app server URLs request failed (${response.status})${text ? `: ${text}` : ''}`,
    );
  }
  const body = (await response.json()) as PlatformAppServersResponse;
  if (!body.success || !body.data?.apps) {
    throw new Error('Platform app server URLs response was invalid');
  }
  return body.data.apps;
}

export function getPlatformAppServerUrl(
  entries: ReadonlyArray<PlatformAppServerEntry>,
  appId: string,
): string {
  return urlForAppId(entries, appId).replace(/\/$/, '');
}
