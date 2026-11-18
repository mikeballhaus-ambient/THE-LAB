import type {
  AppLabIntegrationManifestV1,
  IntegrationSurfaceDecl,
  IntegrationSurfaceRegionDecl,
} from '@/shared/types/lab-integration-manifest';
import type {
  LabIntegrationBindingRecord,
  LabIntegrationPlacement,
  LabIntegrationPresentation,
} from '@/shared/types/lab-integrations';

export function findIntegrationSurface(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  surfaceId: string,
): IntegrationSurfaceDecl | undefined {
  return manifest?.integrationSurfaces?.find((row) => row.surfaceId === surfaceId);
}

export function findIntegrationSlotDecl(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  slot: string,
) {
  return manifest?.accepts?.find((row) => row.slot === slot);
}

export function inferPlacementRegionId(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  binding: LabIntegrationBindingRecord,
): string | undefined {
  const explicit = binding.config.placement?.regionId;
  if (explicit) {
    return explicit;
  }
  if (binding.kind === 'chart.surface') {
    const reports = manifest?.integrationSurfaces
      ?.flatMap((surface) => surface.regions)
      .find((region) => region.regionId === 'reports.grid');
    if (reports) {
      return 'reports.grid';
    }
  }
  const slotDecl = findIntegrationSlotDecl(manifest, binding.slot);
  if (slotDecl?.regionId) {
    return slotDecl.regionId;
  }
  if (binding.kind === 'form.surface' && binding.slot.includes('dialog')) {
    const dialogs = manifest?.integrationSurfaces
      ?.flatMap((surface) => surface.regions)
      .find((region) => region.regionId === 'dialogs');
    if (dialogs) {
      return 'dialogs';
    }
  }
  if (binding.kind === 'form.surface') {
    const inlineForms = manifest?.integrationSurfaces
      ?.flatMap((surface) => surface.regions)
      .find(
        (region) =>
          region.regionId === 'designer.forms'
          && region.kinds.includes('form.surface')
          && region.defaultPresentation === 'inline',
      );
    if (inlineForms) {
      return 'designer.forms';
    }
  }
  return undefined;
}

export function resolveBindingPresentation(
  binding: LabIntegrationBindingRecord,
  region: IntegrationSurfaceRegionDecl,
  manifest?: AppLabIntegrationManifestV1 | null,
): LabIntegrationPresentation {
  const slotDecl = findIntegrationSlotDecl(manifest, binding.slot);
  return (
    binding.config.placement?.presentation ??
    slotDecl?.defaultPresentation ??
    region.defaultPresentation ??
    (binding.kind === 'form.surface' && binding.slot.includes('dialog') ? 'dialog' : 'inline')
  );
}

export function bindingMatchesSurface(
  binding: LabIntegrationBindingRecord,
  surfaceId: string,
  manifest: AppLabIntegrationManifestV1 | null | undefined,
): boolean {
  if (!binding.enabled) {
    return false;
  }
  const placementSurface = binding.config.placement?.surfaceId;
  if (placementSurface) {
    return placementSurface === surfaceId;
  }
  const regionId = inferPlacementRegionId(manifest, binding);
  if (!regionId) {
    return false;
  }
  const surface = findIntegrationSurface(manifest, surfaceId);
  return Boolean(surface?.regions.some((region) => region.regionId === regionId));
}

export function bindingsForRegion(
  bindings: readonly LabIntegrationBindingRecord[],
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  surfaceId: string,
  regionId: string,
): LabIntegrationBindingRecord[] {
  const surface = findIntegrationSurface(manifest, surfaceId);
  const region = surface?.regions.find((row) => row.regionId === regionId);
  if (!region) {
    return [];
  }

  return bindings
    .filter((binding) => {
      if (!binding.enabled) {
        return false;
      }
      if (!findIntegrationSlotDecl(manifest, binding.slot)) {
        return false;
      }
      if (!bindingMatchesSurface(binding, surfaceId, manifest)) {
        return false;
      }
      const resolvedRegion = inferPlacementRegionId(manifest, binding);
      return resolvedRegion === regionId && region.kinds.includes(binding.kind);
    })
    .sort((a, b) => {
      const orderA = a.config.placement?.order ?? 0;
      const orderB = b.config.placement?.order ?? 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const idxA = manifest?.accepts?.findIndex((row) => row.slot === a.slot) ?? 0;
      const idxB = manifest?.accepts?.findIndex((row) => row.slot === b.slot) ?? 0;
      return idxA - idxB;
    });
}

export function validateBindingPlacement(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  kind: LabIntegrationBindingRecord['kind'],
  placement: LabIntegrationPlacement,
): { ok: true } | { ok: false; message: string } {
  if (!manifest?.integrationSurfaces?.length) {
    return { ok: false, message: 'Host manifest has no integrationSurfaces' };
  }
  const surfaces = placement.surfaceId
    ? manifest.integrationSurfaces.filter((surface) => surface.surfaceId === placement.surfaceId)
    : manifest.integrationSurfaces;
  if (placement.surfaceId && surfaces.length === 0) {
    return { ok: false, message: `Unknown surfaceId: ${placement.surfaceId}` };
  }
  const region = surfaces
    .flatMap((surface) => surface.regions)
    .find((row) => row.regionId === placement.regionId);
  if (!region) {
    return { ok: false, message: `Unknown regionId: ${placement.regionId}` };
  }
  if (!region.kinds.includes(kind)) {
    return { ok: false, message: `Region ${placement.regionId} does not accept kind ${kind}` };
  }
  return { ok: true };
}
