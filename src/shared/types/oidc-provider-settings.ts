export interface LabOidcProviderSettingsPublic {
  providerId: string;
  label: string;
  icon: string;
  enabled: boolean;
  clientId: string;
  redirectUri: string;
  hasClientSecret: boolean;
  /** Length of stored secret (for masked display only) */
  clientSecretLength?: number;
  suggestedRedirectUri: string;
  /** Platform sign-in route is wired for this IdP */
  loginImplemented: boolean;
  /** Microsoft Entra directory tenant (or `common` / `organizations`) */
  tenantId?: string;
}

export interface LabOidcProviderSettingsUpdate {
  enabled: boolean;
  clientId: string;
  /** Omit or empty to keep existing secret */
  clientSecret?: string;
  redirectUri?: string;
  /** Microsoft Entra only — stored in `extras_json` */
  tenantId?: string;
}

export interface LabOidcProviderCatalogPublic {
  id: string;
  label: string;
  icon: string;
  loginPath: string;
  suggestedRedirectUri: string;
  loginImplemented: boolean;
}

export interface LabOidcProvidersAdminPayload {
  providers: LabOidcProviderSettingsPublic[];
}
