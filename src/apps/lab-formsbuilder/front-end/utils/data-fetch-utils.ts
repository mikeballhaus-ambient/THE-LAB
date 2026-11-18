import type { DataFetchConfig, FormComponent, LookupContract } from '@/apps/lab-formsbuilder/shared/types';
import {
  resolveConnectorApiBaseUrl,
  resolveLookupFetchUrl,
  resolveEffectiveDataFetch as resolveEffectiveDataFetchShared,
  type FormLookupFieldRef,
} from '@/shared/forms/form-data-fetch';

export { resolveConnectorApiBaseUrl, resolveLookupFetchUrl };

/** Resolved lookup for a field: explicit `dataFetch` or connector lookup matching `fieldKey`. */
export function resolveEffectiveDataFetch(
  component: FormComponent | null | undefined,
  connectorLookups: LookupContract[] = [],
): DataFetchConfig | undefined {
  return resolveEffectiveDataFetchShared(component as FormLookupFieldRef, connectorLookups) as
    | DataFetchConfig
    | undefined;
}
