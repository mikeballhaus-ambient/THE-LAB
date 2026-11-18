export const MICROSOFT_ENTRA_OIDC_PROVIDER_ID = 'microsoft-entra';

export interface MicrosoftEntraOidcExtras {
  tenantId: string;
}

export function parseMicrosoftEntraExtras(
  extrasJson: string | null | undefined,
): MicrosoftEntraOidcExtras {
  if (!extrasJson?.trim()) {
    return { tenantId: 'common' };
  }
  try {
    const parsed = JSON.parse(extrasJson) as { tenantId?: string };
    const tenantId = parsed.tenantId?.trim() || 'common';
    return { tenantId };
  } catch {
    return { tenantId: 'common' };
  }
}

export function serializeMicrosoftEntraExtras(tenantId: string | undefined): string {
  const normalized = tenantId?.trim() || 'common';
  return JSON.stringify({ tenantId: normalized });
}

export function isValidEntraTenantId(tenantId: string): boolean {
  const value = tenantId.trim();
  if (!value) {
    return false;
  }
  const lowered = value.toLowerCase();
  if (lowered === 'common' || lowered === 'organizations' || lowered === 'consumers') {
    return true;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
