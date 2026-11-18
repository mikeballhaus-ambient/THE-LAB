import { labIntegrationsHubService } from '../lab-integrations/lab-integrations-hub-service';
import { resolveIntegrationAppIdForService } from '@/shared/lab-integrations/resolve-integration-connector-server-url';
import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';
import type { User } from '@/shared/types/user';

function substituteIdInUrl(path: string, id: string | number): string {
  return path.replace(':id', encodeURIComponent(String(id)));
}

function discoveryContract(actor: User, providerAppId: string, serviceId: string): FormsBuilderContract {
  const connectorAppId = resolveIntegrationAppIdForService(providerAppId, serviceId);
  return labIntegrationsHubService.getRegistryDiscoveryForCaller(actor, connectorAppId, serviceId);
}

async function connectorRequest(
  absoluteUrl: string,
  method: string,
  actorUserId: number,
  body?: Record<string, unknown>,
): Promise<Response> {
  const headers: Record<string, string> = {
    'x-lab-app-service-token': resolveLabAppServiceToken(),
    'x-lab-user-id': String(actorUserId),
  };
  if (body != null) {
    headers['content-type'] = 'application/json';
  }
  return fetch(absoluteUrl, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
}

function absoluteCrudUrl(contract: FormsBuilderContract, relativePath: string): string {
  const base = contract.endpoints.baseUrl.replace(/\/$/, '');
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

/** Upper bound on records a requirement sweep reads in one tick. */
export const LAB_INTEGRATION_LIST_PAGE_CAP = 500;

export interface IntegrationRecordList {
  records: Record<string, unknown>[];
  /**
   * True when the connector returned more rows than the cap.
   *
   * Surfaced rather than swallowed: a truncated list means a requirement silently stops noticing
   * records past the cap, which looks exactly like "this app has nothing due". The sweep logs it.
   */
  truncated: boolean;
}

/**
 * List a provider's records through its discovery contract (phase 33).
 *
 * `crud.getAll` already existed on the contract — `fetchIntegrationRecord` reads one row — but the
 * requirement sweep needs the whole set. Two properties matter here:
 *
 * - The connector returns a **bare array**, not an envelope, so a shape check is part of the
 *   contract rather than an assumption at the call site.
 * - The list is capped **client-side**. The connector route takes no paging parameters, so a cap on
 *   the request would be a fiction; truncating what arrived and saying so is honest, and keeps one
 *   runaway table from turning a 60-second tick into a multi-minute one.
 */
export async function listIntegrationRecords(
  actor: User,
  providerAppId: string,
  serviceId: string,
  cap: number = LAB_INTEGRATION_LIST_PAGE_CAP,
): Promise<IntegrationRecordList> {
  const contract = discoveryContract(actor, providerAppId, serviceId);
  const url = absoluteCrudUrl(contract, contract.endpoints.crud.getAll.url);
  const response = await connectorRequest(url, contract.endpoints.crud.getAll.type, actor.userId);
  if (!response.ok) {
    throw new Error(`Integration list failed (${response.status}) for ${serviceId}`);
  }
  const json = (await response.json()) as unknown;
  if (!Array.isArray(json)) {
    throw new Error(`Integration list for ${serviceId} did not return an array`);
  }
  const rows = json.filter(
    (row): row is Record<string, unknown> => row != null && typeof row === 'object',
  );
  if (rows.length <= cap) {
    return { records: rows, truncated: false };
  }
  return { records: rows.slice(0, cap), truncated: true };
}

export async function fetchIntegrationRecord(
  actor: User,
  providerAppId: string,
  serviceId: string,
  recordId: string | number,
): Promise<Record<string, unknown> | null> {
  const contract = discoveryContract(actor, providerAppId, serviceId);
  const url = absoluteCrudUrl(contract, substituteIdInUrl(contract.endpoints.crud.get.url, recordId));
  const response = await connectorRequest(url, 'GET', actor.userId);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Integration GET failed (${response.status}) for ${serviceId}`);
  }
  const json = (await response.json()) as unknown;
  if (json == null || typeof json !== 'object') {
    return null;
  }
  return json as Record<string, unknown>;
}

export async function createIntegrationRecord(
  actor: User,
  providerAppId: string,
  serviceId: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const contract = discoveryContract(actor, providerAppId, serviceId);
  const url = absoluteCrudUrl(contract, contract.endpoints.crud.create.url);
  const response = await connectorRequest(url, contract.endpoints.crud.create.type, actor.userId, body);
  if (!response.ok) {
    throw new Error(`Integration create failed (${response.status}) for ${serviceId}`);
  }
  const json = (await response.json()) as unknown;
  if (json == null || typeof json !== 'object') {
    return {};
  }
  return json as Record<string, unknown>;
}

export async function updateIntegrationRecord(
  actor: User,
  providerAppId: string,
  serviceId: string,
  recordId: string | number,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const contract = discoveryContract(actor, providerAppId, serviceId);
  const url = absoluteCrudUrl(
    contract,
    substituteIdInUrl(contract.endpoints.crud.update.url, recordId),
  );
  const response = await connectorRequest(url, contract.endpoints.crud.update.type, actor.userId, body);
  if (!response.ok) {
    throw new Error(`Integration update failed (${response.status}) for ${serviceId}`);
  }
  const json = (await response.json()) as unknown;
  if (json == null || typeof json !== 'object') {
    return {};
  }
  return json as Record<string, unknown>;
}

/**
 * Delete a record through a catalog app's discovery contract (W9).
 *
 * A `404` is treated as success: the workflow's intent was "this record should not exist", and it
 * already does not. Failing on it would make a delete node unusable after a manual cleanup and would
 * cause a retry to fail forever on a record it had already removed.
 */
export async function deleteIntegrationRecord(
  actor: User,
  providerAppId: string,
  serviceId: string,
  recordId: string | number,
): Promise<{ deleted: boolean; alreadyAbsent: boolean }> {
  const contract = discoveryContract(actor, providerAppId, serviceId);
  const url = absoluteCrudUrl(
    contract,
    substituteIdInUrl(contract.endpoints.crud.delete.url, recordId),
  );
  const response = await connectorRequest(url, contract.endpoints.crud.delete.type, actor.userId);
  if (response.status === 404) {
    return { deleted: false, alreadyAbsent: true };
  }
  if (!response.ok) {
    throw new Error(`Integration delete failed (${response.status}) for ${serviceId}`);
  }
  return { deleted: true, alreadyAbsent: false };
}
