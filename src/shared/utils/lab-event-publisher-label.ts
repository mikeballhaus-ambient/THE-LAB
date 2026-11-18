import { LAB_APPROVALS_SOURCE_APP_ID } from '@/shared/types/lab-approval';
import { LAB_LEDGER_SOURCE_APP_ID } from '@/shared/types/lab-ledger';
import { LAB_RULES_PLATFORM_SOURCE_APP_ID } from '@/shared/types/lab-rules-platform';

/** Platform bus publishers map to catalog app registry ids (integrations + display). */
export const PLATFORM_SOURCE_APP_REGISTRY_IDS: Record<string, string> = {
  [LAB_RULES_PLATFORM_SOURCE_APP_ID]: 'app-lab-workflow-studio',
  [LAB_APPROVALS_SOURCE_APP_ID]: 'app-lab-approvals-policies',
  [LAB_LEDGER_SOURCE_APP_ID]: 'app-lab-financial-ledger',
};

/** Map domain event `sourceAppId` to the app that owns integration services in the catalog. */
export function resolveRegistryAppIdForEventSource(sourceAppId: string): string {
  return PLATFORM_SOURCE_APP_REGISTRY_IDS[sourceAppId] ?? sourceAppId;
}

function humanizePublisherId(sourceAppId: string): string {
  const tail = sourceAppId.replace(/^platform-/, '').replace(/^app-/, '');
  return tail
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Resolve a domain event `sourceAppId` to a user-facing publisher name.
 */
export function resolveLabEventPublisherDisplayName(
  sourceAppId: string,
  appNameById: ReadonlyMap<string, string>,
): string {
  const registryId = resolveRegistryAppIdForEventSource(sourceAppId);
  const fromRegistry = appNameById.get(registryId);
  if (fromRegistry) {
    return fromRegistry;
  }
  if (sourceAppId.startsWith('app-')) {
    return humanizePublisherId(sourceAppId);
  }
  return humanizePublisherId(sourceAppId);
}
