import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';
import { urlForAppId } from '@/shared/services/app-server-url-resolution';
import type { PlatformAppServerEntry, PlatformAppServersResponse } from '@/shared/types/platform-app-servers';
import {
  buildPlatformServiceAuthHeaders,
  resolvePlatformActorUserId,
} from '@/shared/services/platform-user-client.node';

export async function fetchPlatformAppServerUrlsNode(options: {
  ids?: string[];
  actorUserId?: number;
}): Promise<PlatformAppServerEntry[]> {
  const base = resolvePlatformBackendUrl().replace(/\/$/, '');
  const actorUserId = options.actorUserId ?? resolvePlatformActorUserId();
  const params = new URLSearchParams();
  if (options.ids?.length) {
    params.set('ids', options.ids.join(','));
  }
  const qs = params.toString();
  const url = `${base}/api/platform/apps/server-urls${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    headers: buildPlatformServiceAuthHeaders(actorUserId),
  });
  if (!response.ok) {
    throw new Error(`Platform app server URLs request failed (${response.status})`);
  }
  const body = (await response.json()) as PlatformAppServersResponse;
  return body.data?.apps ?? [];
}

export async function fetchPlatformAppServerUrlNode(
  appId: string,
  actorUserId?: number,
): Promise<string> {
  const entries = await fetchPlatformAppServerUrlsNode({ ids: [appId], actorUserId });
  return urlForAppId(entries, appId).replace(/\/$/, '');
}
