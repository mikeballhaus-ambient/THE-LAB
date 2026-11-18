import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';

export interface CatalogEntityDef {
  entityName: string;
  /** Slot prefix, e.g. `article` → `article.create.dialog`. */
  entityKey: string;
  /** Human wording for create/edit/delete dialog titles (defaults to entityName). */
  formEntityLabel?: string;
  connectorSegment: string;
  discoveryEntityKey: string;
  properties: IntegrationServiceDescriptor['properties'];
  /** Context key for edit/delete, e.g. `articleId`. */
  idContextKey: string;
  /** Parent keys required for child create/edit (e.g. `tripId`). */
  parentContextKeys?: string[];
}

export interface CatalogChartDef {
  slot: string;
  label: string;
  /** Integration service used for connector discovery / aggregation. */
  requiresServiceId: string;
  contextKeys?: string[];
}

export interface CatalogHostDef {
  hostAppId: string;
  slug: string;
  surfaceId: string;
  surfaceLabel: string;
  entities: CatalogEntityDef[];
  charts?: CatalogChartDef[];
}

export function buildCatalogHostManifest(def: CatalogHostDef): AppLabIntegrationManifestV1 {
  const integrationServices: IntegrationServiceDescriptor[] = def.entities.map((entity) => ({
    serviceId: `${def.slug}.${entity.connectorSegment}`,
    label: entity.entityName,
    description: `${entity.entityName} records`,
    tier: 'domain',
    entityName: entity.entityName,
    capabilities: ['CRUD'],
    connector: {
      segment: entity.connectorSegment,
      discoveryPath: `/connector/discovery/${entity.discoveryEntityKey}`,
    },
    integration: {
      formSlots: [
        `${entity.entityKey}.create.dialog`,
        `${entity.entityKey}.edit.dialog`,
        `${entity.entityKey}.delete.dialog`,
      ],
    },
    primaryKeyType: 'number',
    properties: entity.properties,
  }));

  const formAccepts = def.entities.flatMap((entity) => {
    const serviceId = `${def.slug}.${entity.connectorSegment}`;
    const parentKeys = entity.parentContextKeys ?? [];
    const formLabel = entity.formEntityLabel?.trim() || entity.entityName;
    return [
      {
        kind: 'form.surface' as const,
        slot: `${entity.entityKey}.create.dialog`,
        label: `Create ${formLabel}`,
        contextKeys: parentKeys.length > 0 ? parentKeys : undefined,
        requiresServiceId: serviceId,
      },
      {
        kind: 'form.surface' as const,
        slot: `${entity.entityKey}.edit.dialog`,
        label: `Edit ${formLabel}`,
        contextKeys: [...parentKeys, entity.idContextKey],
        requiresServiceId: serviceId,
      },
      {
        kind: 'form.surface' as const,
        slot: `${entity.entityKey}.delete.dialog`,
        label: `Delete ${formLabel}`,
        contextKeys: [...parentKeys, entity.idContextKey],
        requiresServiceId: serviceId,
      },
    ];
  });

  const chartAccepts =
    def.charts?.map((chart) => ({
      kind: 'chart.surface' as const,
      slot: chart.slot,
      label: chart.label,
      contextKeys: chart.contextKeys,
      requiresServiceId: chart.requiresServiceId,
    })) ?? [];

  const regions: Array<{
    regionId: string;
    label: string;
    kinds: Array<'form.surface' | 'chart.surface'>;
    defaultPresentation: 'dialog' | 'inline';
    layout?: 'grid';
    gridColumns?: 2 | 3 | 4;
  }> = [
    {
      regionId: 'dialogs',
      label: 'Dialogs',
      kinds: ['form.surface'],
      defaultPresentation: 'dialog',
    },
  ];
  if (chartAccepts.length > 0) {
    const chartCount = chartAccepts.length;
    regions.push({
      regionId: 'reports.grid',
      label: 'Reports',
      kinds: ['chart.surface'],
      layout: 'grid',
      defaultPresentation: 'inline',
      ...(chartCount >= 4
        ? { gridColumns: 4 as const }
        : chartCount === 3
          ? { gridColumns: 3 as const }
          : {}),
    });
  }

  return {
    schemaVersion: 1,
    integrationServices,
    accepts: [...formAccepts, ...chartAccepts],
    integrationSurfaces: [
      {
        surfaceId: def.surfaceId,
        label: def.surfaceLabel,
        regions,
      },
    ],
  };
}

export function catalogServiceDescriptorByServiceId(
  manifests: Array<[string, AppLabIntegrationManifestV1]>,
  serviceId: string,
): IntegrationServiceDescriptor | null {
  for (const [, manifest] of manifests) {
    const found = manifest.integrationServices?.find((row) => row.serviceId === serviceId);
    if (found) {
      return found;
    }
  }
  return null;
}
