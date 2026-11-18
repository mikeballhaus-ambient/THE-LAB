import { Repository } from '../Repository';
import {
  LabIntegrationsSQLStatementKeys,
  bootstrapLabIntegrationsSchema,
  createLabIntegrationsSQLStatements,
  type LabIntegrationsSQLStatementKey,
} from './lab-integrations-schema';
import {
  syncCrmIntegrationBindingSeeds,
  syncCrmSharedFormIntegrationBindingSeeds,
} from './crm-integration-binding-seeds';
import { syncPlatformCatalogBindingSeeds } from './platform-catalog-binding-seeds';
import { syncCatalogBindingSeeds } from './catalog-binding-seeds';
import { syncPilotHostBindingSeeds } from './pilot-host-binding-seeds';
import type {
  LabIntegrationBindingConfigV1,
  LabIntegrationBindingRecord,
  LabIntegrationKind,
} from '@/shared/types/lab-integrations';

type BindingRow = {
  id: string;
  host_app_id: string;
  slot: string;
  kind: string;
  provider_app_id: string;
  provider_ref: string;
  config_json: string;
  enabled: number;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
};

function parseConfig(json: string): LabIntegrationBindingConfigV1 {
  try {
    const parsed = JSON.parse(json) as LabIntegrationBindingConfigV1;
    if (parsed.schemaVersion === 1) {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return { schemaVersion: 1 };
}

function mapBinding(row: BindingRow): LabIntegrationBindingRecord {
  return {
    id: row.id,
    hostAppId: row.host_app_id,
    slot: row.slot,
    kind: row.kind as LabIntegrationKind,
    providerAppId: row.provider_app_id,
    providerRef: row.provider_ref,
    config: parseConfig(row.config_json),
    enabled: row.enabled === 1,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LabIntegrationsRepository extends Repository {
  private statements: Partial<Record<LabIntegrationsSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    bootstrapLabIntegrationsSchema(this.db);
    this.statements = createLabIntegrationsSQLStatements(this.db);
    await syncCrmIntegrationBindingSeeds(this.db);
    await syncPlatformCatalogBindingSeeds(this.db);
    await syncPilotHostBindingSeeds(this.db);
    await syncCatalogBindingSeeds(this.db);
    const { migrateLegacyIntegrationStubDescriptions } = await import(
      '../../lab-integrations/migrate-legacy-integration-stub-descriptions'
    );
    const migrated = await migrateLegacyIntegrationStubDescriptions();
    if (migrated.formsUpdated > 0 || migrated.chartsUpdated > 0) {
      console.log(
        `[lab-integrations] integration stub description backfill: forms=${migrated.formsUpdated}/${migrated.formsScanned} charts=${migrated.chartsUpdated}/${migrated.chartsScanned}`,
      );
    }
  }

  private stmt(key: LabIntegrationsSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`LabIntegrations SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  listByHost(hostAppId: string): LabIntegrationBindingRecord[] {
    const rows = this.stmt(LabIntegrationsSQLStatementKeys.bindings_by_host).all(hostAppId) as BindingRow[];
    return rows.map(mapBinding);
  }

  getById(id: string): LabIntegrationBindingRecord | null {
    const row = this.stmt(LabIntegrationsSQLStatementKeys.binding_by_id).get(id) as BindingRow | undefined;
    return row ? mapBinding(row) : null;
  }

  getByHostSlot(hostAppId: string, slot: string): LabIntegrationBindingRecord | null {
    const row = this.stmt(LabIntegrationsSQLStatementKeys.binding_by_host_slot).get(
      hostAppId,
      slot,
    ) as BindingRow | undefined;
    return row ? mapBinding(row) : null;
  }

  listEnabledByHostAndProvider(hostAppId: string, providerAppId: string): LabIntegrationBindingRecord[] {
    const rows = this.stmt(LabIntegrationsSQLStatementKeys.bindings_by_provider).all(
      hostAppId,
      providerAppId,
    ) as BindingRow[];
    return rows.map(mapBinding);
  }

  insertBinding(record: {
    id: string;
    hostAppId: string;
    slot: string;
    kind: LabIntegrationKind;
    providerAppId: string;
    providerRef: string;
    configJson: string;
    enabled: boolean;
    createdByUserId: number;
  }): void {
    this.stmt(LabIntegrationsSQLStatementKeys.binding_insert).run(
      record.id,
      record.hostAppId,
      record.slot,
      record.kind,
      record.providerAppId,
      record.providerRef,
      record.configJson,
      record.enabled ? 1 : 0,
      record.createdByUserId,
    );
  }

  updateBinding(record: {
    id: string;
    providerAppId: string;
    providerRef: string;
    configJson: string;
    enabled: boolean;
  }): void {
    this.stmt(LabIntegrationsSQLStatementKeys.binding_update).run(
      record.providerAppId,
      record.providerRef,
      record.configJson,
      record.enabled ? 1 : 0,
      record.id,
    );
  }

  deleteBinding(id: string): void {
    this.stmt(LabIntegrationsSQLStatementKeys.binding_delete).run(id);
  }

  countByProviderRef(providerRef: string): number {
    const row = this.stmt(LabIntegrationsSQLStatementKeys.bindings_count_by_provider_ref).get(
      providerRef,
    ) as { count: number };
    return row?.count ?? 0;
  }

  clearAllForTests(): void {
    if (!this.db) {
      return;
    }
    this.db.prepare('DELETE FROM lab_integration_bindings').run();
  }

  /** Idempotent stubs + bindings for quotes and related tasks/tickets on CRM records. */
  async ensureCrmSharedFormIntegrationBindingSeeds(createdByUserId = 1): Promise<void> {
    if (!this.db) {
      return;
    }
    await syncCrmSharedFormIntegrationBindingSeeds(this.db, createdByUserId);
  }
}

export const labIntegrationsRepository = new LabIntegrationsRepository();
