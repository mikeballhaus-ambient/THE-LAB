import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';
import { platformCatalogServiceDescriptorByServiceId } from '@/shared/lab-integrations/platform-catalog-integration-services';

export interface IntegrationBodyMappingRow {
  field: string;
  sourcePath: string;
  fieldLabel: string;
  sourceLabel: string;
}

export interface IntegrationAutomaticBodyMappingRow extends IntegrationBodyMappingRow {
  summary: string;
}

function propertyLabel(property: FormBuilderContractModelProperty | undefined, field: string): string {
  return property?.label?.trim() || field;
}

function sourcePathToPayloadKey(sourcePath: string): string {
  return sourcePath.replace(/^payload\./, '').trim();
}

export function integrationPropertyForField(
  properties: FormBuilderContractModelProperty[],
  field: string,
): FormBuilderContractModelProperty | undefined {
  return properties.find((property) => property.name === field);
}

/**
 * Catalog rows from SQLite manifests may omit designer-only property metadata. Merge canonical
 * platform service descriptors so automatic field bindings still apply without a manifest re-sync.
 */
export function integrationPropertiesForWorkflowDesigner(
  serviceId: string,
  catalogProperties: FormBuilderContractModelProperty[],
): FormBuilderContractModelProperty[] {
  const canonical = platformCatalogServiceDescriptorByServiceId(serviceId);
  if (!canonical?.properties?.length) {
    return catalogProperties;
  }
  const byName = new Map(catalogProperties.map((property) => [property.name, { ...property }]));
  for (const property of canonical.properties) {
    const existing = byName.get(property.name);
    byName.set(property.name, { ...existing, ...property });
  }
  return [...byName.values()];
}

export function isWorkflowMapperHiddenField(
  property: FormBuilderContractModelProperty | undefined,
): boolean {
  if (!property) {
    return false;
  }
  if (property.hidden) {
    return true;
  }
  return property.workflowDesignerBinding?.hideFromMapper === true;
}

export function defaultAutomaticBodyFromPayload(
  properties: FormBuilderContractModelProperty[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const property of properties) {
    const binding = property.workflowDesignerBinding;
    if (!binding?.hideFromMapper || !binding.defaultPayloadPath.trim()) {
      continue;
    }
    out[property.name] = `payload.${binding.defaultPayloadPath.trim()}`;
  }
  return out;
}

export function splitIntegrationBodyFromPayloadMappings(
  properties: FormBuilderContractModelProperty[],
  bodyFromPayload: Record<string, string>,
  payloadPathLabelByKey: Map<string, string>,
): {
  userMappings: IntegrationBodyMappingRow[];
  automaticMappings: IntegrationAutomaticBodyMappingRow[];
} {
  const userMappings: IntegrationBodyMappingRow[] = [];
  const automaticMappings: IntegrationAutomaticBodyMappingRow[] = [];

  for (const [field, sourcePath] of Object.entries(bodyFromPayload)) {
    const property = integrationPropertyForField(properties, field);
    const payloadKey = sourcePathToPayloadKey(sourcePath);
    const row: IntegrationBodyMappingRow = {
      field,
      sourcePath,
      fieldLabel: propertyLabel(property, field),
      sourceLabel: payloadPathLabelByKey.get(payloadKey) ?? payloadKey,
    };

    if (isWorkflowMapperHiddenField(property)) {
      automaticMappings.push({
        ...row,
        summary: property?.workflowDesignerBinding?.summary ?? 'Filled automatically from the event',
      });
      continue;
    }
    userMappings.push(row);
  }

  return { userMappings, automaticMappings };
}

export function userMappableIntegrationProperties(
  properties: FormBuilderContractModelProperty[],
): FormBuilderContractModelProperty[] {
  return properties.filter((property) => !property.hidden && !isWorkflowMapperHiddenField(property));
}
