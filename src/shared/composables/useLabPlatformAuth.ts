const LAB_ACCESS_TOKEN_STORAGE_KEY = 'lab_access_token';

let labAccessToken: string | null = null;
let labSessionId: string | null = null;

if (typeof window !== 'undefined') {
  try {
    const stored = sessionStorage.getItem(LAB_ACCESS_TOKEN_STORAGE_KEY);
    if (stored?.trim()) {
      labAccessToken = stored.trim();
    }
  } catch {
    /* ignore storage errors */
  }
}

export function setLabAccessToken(token: string | null): void {
  labAccessToken = token;
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (token?.trim()) {
      sessionStorage.setItem(LAB_ACCESS_TOKEN_STORAGE_KEY, token.trim());
    } else {
      sessionStorage.removeItem(LAB_ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    /* ignore storage errors */
  }
}

export function getLabAccessToken(): string | null {
  return labAccessToken;
}

/** Client-only: read `sub` from JWT payload (no signature verify). */
export function getLabUserIdFromAccessToken(): number | null {
  const token = getLabAccessToken();
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64)) as { sub?: number | string };
    const sub = json.sub;
    const id =
      typeof sub === 'number'
        ? sub
        : typeof sub === 'string' && /^\d+$/.test(sub)
          ? Number(sub)
          : NaN;
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function setLabSessionId(sessionId: string | null): void {
  labSessionId = sessionId;
}

export function getLabSessionId(): string | null {
  return labSessionId;
}

export function getLabPlatformAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (labAccessToken) {
    headers.Authorization = `Bearer ${labAccessToken}`;
  }
  return headers;
}

export function labPlatformFetchInit(
  init: RequestInit = {},
): RequestInit {
  const method = (init.method ?? 'GET').toUpperCase();
  // Auth headers always include Content-Type: application/json; Fastify rejects POST with
  // that header and an empty body (FST_ERR_CTP_EMPTY_JSON_BODY) — e.g. connector verify.
  let body = init.body;
  if (body == null && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    body = '{}';
  }
  return {
    ...init,
    body,
    credentials: 'include',
    headers: {
      ...getLabPlatformAuthHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  };
}
