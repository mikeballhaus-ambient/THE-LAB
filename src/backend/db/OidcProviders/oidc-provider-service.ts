import {
  getDefaultGoogleOidcRedirectUri,
  GOOGLE_OIDC_PROVIDER,
} from '@/shared/config/lab-google-oidc-env.node';
import {
  getOidcProviderCatalogEntry,
  getSuggestedOidcRedirectUri,
  isKnownOidcProviderId,
  isOidcLoginImplemented,
  listOidcProviderCatalog,
} from '@/shared/config/lab-oidc-provider-catalog';
import {
  oidcProvidersRepository,
  type LabOidcProviderRow,
} from './oidc-providers-repository';
import type {
  LabOidcProviderSettingsPublic,
  LabOidcProviderSettingsUpdate,
  LabOidcProvidersAdminPayload,
} from '@/shared/types/oidc-provider-settings';
import {
  MICROSOFT_ENTRA_OIDC_PROVIDER_ID,
  isValidEntraTenantId,
  parseMicrosoftEntraExtras,
  serializeMicrosoftEntraExtras,
} from '@/shared/config/lab-microsoft-entra-oidc-extras';

export interface GoogleOidcRuntimeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  source: 'database';
}

export interface OidcProviderRuntimeConfig {
  providerId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string;
}

class OidcProviderService {
  private static instance: OidcProviderService;
  private cache = new Map<string, LabOidcProviderRow>();
  private cacheLoaded = false;

  static getInstance(): OidcProviderService {
    if (!OidcProviderService.instance) {
      OidcProviderService.instance = new OidcProviderService();
    }
    return OidcProviderService.instance;
  }

  ensureCatalogProviders(): void {
    for (const entry of listOidcProviderCatalog()) {
      if (!oidcProvidersRepository.getByProviderId(entry.id)) {
        oidcProvidersRepository.insertEmpty(entry.id);
      }
    }
  }

  refreshCache(): void {
    this.ensureCatalogProviders();
    this.cache.clear();
    for (const row of oidcProvidersRepository.getAll()) {
      this.cache.set(row.providerId, row);
    }
    this.cacheLoaded = true;
  }

  private getCachedRow(providerId: string): LabOidcProviderRow | undefined {
    if (!this.cacheLoaded) {
      try {
        this.refreshCache();
      } catch {
        return undefined;
      }
    }
    return this.cache.get(providerId);
  }

