import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import type { EntityDefinition, EntityProperty } from '../../shared/types/entity.types';
import {
  findDefinitionsReferencingEntity,
  validateCreateDefinitionInput,
  validateLookupDisplaySettings,
  validateUpdateDefinitionInput,
} from './entity-definition-validation';

interface DefinitionRow {
  id: number;
  entity_key: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  properties_json: string;
  lookup_display_property?: string | null;
  lookup_display_format?: string | null;
  is_system: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DefinitionRow): EntityDefinition {
  return {
    id: row.id,
    entityKey: row.entity_key,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    sortOrder: row.sort_order,
    properties: JSON.parse(row.properties_json) as EntityProperty[],
    lookupDisplayProperty: row.lookup_display_property ?? undefined,
    lookupDisplayFormat: row.lookup_display_format ?? undefined,
    isSystem: row.is_system === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class EntityDefinitionService {
  private static instance: EntityDefinitionService | null = null;

  public static getInstance(): EntityDefinitionService {
    if (!this.instance) {
      this.instance = new EntityDefinitionService();
    }
    return this.instance;
  }

  private get proxy(): AppDatabaseServiceProxy {
    return AppDatabaseServiceProxy.getInstance();
  }

  async listDefinitions(): Promise<EntityDefinition[]> {
    const result = await this.proxy.select({
      sql: 'SELECT * FROM entity_definitions ORDER BY sort_order ASC, name ASC',
      params: [],
    });
    return (result.rows as DefinitionRow[]).map(mapRow);
  }

  /**
   * Sets navigation sort_order to 1..n following the given entity key sequence.
   */
  async reorderDefinitions(
    entityKeys: string[],
  ): Promise<{ definitions?: EntityDefinition[]; errors?: string[] }> {
    const all = await this.listDefinitions();
    if (entityKeys.length !== all.length) {
      return {
        errors: [`Expected ${all.length} entity keys, received ${entityKeys.length}`],
      };
    }
    const known = new Set(all.map((d) => d.entityKey));
    const seen = new Set<string>();
    for (const key of entityKeys) {
      if (!known.has(key)) {
        return { errors: [`Unknown entity key: ${key}`] };
      }
      if (seen.has(key)) {
        return { errors: [`Duplicate entity key: ${key}`] };
      }
      seen.add(key);
    }

    const now = new Date().toISOString();
    for (let i = 0; i < entityKeys.length; i++) {
      await this.proxy.update({
        tableName: 'entity_definitions',
        data: { sort_order: i + 1, updated_at: now },
        where: { entity_key: entityKeys[i] },
      });
    }
    return { definitions: await this.listDefinitions() };
  }

  async getByEntityKey(entityKey: string): Promise<EntityDefinition | null> {
    const result = await this.proxy.select({
      sql: 'SELECT * FROM entity_definitions WHERE entity_key = ? LIMIT 1',
      params: [entityKey],
      limit: 1,
    });
    const row = result.rows[0] as DefinitionRow | undefined;
    return row ? mapRow(row) : null;
  }

  async getById(id: number): Promise<EntityDefinition | null> {
    const result = await this.proxy.select({
      sql: 'SELECT * FROM entity_definitions WHERE id = ? LIMIT 1',
      params: [id],
      limit: 1,
    });
    const row = result.rows[0] as DefinitionRow | undefined;
    return row ? mapRow(row) : null;
  }

  async updateDefinition(
    entityKey: string,
    patch: {
      name?: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
      properties?: EntityProperty[];
      lookupDisplayProperty?: string | null;
      lookupDisplayFormat?: string | null;
    },
  ): Promise<{ definition: EntityDefinition | null; errors?: string[] }> {
    const existing = await this.getByEntityKey(entityKey);
    if (!existing) {
      return { definition: null };
    }
    const mergedProperties = patch.properties ?? existing.properties;
    const displayErrors = validateLookupDisplaySettings(
      {
        lookupDisplayProperty:
          patch.lookupDisplayProperty !== undefined
            ? patch.lookupDisplayProperty
            : existing.lookupDisplayProperty,
        lookupDisplayFormat:
          patch.lookupDisplayFormat !== undefined
            ? patch.lookupDisplayFormat
            : existing.lookupDisplayFormat,
      },
      mergedProperties,
    );
    if (displayErrors.length) {
      return { definition: null, errors: displayErrors };
    }
    if (patch.properties != null) {
      const all = await this.listDefinitions();
      const knownKeys = new Set(all.map((d) => d.entityKey));
      const propErrors = validateUpdateDefinitionInput(patch, knownKeys, entityKey);
      if (propErrors.length) {
        return { definition: null, errors: propErrors };
      }
    }
    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.name != null) {
      data.name = patch.name;
    }
    if (patch.description != null) {
      data.description = patch.description;
    }
    if (patch.icon != null) {
      data.icon = patch.icon;
    }
    if (patch.sortOrder != null) {
      data.sort_order = patch.sortOrder;
    }
    if (patch.properties != null) {
      data.properties_json = JSON.stringify(patch.properties);
    }
    if (patch.lookupDisplayProperty !== undefined) {
      data.lookup_display_property =
        patch.lookupDisplayProperty === null || patch.lookupDisplayProperty === ''
          ? null
          : patch.lookupDisplayProperty.trim();
    }
    if (patch.lookupDisplayFormat !== undefined) {
      data.lookup_display_format =
        patch.lookupDisplayFormat === null || patch.lookupDisplayFormat === ''
          ? null
          : patch.lookupDisplayFormat.trim();
    }
    await this.proxy.update({
      tableName: 'entity_definitions',
      data,
      where: { entity_key: entityKey },
    });
    const definition = await this.getByEntityKey(entityKey);
    return { definition };
  }

  async createDefinition(input: {
    entityKey: string;
    name: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
    properties: EntityProperty[];
    lookupDisplayProperty?: string | null;
    lookupDisplayFormat?: string | null;
  }): Promise<{ definition?: EntityDefinition; errors?: string[] }> {
    const all = await this.listDefinitions();
    const existingKeys = new Set(all.map((d) => d.entityKey));
    const knownKeys = new Set(existingKeys);
    const normalizedKey = input.entityKey.trim();
    const errors = validateCreateDefinitionInput(
      { ...input, entityKey: normalizedKey },
      existingKeys,
      knownKeys,
    );
    if (errors.length) {
      return { errors };
    }

    const maxSort = all.reduce((max, d) => Math.max(max, d.sortOrder ?? 0), 0);
    const sortOrder = input.sortOrder ?? maxSort + 1;
    const now = new Date().toISOString();

    const insert = await this.proxy.insert({
      tableName: 'entity_definitions',
      data: {
        entity_key: normalizedKey,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        icon: input.icon?.trim() ?? null,
        sort_order: sortOrder,
        properties_json: JSON.stringify(input.properties),
        lookup_display_property:
          input.lookupDisplayProperty == null || input.lookupDisplayProperty === ''
            ? null
            : input.lookupDisplayProperty.trim(),
        lookup_display_format:
          input.lookupDisplayFormat == null || input.lookupDisplayFormat === ''
            ? null
            : input.lookupDisplayFormat.trim(),
        is_system: 0,
        created_at: now,
        updated_at: now,
      },
    });
    if (!insert.success) {
      return { errors: [insert.error ?? 'Failed to create entity definition'] };
    }

    if (insert.insertId != null) {
      const created = await this.getById(insert.insertId);
      if (created) {
        return { definition: created };
      }
    }
    return { definition: (await this.getByEntityKey(normalizedKey)) ?? undefined };
  }

  async deleteDefinition(
    entityKey: string,
  ): Promise<{ deleted: boolean; error?: string; status?: number }> {
    const existing = await this.getByEntityKey(entityKey);
    if (!existing) {
      return { deleted: false, error: 'Not found', status: 404 };
    }
    if (existing.isSystem) {
      return { deleted: false, error: 'System entity definitions cannot be deleted', status: 403 };
    }

    const all = await this.listDefinitions();
    const referrers = findDefinitionsReferencingEntity(all, entityKey);
    if (referrers.length) {
      return {
        deleted: false,
        error: `Entity is referenced by lookup fields on: ${referrers.join(', ')}`,
        status: 409,
      };
    }

    const countResult = await this.proxy.select({
      sql: 'SELECT COUNT(*) AS cnt FROM entity_records WHERE entity_definition_id = ?',
      params: [existing.id],
      limit: 1,
    });
    const cnt = Number((countResult.rows[0] as { cnt: number })?.cnt ?? 0);
    if (cnt > 0) {
      return {
        deleted: false,
        error: `Delete all ${cnt} record(s) before removing this entity model`,
        status: 409,
      };
    }

    await this.proxy.delete({
      tableName: 'entity_definitions',
      where: { entity_key: entityKey },
    });
    return { deleted: true };
  }
}
