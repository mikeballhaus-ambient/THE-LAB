import { onMounted, ref, shallowRef, type Ref } from 'vue';
import {
  fetchPlatformAppServerUrls,
  getPlatformAppServerUrl,
  type FetchPlatformAppServersOptions,
} from '@/shared/services/platform-app-server-client';
import type { PlatformAppServerEntry } from '@/shared/types/platform-app-servers';

export function usePlatformAppServers(options: {
  ids?: string[];
  labUserId?: number | string;
  /** Main backend (3000) or app server that proxies `/api/platform/apps/server-urls`. */
  platformBaseUrl?: string;
  getPlatformBaseUrl?: () => string | undefined;
  immediate?: boolean;
}): {
  entries: Ref<PlatformAppServerEntry[]>;
  urlsByAppId: Ref<Record<string, string>>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  refresh: () => Promise<void>;
  urlFor: (appId: string) => string;
} {
  const entries = shallowRef<PlatformAppServerEntry[]>([]);
  const urlsByAppId = ref<Record<string, string>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  const buildFetchOptions = (): FetchPlatformAppServersOptions => ({
    ids: options.ids,
    labUserId: options.labUserId,
    platformBaseUrl: options.getPlatformBaseUrl?.() ?? options.platformBaseUrl,
  });

  const syncUrlMap = (list: PlatformAppServerEntry[]) => {
    const map: Record<string, string> = {};
    for (const entry of list) {
      map[entry.appId] = entry.url.replace(/\/$/, '');
    }
    urlsByAppId.value = map;
  };

  const refresh = async () => {
    loading.value = true;
    error.value = null;
    try {
      const list = await fetchPlatformAppServerUrls(buildFetchOptions());
      entries.value = list;
      syncUrlMap(list);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load app server URLs';
      entries.value = [];
      urlsByAppId.value = {};
    } finally {
      loading.value = false;
    }
  };

  const urlFor = (appId: string) =>
    getPlatformAppServerUrl(entries.value, appId) || urlsByAppId.value[appId] || '';

  if (options.immediate !== false) {
    onMounted(() => {
      void refresh();
    });
  }

  return { entries, urlsByAppId, loading, error, refresh, urlFor };
}
