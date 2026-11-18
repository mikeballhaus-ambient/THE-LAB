import { labAppFetch } from '@/shared/composables/useLabUserHeaders';

export const API_V1_PREFIX = '/api/v1';

export function apiUrl(serverUrl: string, path: string): string {
  const base = serverUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return labAppFetch(input, init);
}

function errorMessageFromResponseBody(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return `HTTP ${status}`;
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        return parsed.error.trim();
      }
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      /* use raw text */
    }
  }
  return trimmed;
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(errorMessageFromResponseBody(text, response.status));
  }
  return response.json() as Promise<T>;
}
