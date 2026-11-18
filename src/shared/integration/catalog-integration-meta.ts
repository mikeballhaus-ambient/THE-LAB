import { catalogHostDef } from '@/shared/lab-integrations/catalog-manifests';

export interface CatalogEntityIntegrationMeta {
  entityKey: string;
  idContextKey: string;
  parentContextKeys: string[];
  slots: {
    create: string;
    edit: string;
    delete: string;
  };
}

export interface CatalogIntegrationMeta {
  hostAppId: string;
  surfaceId: string;
  entities: CatalogEntityIntegrationMeta[];
  primary: CatalogEntityIntegrationMeta;
}

function entityMetaFromDef(
  entity: NonNullable<ReturnType<typeof catalogHostDef>>['entities'][number],
): CatalogEntityIntegrationMeta {
  return {
    entityKey: entity.entityKey,
    idContextKey: entity.idContextKey,
    parentContextKeys: entity.parentContextKeys ?? [],
    slots: {
      create: `${entity.entityKey}.create.dialog`,
      edit: `${entity.entityKey}.edit.dialog`,
      delete: `${entity.entityKey}.delete.dialog`,
    },
  };
}

export function getCatalogIntegrationMeta(hostAppId: string): CatalogIntegrationMeta | null {
  const def = catalogHostDef(hostAppId);
  if (!def?.entities.length) {
    return null;
  }
  const entities = def.entities.map(entityMetaFromDef);
  return {
    hostAppId: def.hostAppId,
    surfaceId: def.surfaceId,
    entities,
    primary: entities[0],
  };
}

/** @deprecated Prefer getCatalogIntegrationMeta().primary */
export function getCatalogPrimaryIntegrationMeta(hostAppId: string) {
  const meta = getCatalogIntegrationMeta(hostAppId);
  if (!meta) {
    return null;
  }
  return {
    hostAppId: meta.hostAppId,
    surfaceId: meta.surfaceId,
    idContextKey: meta.primary.idContextKey,
    slots: meta.primary.slots,
  };
}

export function getCatalogEntityMeta(
  hostAppId: string,
  entityKey: string,
): CatalogEntityIntegrationMeta | null {
  const meta = getCatalogIntegrationMeta(hostAppId);
  return meta?.entities.find((row) => row.entityKey === entityKey) ?? null;
}
