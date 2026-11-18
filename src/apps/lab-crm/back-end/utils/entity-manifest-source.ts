import type { EntityDefinition } from '../../shared/types/entity.types';
import type { CrmManifestEntitySource } from '@/shared/lab-integrations/crm-integration-manifest-builder';

export function entityDefinitionToManifestSource(def: EntityDefinition): CrmManifestEntitySource {
  return {
    entityKey: def.entityKey,
    name: def.name,
    description: def.description,
    properties: def.properties,
  };
}
