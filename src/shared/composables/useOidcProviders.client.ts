import { ref } from 'vue';
import {
  type LabOidcProviderMeta,
  resolveEnabledOidcProviders,
} from '@/shared/config/lab-oidc-providers.client';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';

export function useOidcProviders() {
  const oidcProviders = ref<LabOidcProviderMeta[]>([]);
  const oidcConfigLoaded = ref(false);

  async function loadOidcProviders(): Promise<void> {
    try {
      const res = await fetch(`${resolvePlatformBackendUrlForClient()}/auth/oidc/config`, {
        credentials: 'include',
      });
      if (!res.ok) {
        oidcProviders.value = [];
        return;
      }
      const data = (await res.json()) as {
        providers?: Record<string, boolean>;
        enabledProviderIds?: string[];
      };
      const ids =
        data.enabledProviderIds ??
        Object.entries(data.providers ?? {})
          .filter(([, on]) => Boolean(on))
          .map(([id]) => id);
      oidcProviders.value = resolveEnabledOidcProviders(ids);
    } catch {
      oidcProviders.value = [];
    } finally {
      oidcConfigLoaded.value = true;
    }
  }

  function startOidcLogin(provider: LabOidcProviderMeta): void {
    const base = resolvePlatformBackendUrlForClient();
    window.location.href = `${base}${provider.loginPath}`;
  }

  return {
    oidcProviders,
    oidcConfigLoaded,
    loadOidcProviders,
    startOidcLogin,
  };
}