  private virtualEmptyRow(providerId: string): LabOidcProviderRow {
    const now = new Date().toISOString();
    return {
      providerId,
      enabled: false,
      clientId: null,
      clientSecret: null,
      redirectUri: null,
      extrasJson: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private rowToPublicSettings(row: LabOidcProviderRow): LabOidcProviderSettingsPublic {
    const catalog = getOidcProviderCatalogEntry(row.providerId);
    const suggestedRedirectUri = getSuggestedOidcRedirectUri(row.providerId);
    const settings: LabOidcProviderSettingsPublic = {
      providerId: row.providerId,
      label: catalog?.label ?? row.providerId,
      icon: catalog?.icon ?? 'fa fa-key',
      enabled: row.enabled,
      clientId: row.clientId ?? '',
      redirectUri: row.redirectUri?.trim() || suggestedRedirectUri,
      hasClientSecret: Boolean(row.clientSecret?.trim()),
      clientSecretLength: row.clientSecret?.trim().length,
      suggestedRedirectUri,
      loginImplemented: catalog?.loginImplemented ?? false,
    };
    if (row.providerId === MICROSOFT_ENTRA_OIDC_PROVIDER_ID) {
      settings.tenantId = parseMicrosoftEntraExtras(row.extrasJson).tenantId;
    }
    return settings;
  }

  getAdminPayload(): LabOidcProvidersAdminPayload {
    this.ensureCatalogProviders();
    const providers = listOidcProviderCatalog().map((entry) => {
      const row =
        oidcProvidersRepository.getByProviderId(entry.id) ??
        this.virtualEmptyRow(entry.id);
      return this.rowToPublicSettings(row);
    });
    return { providers };
  }

  listPublicSettings(): LabOidcProviderSettingsPublic[] {
    return this.getAdminPayload().providers;
  }

  updateProviderSettings(
    providerId: string,
    update: LabOidcProviderSettingsUpdate,
  ): { success: true; settings: LabOidcProviderSettingsPublic } | { success: false; error: string } {
    const id = providerId.trim().toLowerCase();
    if (!isKnownOidcProviderId(id)) {
      return { success: false, error: `Unknown provider "${providerId}".` };
    }
    this.ensureCatalogProviders();
    const existing =
      oidcProvidersRepository.getByProviderId(id) ?? this.virtualEmptyRow(id);
    const clientId = update.clientId.trim();
    const providerLabel = getOidcProviderCatalogEntry(id)?.label ?? id;
    if (update.enabled && !clientId) {
      return {
        success: false,
        error: `Client ID is required when ${providerLabel} is enabled.`,
      };
    }
    const secretInput = update.clientSecret?.trim();
    let clientSecret: string | null = null;
    if (secretInput) {
      clientSecret = secretInput;
    } else if (existing.clientSecret) {
      clientSecret = existing.clientSecret;
    }
    if (update.enabled && !clientSecret) {
      return {
        success: false,
        error: `Client secret is required when enabling ${providerLabel} sign-in.`,
      };
    }
    let extrasJson: string | null | undefined = existing.extrasJson;
    if (id === MICROSOFT_ENTRA_OIDC_PROVIDER_ID) {
      const tenantInput = update.tenantId?.trim() || parseMicrosoftEntraExtras(existing.extrasJson).tenantId;
      if (update.enabled && !isValidEntraTenantId(tenantInput)) {
        return {
          success: false,
          error: 'Microsoft Entra tenant must be a GUID or common, organizations, or consumers.',
        };
      }
      extrasJson = serializeMicrosoftEntraExtras(tenantInput);
    }
    const redirectUri = update.redirectUri?.trim() || getSuggestedOidcRedirectUri(id);
    oidcProvidersRepository.upsert({
      providerId: id,
      enabled: update.enabled,
      clientId: clientId || null,
      clientSecret,
      redirectUri,
      extrasJson,
    });
    this.refreshCache();
    const updated = oidcProvidersRepository.getByProviderId(id);
    if (!updated) {
      return { success: false, error: 'Failed to save provider settings.' };
    }
    return { success: true, settings: this.rowToPublicSettings(updated) };
  }

  updateGoogleSettings(update: LabOidcProviderSettingsUpdate) {
    return this.updateProviderSettings(GOOGLE_OIDC_PROVIDER, update);
  }

  getGoogleRuntimeConfig(): GoogleOidcRuntimeConfig | null {
    const row = this.getCachedRow(GOOGLE_OIDC_PROVIDER);
    if (row?.enabled && row.clientId?.trim() && row.clientSecret?.trim()) {
      return {
        clientId: row.clientId.trim(),
        clientSecret: row.clientSecret.trim(),
        redirectUri: row.redirectUri?.trim() || getDefaultGoogleOidcRedirectUri(),
        source: 'database',
      };
    }
    return null;
  }

  isGoogleConfigured(): boolean {
    return this.getGoogleRuntimeConfig() !== null;
  }

  getProviderRuntimeConfig(providerId: string): OidcProviderRuntimeConfig | null {
    const id = providerId.trim().toLowerCase();
    if (id === GOOGLE_OIDC_PROVIDER) {
      const google = this.getGoogleRuntimeConfig();
      if (!google) {
        return null;
      }
      return {
        providerId: id,
        clientId: google.clientId,
        clientSecret: google.clientSecret,
        redirectUri: google.redirectUri,
      };
    }
    const row = this.getCachedRow(id);
    if (!row?.enabled || !row.clientId?.trim() || !row.clientSecret?.trim()) {
      return null;
    }
    const config: OidcProviderRuntimeConfig = {
      providerId: id,
      clientId: row.clientId.trim(),
      clientSecret: row.clientSecret.trim(),
      redirectUri: row.redirectUri?.trim() || getSuggestedOidcRedirectUri(id),
    };
    if (id === MICROSOFT_ENTRA_OIDC_PROVIDER_ID) {
      config.tenantId = parseMicrosoftEntraExtras(row.extrasJson).tenantId;
    }
    return config;
  }

  isProviderRuntimeConfigured(providerId: string): boolean {
    if (!isOidcLoginImplemented(providerId)) {
      return false;
    }
    return this.getProviderRuntimeConfig(providerId) !== null;
  }

  getEnabledProviderIds(): string[] {
    return listOidcProviderCatalog()
      .map((e) => e.id)
      .filter((id) => this.isProviderRuntimeConfigured(id));
  }

  getProviderFlags(): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    for (const entry of listOidcProviderCatalog()) {
      flags[entry.id] = this.isProviderRuntimeConfigured(entry.id);
    }
    return flags;
  }

  /** Owner/admin reveal only — never include in list payloads */
  getProviderClientSecret(providerId: string): string | null {
    const id = providerId.trim().toLowerCase();
    if (!isKnownOidcProviderId(id)) {
      return null;
    }
    this.refreshCache();
    const row =
      oidcProvidersRepository.getByProviderId(id) ?? this.getCachedRow(id);
    return row?.clientSecret?.trim() || null;
  }
}

export const oidcProviderService = OidcProviderService.getInstance();
