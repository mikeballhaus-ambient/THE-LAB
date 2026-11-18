import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';
import { buildPlatformServiceAuthHeaders } from '@/shared/services/platform-user-client.node';
import type { CrmManifestEntitySource } from '@/shared/lab-integrations/crm-integration-manifest-builder';
import type { CrmEntityIntegrationSyncResult } from '@/shared/types/schemas/crm-integration-sync-schema';
import type { EntityDefinition } from '../../shared/types/entity.types';
import { entityDefinitionToManifestSource } from '../utils/entity-manifest-source';
import { EntityDefinitionService } from './entity-definition-service';
import { isCrmProductEntityKey } from '@/shared/lab-integrations/crm-integration-manifest-builder';

async function postCrmIntegrationSync(
  actorUserId: number,
  body: {
    entities: CrmManifestEntitySource[];
    provisionEntityKeys?: string[];
    removeEntityKeys?: string[];
  },
): Promise<CrmEntityIntegrationSyncResult> {
  const base = resolvePlatformBackendUrl();
  const response = await fetch(`${base}/api/platform/lab-integrations/crm/sync-entities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildPlatformServiceAuthHeaders(actorUserId),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload: { success?: boolean; data?: CrmEntityIntegrationSyncResult; message?: string };
  try {
    payload = JSON.parse(text) as typeof payload;
  } catch {
    throw new Error(`CRM integration sync failed (${response.status}): ${text.slice(0, 200)}`);
  }
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(
      payload.message ?? `CRM integration sync failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }
  return payload.data;
}

export async function syncCrmIntegrationsAfterEntityChange(
  actorUserId: number,
  options: { provisionEntityKeys?: string[] } = {},
): Promise<CrmEntityIntegrationSyncResult> {
  const definitions = await EntityDefinitionService.getInstance().listDefinitions();
  const entities = definitions.map(entityDefinitionToManifestSource);
  return postCrmIntegrationSync(actorUserId, {
    entities,
    provisionEntityKeys: options.provisionEntityKeys,
  });
}

export async function syncCrmIntegrationsOnStartup(actorUserId: number): Promise<void> {
  const definitions = await EntityDefinitionService.getInstance().listDefinitions();
  const provisionEntityKeys = definitions
    .filter((def) => isCrmProductEntityKey(def.entityKey))
    .map((def) => def.entityKey);
  await syncCrmIntegrationsAfterEntityChange(actorUserId, { provisionEntityKeys });
}

export async function syncCrmIntegrationsForNewEntity(
  actorUserId: number,
  _definition: EntityDefinition,
): Promise<CrmEntityIntegrationSyncResult> {
  return syncCrmIntegrationsAfterEntityChange(actorUserId, {
    provisionEntityKeys: [_definition.entityKey],
  });
}

export async function syncCrmIntegrationsAfterEntityRemoved(
  actorUserId: number,
  entityKey: string,
): Promise<CrmEntityIntegrationSyncResult> {
  const definitions = await EntityDefinitionService.getInstance().listDefinitions();
  const entities = definitions.map(entityDefinitionToManifestSource);
  return postCrmIntegrationSync(actorUserId, {
    entities,
    removeEntityKeys: [entityKey],
  });
}
