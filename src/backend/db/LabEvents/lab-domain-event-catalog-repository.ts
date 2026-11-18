import { Repository } from '../Repository';
import {
  LabDomainEventCatalogSQLStatementKeys,
  bootstrapLabDomainEventCatalogSchema,
  createLabDomainEventCatalogSQLStatements,
  type LabDomainEventCatalogSQLStatementKey,
} from './lab-domain-event-catalog-schema';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import { hashLabDomainEventCatalogEntry } from '@/backend/lab-events/domain-event-catalog-entry-hash';

type CatalogDbRow = {
  event_type: string;
  source_app_id: string;
  publisher_kind: string;
  label: string;
  description: string;
  payload_fields_json: string;
  dynamic_payload: number;
  registered_at: string;
  content_hash: string;
};

function mapCatalogRow(row: CatalogDbRow): LabDomainEventCatalogEntry {
  let payloadFields: LabDomainEventCatalogEntry['payloadFields'] = [];
  try {
    payloadFields = JSON.parse(row.payload_fields_json) as LabDomainEventCatalogEntry['payloadFields'];
  } catch {
    payloadFields = [];
  }
  return {
    eventType: row.event_type,
    sourceAppId: row.source_app_id,
    label: row.label,
    description: row.description,
    publisherKind: row.publisher_kind as LabDomainEventCatalogEntry['publisherKind'],
    payloadFields,
    dynamicPayload: row.dynamic_payload === 1,
  };
}

export class LabDomainEventCatalogRepository extends Repository {
  private statements: Partial<
    Record<LabDomainEventCatalogSQLStatementKey, import('better-sqlite3').Statement>
  > = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    bootstrapLabDomainEventCatalogSchema(this.db);
    this.statements = createLabDomainEventCatalogSQLStatements(this.db);
  }

  private stmt(key: LabDomainEventCatalogSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`LabDomainEventCatalog SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  listAllEntries(): LabDomainEventCatalogEntry[] {
    const rows = this.stmt(LabDomainEventCatalogSQLStatementKeys.catalog_list_all).all() as CatalogDbRow[];
    return rows.map(mapCatalogRow);
  }

  countEntries(): number {
    const row = this.stmt(LabDomainEventCatalogSQLStatementKeys.catalog_count).get() as { c: number } | undefined;
    return row?.c ?? 0;
  }

  /**
   * Replace materialized catalog rows with the merged registration set.
   * Removes stale event types no longer present in `entries`.
   */
  syncEntries(entries: readonly LabDomainEventCatalogEntry[]): void {
    const now = new Date().toISOString();
    const eventTypes: string[] = [];

    for (const entry of entries) {
      eventTypes.push(entry.eventType);
      const contentHash = hashLabDomainEventCatalogEntry(entry);
      this.stmt(LabDomainEventCatalogSQLStatementKeys.catalog_upsert).run(
        entry.eventType,
        entry.sourceAppId,
        entry.publisherKind,
        entry.label,
        entry.description,
        JSON.stringify(entry.payloadFields),
        entry.dynamicPayload ? 1 : 0,
        now,
        contentHash,
      );
    }

    if (eventTypes.length === 0) {
      this.db.prepare('DELETE FROM lab_domain_event_catalog').run();
      return;
    }

    this.stmt(LabDomainEventCatalogSQLStatementKeys.catalog_delete_except).run(JSON.stringify(eventTypes));
  }

  deleteBySourceAppId(sourceAppId: string): void {
    this.db.prepare('DELETE FROM lab_domain_event_catalog WHERE source_app_id = ?').run(sourceAppId);
  }
}

export const labDomainEventCatalogRepository = new LabDomainEventCatalogRepository();