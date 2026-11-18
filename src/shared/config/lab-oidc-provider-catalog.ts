import { resolvePlatformBackendUrl } from './resolve-platform-backend-url.node';

export interface LabOidcProviderCatalogEntry {
  id: string;
  label: string;
  icon: string;
  loginPath: string;
  /** When false, settings can be saved but sign-in is not offered yet */
  loginImplemented: boolean;
}

/** Fixed platform IdPs — one row each in `lab_oidc_providers`. */
export const LAB_OIDC_PROVIDER_CATALOG: LabOidcProviderCatalogEntry[] = [
  {
    id: 'google',
    label: 'Google',
    icon: 'fab fa-google',
    loginPath: '/auth/oidc/google/login',
    loginImplemented: true,
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: 'fab fa-github',
    loginPath: '/auth/oidc/github/login',
    loginImplemented: true,
  },
  {
    id: 'microsoft-entra',
    label: 'Microsoft Entra ID',
    icon: 'fab fa-microsoft',
    loginPath: '/auth/oidc/microsoft-entra/login',
    loginImplemented: true,
  },
];

const catalogById = new Map(LAB_OIDC_PROVIDER_CATALOG.map((e) => [e.id, e]));

export function getOidcProviderCatalogEntry(
  providerId: string,
): LabOidcProviderCatalogEntry | undefined {
  return catalogById.get(providerId);
}

export function isKnownOidcProviderId(providerId: string): boolean {
  return catalogById.has(providerId);
}

export function listOidcProviderCatalog(): LabOidcProviderCatalogEntry[] {
  return [...LAB_OIDC_PROVIDER_CATALOG];
}

export function isOidcLoginImplemented(providerId: string): boolean {
  return catalogById.get(providerId)?.loginImplemented ?? false;
}

export function getSuggestedOidcRedirectUri(providerId: string): string {
  const base = resolvePlatformBackendUrl();
  if (!isKnownOidcProviderId(providerId)) {
    return `${base}/auth/oidc/${providerId}/callback`;
  }
  return `${base}/auth/oidc/${providerId}/callback`;
}
