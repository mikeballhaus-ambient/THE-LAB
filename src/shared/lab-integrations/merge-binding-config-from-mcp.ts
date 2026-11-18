import type {
  LabIntegrationBindingConfigV1,
  LabIntegrationPresentation,
} from '@/shared/types/lab-integrations';

export interface BindingPlacementMcpFields {
  presentation?: LabIntegrationPresentation;
  placementRegionId?: string;
  placementSurfaceId?: string;
  placementOrder?: number;
  config?: LabIntegrationBindingConfigV1;
}

/** Merges top-level MCP placement fields into binding config (upsert convenience). */
export function mergeBindingConfigFromMcpFields(
  input: BindingPlacementMcpFields,
): LabIntegrationBindingConfigV1 {
  const base: LabIntegrationBindingConfigV1 = input.config ?? { schemaVersion: 1 };
  const placement = { ...base.placement };
  let touched = false;

  if (input.placementRegionId) {
    placement.regionId = input.placementRegionId;
    touched = true;
  }
  if (input.placementSurfaceId) {
    placement.surfaceId = input.placementSurfaceId;
    touched = true;
  }
  if (input.presentation) {
    placement.presentation = input.presentation;
    touched = true;
  }
  if (input.placementOrder !== undefined) {
    placement.order = input.placementOrder;
    touched = true;
  }

  if (!touched) {
    return base;
  }
  if (!placement.regionId) {
    throw new Error(
      'placementRegionId is required when setting presentation, placementSurfaceId, or placementOrder',
    );
  }
  return {
    ...base,
    placement: {
      ...placement,
      regionId: placement.regionId,
    },
  };
}
