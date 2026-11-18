/**
 * Outbound connector requests from Chart Builder.
 *
 * Chart Builder runs on its own port and reads other catalog apps over HTTP. Those apps sit
 * behind `registerLabAppHttpAuth`, which rejects unauthenticated calls with 401 — so a chart
 * whose connector points at `http://localhost:4120/...` failed with `connector_http_401`
 * before a single row was read.
 *
 * Two rules keep that safe:
 *
 * 1. The platform service token is only attached for **loopback / platform-host** URLs. A
 *    discovery URL may point anywhere; sending `LAB_APP_SERVICE_TOKEN` to a third-party host
 *    would leak the platform secret.
 * 2. The token is only useful together with `x-lab-user-id`, so a missing acting user means
 *    no auth headers rather than a guaranteed 401.
 */
import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    host === '0.0.0.0'
  );
}

function platformHostname(): string {
  const raw = process.env.BACKEND_URL ?? process.env.VITE_API_BASE_URL ?? '';
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** True when the URL belongs to this lab (loopback or the configured platform host). */
export function isLabLocalUrl(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  if (isLoopbackHost(hostname)) {
    return true;
  }
  const platformHost = platformHostname();
  return platformHost !== '' && hostname === platformHost;
}

/**
 * Auth headers for an outbound connector call, or `{}` when the target is not a lab host or
 * no acting user is known.
 */
export function buildConnectorRequestHeaders(
  url: string,
  actorUserId: number | null | undefined,
): Record<string, string> {
  if (actorUserId == null || actorUserId < 1 || !isLabLocalUrl(url)) {
    return {};
  }
  let token: string;
  try {
    token = resolveLabAppServiceToken();
  } catch {
    // Production profile without a configured token — let the request fail on its own rather
    // than sending a placeholder secret.
    return {};
  }
  return {
    'x-lab-app-service-token': token,
    'x-lab-user-id': String(actorUserId),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/**
 * Hub discovery wraps its payload as `{ success, data: { contract } }`; catalog app discovery
 * returns the contract bare. Both shapes are accepted here.
 */
export function unwrapDiscoveryContract(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }
  const data = asRecord(root.data);
  const nested = data ? asRecord(data.contract) : null;
  if (nested) {
    return nested;
  }
  if (data && 'endpoints' in data) {
    return data;
  }
  return 'endpoints' in root ? root : null;
}

/**
 * Resolve the rows URL from a discovery contract.
 *
 * Provisioned connectors store the **discovery** URL, so charts used to fetch a contract and
 * then try to read rows out of it (always empty). The contract itself advertises where the
 * rows live: `endpoints.crud.getAll`.
 */
export function resolveConnectorRowsUrl(discoveryUrl: string, contract: unknown): string {
  const record = unwrapDiscoveryContract(contract);
  const endpoints = asRecord(record?.endpoints);
  if (!endpoints) {
    return discoveryUrl;
  }
  const baseUrl = typeof endpoints.baseUrl === 'string' ? endpoints.baseUrl.replace(/\/$/, '') : '';
  const crud = asRecord(endpoints.crud);
  const getAll = asRecord(crud?.getAll);
  const relative = typeof getAll?.url === 'string' ? getAll.url : '';
  if (!relative) {
    return discoveryUrl;
  }
  if (/^https?:\/\//i.test(relative)) {
    return relative;
  }
  const origin = baseUrl || originOf(discoveryUrl);
  if (!origin) {
    return discoveryUrl;
  }
  return `${origin}${relative.startsWith('/') ? relative : `/${relative}`}`;
}

function originOf(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}
