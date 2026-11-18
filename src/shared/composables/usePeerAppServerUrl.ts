import { computed, type Ref } from 'vue';
import { usePlatformAppServers } from '@/shared/composables/usePlatformAppServers';

/** Resolve one dependency app server base URL from the platform registry API. */
export function usePeerAppServerUrl(
  appId: string,
  options?: {
    labUserId?: number | string;
    platformBaseUrl?: string | Ref<string | undefined>;
  },
) {
  const platformBase = options?.platformBaseUrl;
  const resolvedBase = computed(() => {
    const raw = platformBase;
    if (raw && typeof raw === 'object' && 'value' in raw) {
      return raw.value?.replace(/\/$/, '') || undefined;
    }
    return typeof raw === 'string' ? raw.replace(/\/$/, '') || undefined : undefined;
  });

  const { urlsByAppId, loading, error, refresh, urlFor } = usePlatformAppServers({
    ids: [appId],
    labUserId: options?.labUserId,
    getPlatformBaseUrl: () => resolvedBase.value,
    immediate: true,
  });

  const url = computed(() => urlsByAppId.value[appId] ?? urlFor(appId));

  return { url, loading, error, refresh };
}
