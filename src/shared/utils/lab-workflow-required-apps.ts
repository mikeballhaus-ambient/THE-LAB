import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import type { LabWorkflowDefinition } from '@/shared/types/lab-workflow';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowRequiredAppRef, LabWorkflowRequiredAppRole } from '@/shared/types/lab-workflow-required-apps';
import { isPlatformHostedIntegrationServiceId } from '@/shared/lab-integrations/platform-integration-service-ids';
import { resolveIntegrationAppIdForService } from '@/shared/lab-integrations/resolve-integration-connector-server-url';
import { resolveRegistryAppIdForEventSource } from '@/shared/utils/lab-event-publisher-label';
import {
  getWorkflowTriggerEventType,
  isLabWorkflowDefinitionV2,
} from '@/shared/utils/lab-workflow-definition';

function addRef(
  map: Map<string, LabWorkflowRequiredAppRef>,
  appId: string,
  role: LabWorkflowRequiredAppRole,
  serviceId?: string,
): void {
  const trimmed = appId.trim();
  if (!trimmed) {
    return;
  }
  const existing = map.get(trimmed);
  if (!existing) {
    map.set(trimmed, {
      appId: trimmed,
      roles: [role],
      serviceIds: serviceId ? [serviceId] : [],
    });
    return;
  }
  if (!existing.roles.includes(role)) {
    existing.roles.push(role);
  }
  if (serviceId && !existing.serviceIds.includes(serviceId)) {
    existing.serviceIds.push(serviceId);
  }
}

function collectFromConditions(
  map: Map<string, LabWorkflowRequiredAppRef>,
  conditions: LabRuleConditionV1[] | undefined,
): void {
  for (const condition of conditions ?? []) {
    if (condition.kind !== 'lookup_field_exists' && condition.kind !== 'lookup_field_equals') {
      continue;
    }
    const connectorAppId = resolveIntegrationAppIdForService(
      condition.providerAppId,
      condition.serviceId,
    );
    addRef(map, connectorAppId, 'integration_provider', condition.serviceId);
  }
}

function collectFromStep(map: Map<string, LabWorkflowRequiredAppRef>, step: LabWorkflowStepV1): void {
  if (step.kind === 'publish_event') {
    addRef(map, resolveRegistryAppIdForEventSource(step.sourceAppId), 'event_publisher');
    return;
  }
  if (step.kind === 'integration_create' || step.kind === 'integration_update') {
    const connectorAppId = resolveIntegrationAppIdForService(step.providerAppId, step.serviceId);
    addRef(map, connectorAppId, 'integration_provider', step.serviceId);
    return;
  }
  if (step.kind === 'ledger_post_entry') {
    addRef(map, 'app-lab-financial-ledger', 'integration_provider');
  }
}

function collectFromGraphNodes(
  map: Map<string, LabWorkflowRequiredAppRef>,
  nodes: LabWorkflowGraphNodeV2[],
): void {
  for (const node of nodes) {
    if (node.kind === 'condition') {
      collectFromConditions(map, node.conditions);
    } else if (node.kind === 'rule') {
      collectFromConditions(map, node.conditions);
    } else if (node.kind === 'action') {
      collectFromStep(map, node.step);
    }
  }
}

/**
 * Static dependency scan for a workflow definition (graph or legacy steps).
 */
export function collectWorkflowRequiredAppRefs(
  definition: LabWorkflowDefinition,
  catalogEntries: LabDomainEventCatalogEntry[],
): LabWorkflowRequiredAppRef[] {
  const map = new Map<string, LabWorkflowRequiredAppRef>();

  const eventType = getWorkflowTriggerEventType(definition);
  if (eventType) {
    const entry = catalogEntries.find((row) => row.eventType === eventType);
    const sourceAppId = entry?.sourceAppId ?? eventType.split('.')[0] ?? '';
    if (sourceAppId) {
      addRef(map, resolveRegistryAppIdForEventSource(sourceAppId), 'event_publisher');
    }
  }

  if (isLabWorkflowDefinitionV2(definition)) {
    collectFromGraphNodes(map, definition.nodes);
  } else {
    collectFromConditions(map, definition.conditions);
    for (const step of definition.steps ?? []) {
      collectFromStep(map, step);
    }
  }

  return [...map.values()].sort((a, b) => a.appId.localeCompare(b.appId));
}

export function workflowRequiredAppUsesOnlyPlatformConnectors(ref: LabWorkflowRequiredAppRef): boolean {
  if (ref.serviceIds.length === 0) {
    return false;
  }
  return ref.serviceIds.every((serviceId) => isPlatformHostedIntegrationServiceId(serviceId));
}
