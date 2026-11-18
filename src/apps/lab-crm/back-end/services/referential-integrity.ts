import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import { EntityDefinitionService } from './entity-definition-service';

export interface InboundReference {
  entityKey: string;
  propertyName: string;
  count: number;
}

export class ReferentialIntegrityService {
  private static instance: ReferentialIntegrityService | null = null;

  public static getInstance(): ReferentialIntegrityService {
    if (!this.instance) {
      this.instance = new ReferentialIntegrityService();
    }
    return this.instance;
  }

  private get proxy(): AppDatabaseServiceProxy {
    return AppDatabaseServiceProxy.getInstance();
  }

  async findInboundReferences(
    targetEntityKey: string,
    targetRecordId: number,
  ): Promise<InboundReference[]> {
    const definitions = await EntityDefinitionService.getInstance().listDefinitions();
    const refs: InboundReference[] = [];

    for (const def of definitions) {
      for (const prop of def.properties) {
        if (prop.type !== 'lookup' || prop.lookupEntityKey !== targetEntityKey) {
          continue;
        }
        const jsonPath = `$.${prop.name}`;
        const result = await this.proxy.select({
          sql: `
            SELECT COUNT(*) AS cnt FROM entity_records
            WHERE entity_definition_id = ?
              AND CAST(json_extract(data_json, ?) AS INTEGER) = ?
          `,
          params: [def.id, jsonPath, targetRecordId],
          limit: 1,
        });
        const cnt = Number((result.rows[0] as { cnt: number })?.cnt ?? 0);
        if (cnt > 0) {
          refs.push({ entityKey: def.entityKey, propertyName: prop.name, count: cnt });
        }
      }
    }
    return refs;
  }

  async canDeleteRecord(
    entityKey: string,
    recordId: number,
  ): Promise<{ allowed: boolean; references?: InboundReference[] }> {
    const refs = await this.findInboundReferences(entityKey, recordId);
    if (refs.length) {
      return { allowed: false, references: refs };
    }
    return { allowed: true };
  }
}
