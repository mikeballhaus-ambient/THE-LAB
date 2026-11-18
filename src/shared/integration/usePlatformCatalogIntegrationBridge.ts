import { nextTick, ref, shallowRef, type ComponentPublicInstance } from 'vue';
import { tryOpenIntegrationSlot } from './platform-catalog-integration-actions';

export type PlatformCatalogIntegrationHostExpose = {
  openSlot: (slot: string) => void;
  hasEnabledBinding: (slot: string) => boolean;
  refresh?: () => void;
};

export type PlatformCatalogIntegrationHostRef = ComponentPublicInstance<
  PlatformCatalogIntegrationHostExpose
> | null;

/**
 * Binds PlatformCatalogIntegrationHost ref + mutable context for Settings / catalog admin panels.
 */
export function usePlatformCatalogIntegrationBridge() {
  const hostRef = ref<PlatformCatalogIntegrationHostRef>(null);
  const integrationContext = shallowRef<Record<string, unknown>>({});

  async function openIntegrationSlot(
    slot: string,
    context: Record<string, unknown>,
    fallback: () => void,
  ): Promise<void> {
    integrationContext.value = context;
    await nextTick();
    tryOpenIntegrationSlot(hostRef.value, slot, fallback);
  }

  function hasBinding(slot: string): boolean {
    return hostRef.value?.hasEnabledBinding(slot) ?? false;
  }

  return {
    hostRef,
    integrationContext,
    openIntegrationSlot,
    hasBinding,
  };
}
