import {
  getLabPlatformAuthHeaders,
  labPlatformFetchInit,
} from '@/shared/composables/useLabPlatformAuth';

/** Browser → hybrid/server app APIs: same JWT as platform (D-02). */
export function getLabUserHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return getLabPlatformAuthHeaders(extra);
}

export function labUserFetchInit(init: RequestInit = {}): RequestInit {
  return labPlatformFetchInit(init);
}

export function labAppFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, labUserFetchInit(init));
}

/** POST JSON to app APIs (`labPlatformFetchInit` always sets `Content-Type: application/json`). */
export function labAppPost(
  input: RequestInfo | URL,
  body: Record<string, unknown> | unknown[] = {},
): Promise<Response> {
  return labAppFetch(input, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function useLabUserHeaders(): {
  getLabUserHeaders: typeof getLabUserHeaders;
  labUserFetchInit: typeof labUserFetchInit;
  labAppFetch: typeof labAppFetch;
} {
  return { getLabUserHeaders, labUserFetchInit, labAppFetch };
}
