import { labAppFetch } from '@/shared/composables/useLabUserHeaders';
import type { LoadedFormSchema } from './form-runtime-types';
import { clampFormGridColumns } from './form-layout';
import { prepareFormRuntimeFields } from './form-runtime-fields';
import type { FieldValidationRule } from './form-field-validation';
import type { FormLookupConnector } from './form-data-fetch';
import { hydrateFormRuntimeLookups } from './form-lookup-options';
import type { IFormRuntimeField } from './form-runtime-types';

const API_V1 = '/api/v1';

function apiUrl(serverUrl: string, path: string): string {
  const base = serverUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export interface LoadFormSchemaOptions {
  /** Host app registry id — forwarded as `X-Host-App-Id` on connector lookup fetches. */
  hostAppId?: string;
}

/** Stale stubs pointed chartType lookups at GET /charts (definitions), not enum options. */
function patchChartBuilderChartTypeLookups(
  components: IFormRuntimeField[],
  hostAppId?: string,
): IFormRuntimeField[] {
  if (hostAppId !== 'app-lab-chartbuilder' && hostAppId !== 'chart-builder') {
    return components;
  }
  return components.map((comp) => {
    if (comp.fieldKey !== 'chartType' || !comp.dataFetch || typeof comp.dataFetch !== 'object') {
      return comp;
    }
    const df = comp.dataFetch as { endpoint?: { url?: string } };
    const url = df.endpoint?.url ?? '';
    if (!url.includes('/api/connector/charts')) {
      return comp;
    }
    return {
      ...comp,
      dataFetch: {
        ...comp.dataFetch,
        endpoint: {
          ...(df.endpoint ?? { type: 'GET', data: {}, response: [] }),
          url: '',
        },
      },
    };
  });
}

/**
 * Load a published form schema for runtime rendering (host apps).
 * Layout fields (row, col, span, hAlign, vAlign) are on each component.
 * When the form has a linked data connector, lookup endpoints are fetched on load.
 */
export async function loadFormSchema(
  serverUrl: string,
  formKey: string,
  options?: LoadFormSchemaOptions,
): Promise<LoadedFormSchema> {
  const response = await labAppFetch(
    apiUrl(serverUrl, `${API_V1}/forms/load/${encodeURIComponent(formKey)}`),
  );
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = text || `Failed to load form (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      message = parsed.error ?? parsed.message ?? message;
    } catch {
      /* use raw text */
    }
    throw new Error(message);
  }
  const data = (await response.json()) as LoadedFormSchema;
  const validationRules = data.validationRules as Record<string, FieldValidationRule[]> | undefined;
  let components = prepareFormRuntimeFields(data.components ?? [], validationRules);
  components = patchChartBuilderChartTypeLookups(components, options?.hostAppId);

  const connector = data.dataConnecter as FormLookupConnector | null | undefined;
  if (connector?.endpoints?.lookups?.length) {
    const { components: hydrated } = await hydrateFormRuntimeLookups(components, connector, {
      hostAppId: options?.hostAppId,
    });
    components = hydrated;
  }

  return {
    ...data,
    components,
    columns: clampFormGridColumns(data.columns),
  };
}
