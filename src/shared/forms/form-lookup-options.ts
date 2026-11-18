import { getLabUserHeaders, labUserFetchInit } from '@/shared/composables/useLabUserHeaders';
import type { LookupContract } from '@/shared/types/forms-builder-integration';
import {
  type FormLookupConnector,
  resolveEffectiveDataFetch,
  resolveLookupFetchUrl,
} from './form-data-fetch';
import type { IFormRuntimeField } from './form-runtime-types';

export type LookupOption = { value: string; label: string };

const OPTION_CONTROL_TYPES = new Set(['Select', 'RadioButton', 'MultiSelect']);

export interface LookupFetchContext {
  hostAppId?: string;
}

/** Unwrap THE-LAB platform APIs (`{ success, data: [...] }`) and similar envelopes. */
export function normalizeLookupPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      return obj.data;
    }
    if (Array.isArray(obj.items)) {
      return obj.items;
    }
  }
  return [];
}

export function lookupFetchInit(context?: LookupFetchContext): RequestInit {
  if (context?.hostAppId) {
    return labUserFetchInit({
      headers: getLabUserHeaders({ 'X-Host-App-Id': context.hostAppId }),
    });
  }
  return labUserFetchInit();
}

function resolveLookupOptionPair(row: Record<string, unknown>): { value: string; label: string } | null {
  const id = row.id;
  const legacyValue = row.value;
  const explicitLabel = row.label ?? row.name;

  let optionValue: string | null = null;
  let optionLabel: string | null = null;

  if (id !== undefined && id !== null && legacyValue !== undefined && legacyValue !== null) {
    const idIsNumeric =
      typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id.trim()));
    if (idIsNumeric) {
      optionValue = String(legacyValue ?? id);
      optionLabel =
        explicitLabel != null
          ? String(explicitLabel)
          : formatConnectorStyleLookupLabel(row) ?? optionValue;
    } else if (typeof id === 'string' && typeof legacyValue === 'string' && legacyValue !== id) {
      // e.g. chart types: { id: "bar", value: "Bar" } — store id, show value as label
      optionValue = id;
      optionLabel = explicitLabel != null ? String(explicitLabel) : legacyValue;
    }
  }

  if (optionValue == null) {
    const raw = legacyValue ?? id;
    if (raw === undefined || raw === null) {
      return null;
    }
    optionValue = String(raw);
    optionLabel =
      explicitLabel != null
        ? String(explicitLabel)
        : formatConnectorStyleLookupLabel(row) ?? optionValue;
  }

  return { value: optionValue, label: optionLabel ?? optionValue };
}

function formatConnectorStyleLookupLabel(row: Record<string, unknown>): string | null {
  const appName = row.appName != null ? String(row.appName).trim() : '';
  const entityName = row.entityName != null ? String(row.entityName).trim() : '';
  if (appName && entityName) {
    return `${appName} — ${entityName}`;
  }
  const name = row.name != null ? String(row.name).trim() : '';
  return name || null;
}

/** Map connector lookup JSON arrays to select/radio option rows. */
export function mapLookupResponseToOptions(payload: unknown): LookupOption[] {
  const rows = normalizeLookupPayload(payload);

  const options: LookupOption[] = [];
  for (const item of rows) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const pair = resolveLookupOptionPair(item as Record<string, unknown>);
    if (pair) {
      options.push(pair);
    }
  }
  return options;
}

export async function fetchLookupOptions(
  connector: FormLookupConnector,
  config: LookupContract,
  context?: LookupFetchContext,
): Promise<LookupOption[]> {
  const url = config.endpoint?.url;
  if (!url) {
    return [];
  }

  const fullUrl = resolveLookupFetchUrl(connector, url);
  const response = await fetch(fullUrl, lookupFetchInit(context));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  return mapLookupResponseToOptions(data);
}

/** Resolve option counts per lookup property (live fetch, embedded response as fallback). */
export async function resolveLookupOptionCounts(
  connector: FormLookupConnector,
  context?: LookupFetchContext,
): Promise<Map<string, number>> {
  const lookups = connector.endpoints?.lookups ?? [];
  const counts = new Map<string, number>();

  await Promise.all(
    lookups.map(async (lookup) => {
      let count = 0;
      try {
        const options = await fetchLookupOptions(connector, lookup, context);
        count = options.length;
      } catch {
        const embedded = lookup.endpoint?.response;
        if (Array.isArray(embedded)) {
          count = embedded.length;
        }
      }
      counts.set(lookup.forProperty, count);
    }),
  );

  return counts;
}

export interface HydrateFormLookupsResult {
  components: IFormRuntimeField[];
  hydratedCount: number;
  errors: string[];
}

/**
 * Fetch connector lookup options for option controls when a form is loaded at runtime.
 */
export async function hydrateFormRuntimeLookups(
  components: IFormRuntimeField[],
  connector: FormLookupConnector,
  context?: LookupFetchContext,
): Promise<HydrateFormLookupsResult> {
  const lookups = connector.endpoints?.lookups ?? [];
  if (lookups.length === 0 || components.length === 0) {
    return { components, hydratedCount: 0, errors: [] };
  }

  const errors: string[] = [];
  const optionsByUrl = new Map<string, LookupOption[]>();
  let hydratedCount = 0;

  const next = await Promise.all(
    components.map(async (comp) => {
      const effective = resolveEffectiveDataFetch(comp, lookups);
      if (!effective?.endpoint) {
        return comp;
      }

      const dataFetchPatch: Pick<IFormRuntimeField, 'dataFetch'> = comp.dataFetch
        ? {}
        : {
            dataFetch: {
              forProperty: effective.forProperty,
              endpoint: effective.endpoint,
            },
          };

      if (!comp.type || !OPTION_CONTROL_TYPES.has(comp.type)) {
        return Object.keys(dataFetchPatch).length ? { ...comp, ...dataFetchPatch } : comp;
      }

      const embedded = effective.endpoint?.response;
      if (Array.isArray(embedded) && embedded.length > 0) {
        const options = mapLookupResponseToOptions(embedded);
        if (options.length > 0) {
          hydratedCount += 1;
          return {
            ...comp,
            ...dataFetchPatch,
            options,
          };
        }
      }

      const lookupUrl = effective.endpoint.url?.trim() ?? '';
      if (!lookupUrl) {
        return Object.keys(dataFetchPatch).length ? { ...comp, ...dataFetchPatch } : comp;
      }

      const cacheKey = lookupUrl;
      try {
        let options = optionsByUrl.get(cacheKey);
        if (!options) {
          options = await fetchLookupOptions(connector, effective, context);
          optionsByUrl.set(cacheKey, options);
        }

        if (options.length === 0) {
          return { ...comp, ...dataFetchPatch };
        }

        hydratedCount += 1;
        return {
          ...comp,
          ...dataFetchPatch,
          options,
        };
      } catch (error) {
        errors.push(`${comp.fieldKey}: ${String(error)}`);
        return { ...comp, ...dataFetchPatch };
      }
    }),
  );

  return { components: next, hydratedCount, errors };
}
