import type { ProviderConfigBase } from '../../../../shared/types';
import { sanitizeLmStudioBaseUrl } from '../../../../shared/utils/openai-compatible-base-url';

export function getLmStudioServerRoot(baseUrl?: string): string {
  return sanitizeLmStudioBaseUrl(baseUrl);
}

export async function lmStudioRequest(
  config: ProviderConfigBase,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const root = getLmStudioServerRoot(config.baseUrl);
  const url = `${root}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: 'application/json, text/event-stream',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (config.apiKey?.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  }
  return fetch(url, { ...init, headers });
}

export interface LmStudioV1Model {
  type?: 'llm' | 'embedding';
  key?: string;
  loaded_instances?: Array<{ id?: string }>;
}

export interface LmStudioV1ModelsResponse {
  models?: LmStudioV1Model[];
}

export interface LmStudioV0ModelsResponse {
  data?: Array<{ id?: string }>;
}

/** Model ids usable in chat/embed config (catalog keys + loaded instance ids). */
export function collectModelIdsFromV1(body: LmStudioV1ModelsResponse): string[] {
  const ids: string[] = [];
  for (const model of body.models ?? []) {
    if (model.key) {
      ids.push(model.key);
    }
    for (const instance of model.loaded_instances ?? []) {
      if (instance.id) {
        ids.push(instance.id);
      }
    }
  }
  return [...new Set(ids)];
}

export async function listLmStudioModelIds(config: ProviderConfigBase): Promise<string[]> {
  const v1 = await lmStudioRequest(config, '/api/v1/models');
  if (v1.ok) {
    const body = (await v1.json()) as LmStudioV1ModelsResponse;
    return collectModelIdsFromV1(body);
  }

  const v0 = await lmStudioRequest(config, '/api/v0/models');
  if (!v0.ok) {
    const text = await v0.text();
    throw new Error(`LM Studio models list failed (${v0.status}): ${text}`);
  }
  const body = (await v0.json()) as LmStudioV0ModelsResponse;
  return (body.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
}
