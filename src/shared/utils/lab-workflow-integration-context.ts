import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type {
  LabIntegrationServiceCatalogAppGroup,
  LabIntegrationServiceCatalogResponse,
} from '@/shared/types/lab-integration-service-catalog';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';
import { resolveRegistryAppIdForEventSource } from '@/shared/utils/lab-event-publisher-label';

export function resolveEventSourceAppId(
  eventType: string,
  catalogEntries: LabDomainEventCatalogEntry[],
): string {
  const entry = catalogEntries.find((row) => row.eventType === eventType);
  if (entry?.sourceAppId) {
    return entry.sourceAppId;
  }
  const segment = eventType.split('.')[0];
  return segment.startsWith('app-') ? segment : eventType;
}

export function integrationAppGroupForAppId(
  appId: string,
  serviceCatalog: LabIntegrationServiceCatalogResponse | null | undefined,
): LabIntegrationServiceCatalogAppGroup | null {
  if (!serviceCatalog?.apps.length) {
    return null;
  }
  return serviceCatalog.apps.find((group) => group.appId === appId) ?? null;
}

/** Integration services declared on the app that published the trigger event. */
export function integrationServicesForTriggerEvent(
  triggerEventType: string,
  catalogEntries: LabDomainEventCatalogEntry[],
  serviceCatalog: LabIntegrationServiceCatalogResponse | null | undefined,
): IntegrationServiceDescriptor[] {
  if (!triggerEventType || !serviceCatalog?.apps.length) {
    return [];
  }
  const sourceAppId = resolveRegistryAppIdForEventSource(
    resolveEventSourceAppId(triggerEventType, catalogEntries),
  );
  const group = integrationAppGroupForAppId(sourceAppId, serviceCatalog);
  return group?.services ?? [];
}

export function flattenIntegrationServiceProperties(
  services: IntegrationServiceDescriptor[],
): FormBuilderContractModelProperty[] {
  const seen = new Set<string>();
  const out: FormBuilderContractModelProperty[] = [];
  for (const service of services) {
    for (const property of service.properties ?? []) {
      const key = `${service.serviceId}:${property.name}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(property);
    }
  }
  return out;
}

export function countIntegrationServices(
  serviceCatalog: LabIntegrationServiceCatalogResponse | null | undefined,
): number {
  if (!serviceCatalog?.apps.length) {
    return 0;
  }
  return serviceCatalog.apps.reduce((sum, group) => sum + group.services.length, 0);
}
