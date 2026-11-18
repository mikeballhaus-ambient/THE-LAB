import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import type { ConnectorEntityRecord, EntityRecord } from '../../shared/types/entity.types';
import { EntityDefinitionService } from './entity-definition-service';
import { ReferentialIntegrityService, type InboundReference } from './referential-integrity';
import { stripUnknownFields, validateRecordData } from './entity-validation';
import { emitEntityRecordsChanged } from '../utils/crm-socket-broadcast';

interface RecordRow {
  id: number;
  entity_definition_id: number;
  data_json: string;
  created_at: string;
  updated_at: string;
  entity_key?: string;
}

function mapRow(row: RecordRow): EntityRecord {
  return {
    id: row.id,
    entityDefinitionId: row.entity_definition_id,
    entityKey: row.entity_key,
    data: JSON.parse(row.data_json) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function recordToConnectorShape(record: EntityRecord): ConnectorEntityRecord {
  return {
    id: record.id,
    ...record.data,
  };
}

export class EntityRecordService {
  private static instance: EntityRecordService | null = null;

  public static getInstance(): EntityRecordService {
    if (!this.instance) {
      this.instance = new EntityRecordService();
    }
    return this.instance;
  }

  private get proxy(): AppDatabaseServiceProxy {
    return AppDatabaseServiceProxy.getInstance();
  }

  private get definitions(): EntityDefinitionService {
    return EntityDefinitionService.getInstance();
  }

  async listByEntityKey(
    entityKey: string,
    options?: { limit?: number; q?: string },
  ): Promise<ConnectorEntityRecord[]> {
    const definition = await this.definitions.getByEntityKey(entityKey);
    if (!definition) {
      return [];
    }
    const limit = options?.limit ?? 500;
    const q = options?.q?.trim();
    const params: unknown[] = [definition.id];
    let searchClause = '';
    if (q) {
      searchClause = ' AND lower(r.data_json) LIKE lower(?)';
      params.push(`%${q}%`);
    }
    const result = await this.proxy.select({
      sql: `
        SELECT r.* FROM entity_records r
        WHERE r.entity_definition_id = ?
        ${searchClause}
        ORDER BY r.id DESC
      `,
      params,
      limit,
    });
    return (result.rows as RecordRow[]).map((row) =>
      recordToConnectorShape(mapRow({ ...row, entity_key: entityKey })),
    );
  }

  async getByEntityKeyAndId(
    entityKey: string,
    id: number,
  ): Promise<ConnectorEntityRecord | null> {
    const definition = await this.definitions.getByEntityKey(entityKey);
    if (!definition) {
      return null;
    }
    const result = await this.proxy.select({
      sql: `
        SELECT r.* FROM entity_records r
        WHERE r.id = ? AND r.entity_definition_id = ?
        LIMIT 1
      `,
      params: [id, definition.id],
      limit: 1,
    });
    const row = result.rows[0] as RecordRow | undefined;
    if (!row) {
      return null;
    }
    return recordToConnectorShape(mapRow({ ...row, entity_key: entityKey }));
  }

  async create(
    entityKey: string,
    body: Record<string, unknown>,
  ): Promise<{ record?: ConnectorEntityRecord; errors?: string[] }> {
    const definition = await this.definitions.getByEntityKey(entityKey);
    if (!definition) {
      return { errors: [`Unknown entity: ${entityKey}`] };
    }
    const stripped = stripUnknownFields(definition, body);
    const validation = validateRecordData(definition, stripped);
    if (!validation.valid) {
      return { errors: validation.errors };
    }
    const lookupErrors = await this.validateLookups(definition, stripped);
    if (lookupErrors.length) {
      return { errors: lookupErrors };
    }
    const now = new Date().toISOString();
    const insert = await this.proxy.insert({
      tableName: 'entity_records',
      data: {
        entity_definition_id: definition.id,
        data_json: JSON.stringify(stripped),
        created_at: now,
        updated_at: now,
      },
    });
    const id = insert.insertId;
    const created = await this.getByEntityKeyAndId(entityKey, id);
    emitEntityRecordsChanged(entityKey);
    return { record: created ?? undefined };
  }

  async update(
    entityKey: string,
    id: number,
    body: Record<string, unknown>,
  ): Promise<{ record?: ConnectorEntityRecord; errors?: string[]; notFound?: boolean }> {
    const existing = await this.getByEntityKeyAndId(entityKey, id);
    if (!existing) {
      return { notFound: true };
    }
    const definition = await this.definitions.getByEntityKey(entityKey);
    if (!definition) {
      return { errors: [`Unknown entity: ${entityKey}`] };
    }
    const merged: Record<string, unknown> = { ...existing, ...body };
    delete merged.id;
    const stripped = stripUnknownFields(definition, merged);
    const validation = validateRecordData(definition, stripped, { partial: false });
    if (!validation.valid) {
      return { errors: validation.errors };
    }
    const lookupErrors = await this.validateLookups(definition, stripped);
    if (lookupErrors.length) {
      return { errors: lookupErrors };
    }
    await this.proxy.update({
      tableName: 'entity_records',
      data: {
        data_json: JSON.stringify(stripped),
        updated_at: new Date().toISOString(),
      },
      where: { id },
    });
    const updated = await this.getByEntityKeyAndId(entityKey, id);
    emitEntityRecordsChanged(entityKey);
    return { record: updated ?? undefined };
  }

  async delete(
    entityKey: string,
    id: number,
  ): Promise<{
    deleted: boolean;
    error?: string;
    status?: number;
    references?: InboundReference[];
  }> {
    const existing = await this.getByEntityKeyAndId(entityKey, id);
    if (!existing) {
      return { deleted: false, status: 404, error: 'Not found' };
    }
    const check = await ReferentialIntegrityService.getInstance().canDeleteRecord(entityKey, id);
    if (!check.allowed) {
      return {
        deleted: false,
        status: 409,
        error: 'Record is referenced by other entities',
        references: check.references,
      };
    }
    await this.proxy.delete({
      tableName: 'entity_records',
      where: { id },
    });
    emitEntityRecordsChanged(entityKey);
    return { deleted: true };
  }

  private async validateLookups(
    definition: Awaited<ReturnType<EntityDefinitionService['getByEntityKey']>>,
    data: Record<string, unknown>,
  ): Promise<string[]> {
    if (!definition) {
      return [];
    }
    const errors: string[] = [];
    for (const prop of definition.properties) {
      if (prop.type !== 'lookup' || !prop.lookupEntityKey) {
        continue;
      }
      const refId = data[prop.name];
      if (refId == null || refId === '') {
        continue;
      }
      const ref = await this.getByEntityKeyAndId(
        prop.lookupEntityKey,
        Number(refId),
      );
      if (!ref) {
        errors.push(`${prop.name}: referenced ${prop.lookupEntityKey} record not found`);
      }
    }
    return errors;
  }
}
