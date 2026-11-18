import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';
import { findIntegrationSurface } from './resolve-integration-bindings';

/** Whether inline form.surface bindings omit per-form Save/Cancel (host renders shared actions). */
export function resolveHideButtonsForInlineForm(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  surfaceId: string,
  regionId: string,
  binding?: LabIntegrationBindingRecord,
): boolean {
  const placementHide = binding?.config.placement?.hideButtons;
  if (placementHide !== undefined) {
    return placementHide;
  }
  const surface = findIntegrationSurface(manifest, surfaceId);
  const region = surface?.regions.find((row) => row.regionId === regionId);
  return region?.hideButtons === true;
}
