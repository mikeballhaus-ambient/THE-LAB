import type { IntegrationServiceDescriptor } from './lab-integration-service';
import type { LabIntegrationKind } from './lab-integrations';

/** Full app integration manifest (registry row `integration_manifest`). */
export interface AppLabIntegrationManifestV1 {
  schemaVersion: 1;
  integrationServices?: IntegrationServiceDescriptor[];
  offers?: IntegrationOfferDecl[];
  accepts?: IntegrationSlotDecl[];
  integrationSurfaces?: IntegrationSurfaceDecl[];
}

export interface IntegrationOfferDecl {
  kind: LabIntegrationKind;
  offerId: string;
  label: string;
  description?: string;
  refSource: 'registry-only' | 'provider-api';
  providerApi?: { path: string; refField: string; labelField: string };
}

export interface IntegrationSlotDecl {
  kind: LabIntegrationKind;
  slot: string;
  label: string;
  contextKeys?: string[];
  /** Links to provider integrationServices[].serviceId */
  requiresServiceId?: string;
  /** Default surface region when binding has no placement.regionId */
  regionId?: string;
  /** Default UI mode for this slot; binding `placement.presentation` overrides */
  defaultPresentation?: 'inline' | 'dialog';
}

export interface IntegrationSurfaceRegionDecl {
  regionId: string;
  label: string;
  kinds: LabIntegrationKind[];
  layout?: 'stack' | 'grid';
  /** When `layout` is `grid`, number of columns at `xl` breakpoint (default 2). */
  gridColumns?: 2 | 3 | 4;
  defaultPresentation?: 'inline' | 'dialog';
  /**
   * When true, inline `form.surface` slots in this region hide Save/Cancel;
   * the host surface should call `submitInlineRegion(regionId)` from shared actions.
   */
  hideButtons?: boolean;
}

export interface IntegrationSurfaceDecl {
  surfaceId: string;
  label: string;
  regions: IntegrationSurfaceRegionDecl[];
}
