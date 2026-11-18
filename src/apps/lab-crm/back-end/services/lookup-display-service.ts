import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import type {
  ConnectorEntityRecord,
  EntityDefinition,
  LookupLabelsByField,
} from '../../shared/types/entity.types';
import { formatLookupRecordLabel } from '../../shared/utils/lookup-record-label';
import { EntityDefinitionService } from './entity-definition-service';

interface RecordRow {
  id: number;
  data_json: string;
}

export class LookupDisplayService {
  private static instance: LookupDisplayService | null = null;

  public static getInstance(): LookupDisplayService {
    if (!this.instance) {
      this.instance = new LookupDisplayService();
    }
    return this.instance;
  }

  private get proxy(): AppDatabaseServiceProxy {
    return AppDatabaseServiceProxy.getInstance();
  }

  async buildLookupLabels(
    definition: EntityDefinition,
    records: ConnectorEntityRecord[],
  ): Promise<LookupLabelsByField> {
    const out: LookupLabelsByField = {};
    const lookupProps = definition.properties.filter(
      (p) => p.type === 'lookup' && p.lookupEntityKey,
    );
    if (!lookupProps.length || !records.length) {
      return out;
    }

    const definitions = EntityDefinitionService.getInstance();

    for (const prop of lookupProps) {
      const targetKey = prop.lookupEntityKey!;
      const targetDef = await definitions.getByEntityKey(targetKey);
      if (!targetDef) {
        continue;
      }

      const ids = new Set<number>();
      for (const row of records) {
        const v = row[prop.name];
        if (typeof v === 'number' && Number.isFinite(v)) {
          ids.add(v);
        }
      }
      if (ids.size === 0) {
        continue;
      }

      const idList = [...ids];
      const placeholders = idList.map(() => '?').join(',');
      const result = await this.proxy.select({
        sql: `
          SELECT r.id, r.data_json FROM entity_records r
          WHERE r.entity_definition_id = ? AND r.id IN (${placeholders})
        `,
        params: [targetDef.id, ...idList],
      });

      const fieldMap: Record<number, string> = {};
      for (const row of result.rows as RecordRow[]) {
        const data = JSON.parse(row.data_json) as Record<string, unknown>;
        fieldMap[row.id] = formatLookupRecordLabel(targetDef, { ...data, id: row.id }, prop.lookupLabelProperty);
      }
      out[prop.name] = fieldMap;
    }

    return out;
  }
}
