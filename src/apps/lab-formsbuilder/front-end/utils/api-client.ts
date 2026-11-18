import type { DataConnector, FormSchema } from '@/apps/lab-formsbuilder/shared/types';
import { labAppFetch } from '@/shared/composables/useLabUserHeaders';

export const API_V1_PREFIX = '/api/v1';

export function apiUrl(serverUrl: string, path: string): string {
  const base = serverUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/** Authenticated fetch to the Forms Builder app server (Bearer JWT from THE-LAB login). */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return labAppFetch(input, init);
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const textFn = response.text?.bind(response);
    const text = textFn ? await textFn() : '';
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function parseFormsList(data: unknown): {
  forms: FormSchema[];
  total: number;
  limit: number;
  offset: number;
} {
  if (Array.isArray(data)) {
    return { forms: data as FormSchema[], total: data.length, limit: data.length, offset: 0 };
  }
  const record = data as Record<string, unknown>;
  return {
    forms: (record.forms as FormSchema[]) ?? [],
    total: Number(record.total ?? 0),
    limit: Number(record.limit ?? 50),
    offset: Number(record.offset ?? 0),
  };
}

const FORMS_LIST_PAGE_SIZE = 100;

/** Load every form row (API defaults to limit 50). */
export async function fetchAllForms(serverUrl: string, signal?: AbortSignal): Promise<FormSchema[]> {
  const collected: FormSchema[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const path = `${API_V1_PREFIX}/forms?limit=${FORMS_LIST_PAGE_SIZE}&offset=${offset}`;
    const response = await apiFetch(apiUrl(serverUrl, path), { signal });
    const parsed = parseFormsList(await parseJsonResponse<unknown>(response));
    collected.push(...parsed.forms);
    total = parsed.total;
    offset += parsed.forms.length;
    if (parsed.forms.length === 0) {
      break;
    }
  }

  return collected;
}

export function parseConnectorsList(data: unknown): DataConnector[] {
  if (Array.isArray(data)) {
    return data as DataConnector[];
  }
  const record = data as { connectors?: DataConnector[] };
  return record.connectors ?? [];
}
