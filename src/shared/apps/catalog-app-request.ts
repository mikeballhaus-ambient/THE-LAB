import { labAppFetch, labUserFetchInit } from '@/shared/composables/useLabUserHeaders';

/**
 * Hybrid/server catalog apps — authenticated fetch to app port (D-02).
 *
 * List GET routes return a **named envelope** (e.g. `{ trips: Trip[] }`), not a bare array.
 * Each app's `front-end/api.ts` must `.then((body) => body.<key> ?? [])` — see OKR `objectives`,
 * Travel `trips`, Time Tracking `entries`, etc.
 */
export async function catalogAppRequest<T>(
  base: string,
  path: string,
  errorLabel: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${base.replace(/\/$/, '')}${path}`;
  const res = await labAppFetch(url, labUserFetchInit(init));
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? detail;
    } catch {
      /* non-JSON */
    }
    throw new Error(`${errorLabel} request failed: ${detail}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
