import { isPlatformHostedIntegrationServiceId } from '@/shared/lab-integrations/platform-integration-service-ids';
import { PROTECTED_PLATFORM_APP_IDS } from '@/shared/types/app/protected-apps';

/**
 * Peer app server URLs, keyed by registry app id (`app-lab-crm`, `app-okr-goals`, …).
 *
 * Resolution is registry-driven: callers pass the peer URLs they have, and the provider is
 * identified by comparing the integration `serviceId` prefix against those keys. No port
 * and no app id is hardcoded here.
 *
 * The one non-obvious part is key normalization — provider slugs and registry ids do not
 * line up textually:
 *
 * ```
 * serviceId prefix   registry app id        match key
 * crm                app-lab-crm            crm
 * task-list          app-lab-tasklist       tasklist
 * help-desk          app-lab-helpdesk       helpdesk
 * okr-goals          app-okr-goals          okrgoals
 * ```
 *
 * Stripping non-alphanumerics from both sides collapses all four cases without a lookup table.
 */
export type IntegrationConnectorPeerUrls = Readonly<Record<string, string | undefined>>;

/**
 * @deprecated Use {@link IntegrationConnectorPeerUrls}. Kept for callers still passing the
 * legacy `{ taskList, helpDesk, platform }` shape; normalised by {@link normalizePeerUrls}.
 */
export interface IntegrationConnectorServerUrlPeers {
  taskList?: string;
  helpDesk?: string;
  /** Main backend (:3000) for platform-tier connectors from app hosts (e.g. CRM). */
  platform?: string;
}

export type PeerUrlInput =
  | IntegrationConnectorPeerUrls
  | IntegrationConnectorServerUrlPeers
  | undefined;

/**
 * Collapse an app id or service slug to a comparison key.
 *
 * Strips the registry prefixes (`app-`, `lab-`) before removing separators, so all of
 * `app-lab-tasklist`, `lab-tasklist`, and `task-list` reduce to `tasklist`.
 */
export function toMatchKey(value: string): string {
  let key = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  // Repeatedly strip registry prefixes so `app-lab-app-builder` and `app-builder` agree.
  for (;;) {
    if (key.startsWith('app') && key.length > 3) {
      key = key.slice(3);
      continue;
    }
    if (key.startsWith('lab') && key.length > 3) {
      key = key.slice(3);
      continue;
    }
    break;
  }
  return key;
}

/**
 * Accepts either the registry-keyed map or the legacy `{ taskList, helpDesk, platform }`
 * shape and returns a normalized registry-keyed map.
 */
export function normalizePeerUrls(peers: PeerUrlInput): Record<string, string> {
  const out: Record<string, string> = {};
  if (!peers) {
    return out;
  }

  for (const [key, value] of Object.entries(peers)) {
    const url = typeof value === 'string' ? value.trim().replace(/\/$/, '') : '';
    if (!url) {
      continue;
    }
    out[toMatchKey(key)] = url;
  }

  return out;
}

/**
 * Resolve a peer URL by integration `serviceId`.
 *
 * The service id is prefixed with the provider slug (`crm.contacts`, `task-list.tasks`, …),
 * so the prefix identifies the provider without a hardcoded app-id table.
 */
export function resolvePeerUrlForService(
  serviceId: string | undefined,
  normalizedPeers: Record<string, string>,
): string | undefined {
  if (!serviceId) {
    return undefined;
  }
  const prefix = serviceId.split('.')[0]?.trim();
  if (!prefix) {
    return undefined;
  }
  return normalizedPeers[toMatchKey(prefix)];
}

/**
 * Map an integration `serviceId` to the registry app id that owns its `/api/connector/*`.
 *
 * Resolution order:
 * 1. An injected resolver (production callers pass the live app registry) — keeps this
 *    module free of hardcoded ids.
 * 2. Match against the known platform product app ids.
 * 3. `app-{prefix}` for catalog apps, whose slugs equal their registry suffix.
 */
export function resolveIntegrationAppIdForService(
  hostAppId: string,
  serviceId: string | undefined,
  resolveRegisteredAppId?: (matchKey: string) => string | undefined,
): string {
  if (!serviceId?.trim()) {
    return hostAppId;
  }
  const prefix = serviceId.split('.')[0]?.trim();
  if (!prefix) {
    return hostAppId;
  }

  const matchKey = toMatchKey(prefix);

  const fromRegistry = resolveRegisteredAppId?.(matchKey);
  if (fromRegistry) {
    return fromRegistry;
  }

  for (const appId of PROTECTED_PLATFORM_APP_IDS) {
    if (toMatchKey(appId) === matchKey) {
      return appId;
    }
  }

  return prefix.startsWith('app-') ? prefix : `app-${prefix}`;
}

/**
 * Resolve the base URL for a bound integration connector's CRUD calls.
 *
 * Order:
 * 1. Platform-hosted services → `:3000` (the `platform` peer).
 * 2. A peer URL whose app id matches the service's provider slug → that URL.
 * 3. The host app's own server URL (provider lives in the host, or no peer configured).
 */
export function resolveIntegrationConnectorServerUrl(
  serviceId: string | undefined,
  hostServerUrl: string,
  peers?: PeerUrlInput,
): string {
  const normalized = normalizePeerUrls(peers);

  if (isPlatformHostedIntegrationServiceId(serviceId)) {
    return normalized.platform ?? hostServerUrl.replace(/\/$/, '');
  }

  return (
    resolvePeerUrlForService(serviceId, normalized) ?? hostServerUrl.replace(/\/$/, '')
  );
}
