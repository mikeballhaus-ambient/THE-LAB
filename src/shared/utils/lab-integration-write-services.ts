import type { FormsBuilderCapability } from '@/shared/types/forms-builder-integration';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';

export interface LabIntegrationWriteServiceRef {
  providerAppId: string;
  appName: string;
  serviceId: string;
  label: string;
  entityName: string;
  capabilities: FormsBuilderCapability[];
  properties: IntegrationServiceDescriptor['properties'];
}

export function serviceSupportsConnectorWrite(capabilities: FormsBuilderCapability[] | undefined): boolean {
  if (!capabilities?.length) {
    return true;
  }
  return capabilities.includes('CRUD');
}

/** Domain + platform (:3000) connector services exposed in Workflow Studio palettes. */
export function integrationServiceInWorkflowDesignerPalette(
  service: IntegrationServiceDescriptor,
): boolean {
  return serviceSupportsConnectorWrite(service.capabilities);
}

export function listIntegrationWriteServices(
  catalog: LabIntegrationServiceCatalogResponse | null | undefined,
): LabIntegrationWriteServiceRef[] {
  if (!catalog?.apps.length) {
    return [];
  }
  const out: LabIntegrationWriteServiceRef[] = [];
  for (const group of catalog.apps) {
    for (const service of group.services) {
      if (!integrationServiceInWorkflowDesignerPalette(service)) {
        continue;
      }
      out.push({
        providerAppId: group.appId,
        appName: group.appName,
        serviceId: service.serviceId,
        label: service.label,
        entityName: service.entityName,
        capabilities: service.capabilities ?? ['CRUD'],
        properties: service.properties ?? [],
      });
    }
  }
  return out.sort((a, b) => `${a.appName} ${a.label}`.localeCompare(`${b.appName} ${b.label}`));
}

export function defaultLookupRuleCondition(
  kind: 'lookup_field_exists' | 'lookup_field_equals',
  catalog: LabIntegrationServiceCatalogResponse | null | undefined,
  recordIdPath = 'id',
): LabRuleConditionV1 {
  const first = listIntegrationWriteServices(catalog)[0];
  const providerAppId = first?.providerAppId ?? 'app-lab-tasklist';
  const serviceId = first?.serviceId ?? 'task-list.tasks';
  const field = first?.properties[0]?.name ?? 'id';
  if (kind === 'lookup_field_exists') {
    return { kind, providerAppId, serviceId, recordIdPath, field };
  }
  return { kind: 'lookup_field_equals', providerAppId, serviceId, recordIdPath, field, value: '' };
}

export function defaultIntegrationCreateStep(
  ref: Pick<LabIntegrationWriteServiceRef, 'providerAppId' | 'serviceId'>,
): import('@/shared/types/lab-workflow').LabWorkflowStepV1 {
  return {
    kind: 'integration_create',
    providerAppId: ref.providerAppId,
    serviceId: ref.serviceId,
    bodyFromPayload: {},
  };
}

export function defaultIntegrationUpdateStep(
  ref: Pick<LabIntegrationWriteServiceRef, 'providerAppId' | 'serviceId'>,
  recordIdPath = 'id',
): import('@/shared/types/lab-workflow').LabWorkflowStepV1 {
  return {
    kind: 'integration_update',
    providerAppId: ref.providerAppId,
    serviceId: ref.serviceId,
    recordIdPath,
    bodyFromPayload: {},
  };
}
