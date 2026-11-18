import { orderDependenciesForLaunch } from '@/shared/config/platform-app-dependency-order';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';
import { appIdsMatch, toRegistryAppId } from './normalize-app-id';

/**
 * Effective launch dependencies = registry `dependencies` ∪ enabled binding `providerAppId`s.
 * Returns registry ids in platform infrastructure order.
 */
export function resolveLaunchDependencyIds(
  registryDependencyIds: readonly string[],
  bindings: readonly LabIntegrationBindingRecord[],
  hostAppId: string,
): string[] {
  const merged = new Set(registryDependencyIds.map(toRegistryAppId));

  for (const binding of bindings) {
    if (!binding.enabled) {
      continue;
    }
    if (!appIdsMatch(binding.hostAppId, hostAppId)) {
      continue;
    }
    const provider = toRegistryAppId(binding.providerAppId);
    if (provider) {
      merged.add(provider);
    }
  }

  return orderDependenciesForLaunch([...merged]);
}
