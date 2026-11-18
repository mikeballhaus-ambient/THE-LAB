import type { LookupContract } from '@/shared/types/forms-builder-integration';

/** Minimal connector shape for lookup URL resolution at runtime. */
export interface FormLookupConnector {
  discoveryUrl?: string | null;
  endpoints?: {
    baseUrl?: string;
    lookups?: LookupContract[];
  } | null;
}

export interface FormLookupFieldRef {
  fieldKey?: string;
  dataFetch?: unknown;
}

/** Origin of the connector app (from contract `endpoints.baseUrl` or discovery URL). */
export function resolveConnectorApiBaseUrl(connector: FormLookupConnector | null | undefined): string {
  if (!connector) {
    return '';
  }

  const fromContract = connector.endpoints?.baseUrl?.trim();
  if (fromContract) {
    return fromContract.replace(/\/$/, '');
  }

  const discovery = connector.discoveryUrl?.trim();
  if (!discovery) {
    return '';
  }

  try {
    const parsed = new URL(discovery);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

/** Build absolute URL for a lookup path relative to the connector app. */
export function resolveLookupFetchUrl(
  connector: FormLookupConnector | null | undefined,
  lookupPath: string,
): string {
  const path = lookupPath.trim();
  if (!path) {
    return '';
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = resolveConnectorApiBaseUrl(connector);
  if (!base) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Resolved lookup for a field: explicit `dataFetch` or connector lookup matching `fieldKey`. */
export function resolveEffectiveDataFetch(
  component: FormLookupFieldRef | null | undefined,
  connectorLookups: LookupContract[] = [],
): LookupContract | undefined {
  if (!component) {
    return undefined;
  }

  const df = component.dataFetch;
  if (df && typeof df === 'object') {
    const row = df as { forProperty?: string; endpoint?: LookupContract['endpoint'] };
    const endpoint = row.endpoint;
    const hasEndpoint = Boolean(endpoint?.url);
    const hasProperty = Boolean(row.forProperty);
    if (hasEndpoint || hasProperty) {
      return {
        forProperty: row.forProperty ?? component.fieldKey ?? '',
        endpoint: endpoint ?? { url: '', type: 'GET', data: {}, response: [] },
      };
    }
  }

  const key = component.fieldKey?.trim();
  if (!key || connectorLookups.length === 0) {
    return undefined;
  }

  const matched = connectorLookups.find((l) => l.forProperty === key);
  if (!matched) {
    return undefined;
  }

  return matched;
}
