export { fetchLabIntegrationManifest } from './fetch-lab-integration-manifest';
export { fetchLabIntegrationBindings } from './fetch-lab-integration-bindings';
export {
  bindingsForRegion,
  bindingMatchesSurface,
  findIntegrationSurface,
  inferPlacementRegionId,
  resolveBindingPresentation,
  validateBindingPlacement,
} from './resolve-integration-bindings';
export { resolveHideButtonsForInlineForm } from './resolve-region-hide-buttons';
export {
  resolveConnectorSegmentForBinding,
  resolveFormBindingRuntime,
  resolveServiceIdForBinding,
} from './resolve-form-binding-runtime';
export { useLabIntegrationSurface } from './useLabIntegrationSurface';
export { useLabIntegrationHost } from './useLabIntegrationHost';
export {
  labIntegrationHostContextKey,
  type LabIntegrationHostContext,
} from './lab-integration-host-context';

export { default as LabIntegrationHost } from './components/LabIntegrationHost.vue';
export { default as LabIntegrationSurface } from './components/LabIntegrationSurface.vue';
export { default as LabIntegrationSlot } from './components/LabIntegrationSlot.vue';
export { default as LabIntegrationFormSurfaceAdapter } from './components/LabIntegrationFormSurfaceAdapter.vue';
export { default as LabIntegrationChartSurfaceAdapter } from './components/LabIntegrationChartSurfaceAdapter.vue';
export { default as CatalogIntegrationHost } from './components/CatalogIntegrationHost.vue';
export { default as CatalogReportsPanel } from './components/CatalogReportsPanel.vue';
export { default as CatalogAppFormSection } from './components/CatalogAppFormSection.vue';
export { default as CatalogAppReportsSection } from './components/CatalogAppReportsSection.vue';
export {
  getCatalogIntegrationMeta,
  getCatalogEntityMeta,
  getCatalogPrimaryIntegrationMeta,
} from './catalog-integration-meta';
export {
  useCatalogIntegrationDialogs,
  useCatalogHostDialogs,
} from './useCatalogIntegrationDialogs';
