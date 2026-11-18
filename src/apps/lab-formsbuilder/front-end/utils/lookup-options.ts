import type { DataConnector, DataFetchConfig, FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import {
  fetchLookupOptions as fetchLookupOptionsShared,
  hydrateFormRuntimeLookups,
  lookupFetchInit,
  mapLookupResponseToOptions,
  normalizeLookupPayload,
  resolveLookupOptionCounts as resolveLookupOptionCountsShared,
  type LookupOption,
} from '@/shared/forms/form-lookup-options';

export type { LookupOption };
export {
  normalizeLookupPayload,
  lookupFetchInit,
  mapLookupResponseToOptions,
};

export async function resolveLookupOptionCounts(connector: DataConnector): Promise<Map<string, number>> {
  return resolveLookupOptionCountsShared(connector);
}

export async function fetchLookupOptions(
  connector: DataConnector,
  config: DataFetchConfig,
): Promise<LookupOption[]> {
  return fetchLookupOptionsShared(connector, config);
}

export interface HydrateLookupsResult {
  components: FormComponent[];
  hydratedCount: number;
  errors: string[];
}

/**
 * For each canvas field with a connector lookup, fetch options and store on the component
 * (and attach `dataFetch` when matched by field key only).
 */
export async function hydrateFormComponentsWithLookups(
  components: FormComponent[],
  connector: DataConnector,
): Promise<HydrateLookupsResult> {
  const result = await hydrateFormRuntimeLookups(components, connector);
  return {
    components: result.components as FormComponent[],
    hydratedCount: result.hydratedCount,
    errors: result.errors,
  };
}

/** Fetch lookup options and attach `dataFetch` + `options` on one canvas field. */
export async function hydrateComponentWithLookupOptions(
  component: FormComponent,
  connector: DataConnector | null | undefined,
): Promise<FormComponent> {
  if (!connector) {
    return component;
  }

  const { components } = await hydrateFormRuntimeLookups([component], connector);
  return (components[0] ?? component) as FormComponent;
}
