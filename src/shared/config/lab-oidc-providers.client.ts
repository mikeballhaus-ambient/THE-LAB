import {
  LAB_OIDC_PROVIDER_CATALOG,
  type LabOidcProviderCatalogEntry,
} from './lab-oidc-provider-catalog';

/** @deprecated use LabOidcProviderCatalogEntry */
export type LabOidcProviderMeta = LabOidcProviderCatalogEntry;

export { LAB_OIDC_PROVIDER_CATALOG };

export function resolveEnabledOidcProviders(
  enabledIds: string[],
): LabOidcProviderCatalogEntry[] {
  const idSet = new Set(enabledIds);
  return LAB_OIDC_PROVIDER_CATALOG.filter((p) => idSet.has(p.id));
}
