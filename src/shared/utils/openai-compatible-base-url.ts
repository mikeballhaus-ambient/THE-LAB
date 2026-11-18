const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1';
export const DEFAULT_LM_STUDIO_BASE = 'http://127.0.0.1:1234';

/** LM Studio server root, e.g. `http://10.0.0.216:1234` (native REST, not OpenAI `/v1`). */
export function sanitizeLmStudioBaseUrl(baseUrl?: string): string {
  const trimmed = baseUrl?.trim();
  if (!trimmed) {
    return DEFAULT_LM_STUDIO_BASE;
  }
  let url = trimmed.replace(/\/+$/, '');
  if (url.endsWith('/v1')) {
    url = url.slice(0, -'/v1'.length);
    url = url.replace(/\/+$/, '');
  }
  return url;
}

/**
 * OpenAI SDK base URL exactly as configured (trimmed). User must supply the full endpoint
 * (e.g. `https://api.openai.com/v1` or `http://host:1234/v1`). Empty uses cloud default.
 */
export function normalizeOpenAiCompatibleBaseUrl(baseUrl?: string): string {
  const trimmed = baseUrl?.trim();
  if (!trimmed) {
    return DEFAULT_OPENAI_BASE;
  }
  return trimmed.replace(/\/+$/, '');
}
