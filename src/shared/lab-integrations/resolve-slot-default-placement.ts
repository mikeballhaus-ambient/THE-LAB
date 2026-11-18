import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type {
  LabIntegrationBindingConfigV1,
  LabIntegrationBindingRecord,
  LabIntegrationPlacement,
  LabIntegrationPresentation,
} from '@/shared/types/lab-integrations';
import { mergeBindingConfigFromMcpFields } from './merge-binding-config-from-mcp';

export function findSurfaceIdForRegion(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  regionId: string,
  kind: LabIntegrationBindingRecord['kind'],
): string | undefined {
  for (const surface of manifest?.integrationSurfaces ?? []) {
    const region = surface.regions.find((row) => row.regionId === regionId);
    if (region?.kinds.includes(kind)) {
      return surface.surfaceId;
    }
  }
  return undefined;
}

/** Placement defaults from manifest \`accepts\` + \`integrationSurfaces\` (for agent upsert / stubs). */
export function resolveSlotDefaultPlacement(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  slot: string,
  kind: LabIntegrationBindingRecord['kind'],
): LabIntegrationPlacement | undefined {
  const accept = manifest?.accepts?.find((row) => row.slot === slot);
  if (!accept?.regionId) {
    return undefined;
  }
  const regionId = accept.regionId;
  const surfaceId = findSurfaceIdForRegion(manifest, regionId, kind);
  const regionDecl = manifest?.integrationSurfaces
    ?.flatMap((surface) => surface.regions)
    .find((row) => row.regionId === regionId);
  const presentation: LabIntegrationPresentation =
    accept.defaultPresentation ??
    regionDecl?.defaultPresentation ??
    (slot.includes('dialog') ? 'dialog' : 'inline');

  return {
    regionId,
    ...(surfaceId ? { surfaceId } : {}),
    presentation,
  };
}

export function applyManifestDefaultPlacementToBindingConfig(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  slot: string,
  kind: LabIntegrationBindingRecord['kind'],
  config?: LabIntegrationBindingConfigV1,
): LabIntegrationBindingConfigV1 {
  const base = config ?? { schemaVersion: 1 };
  if (base.placement?.regionId) {
    return base;
  }
  const defaults = resolveSlotDefaultPlacement(manifest, slot, kind);
  if (!defaults) {
    return base;
  }
  return mergeBindingConfigFromMcpFields({
    config: base,
    placementRegionId: defaults.regionId,
    placementSurfaceId: defaults.surfaceId,
    presentation: defaults.presentation,
  });
}
