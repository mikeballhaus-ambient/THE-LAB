import type { Database } from 'better-sqlite3';
import type {
  ChartConnectorPreviewResult,
  ChartDataConnector,
} from '../../shared/types/chart-data-connector';

/**
 * Data connector rows — one discovery endpoint a chart can read from.
 *
 * **Table name is `data_connectors`**, not `data_connectors`. This is fixed by
 * `src/tests/backend/lab-integrations-stub.test.ts` and
 * `lab-integrations-unbind-cleanup.test.ts`, which build the fixture schema directly.
 *
 * Consumers in the main backend (`lab-integrations-chart-stub-provisioner.ts`,
 * `chart-builder-unbind-provider.ts`) rely on:
 *   `findById`, `findByAppEntity`, `create`, `update`, `delete`.
 */

interface ConnectorRow {
  id: number;
  app_name: string;
  entity_name: string;
  discovery_url: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface UpsertConnectorInput {
  appName: string;
  entityName: string;
  discoveryUrl: string;
  isActive?: boolean;
}

function mapRow(row: ConnectorRow): ChartDataConnector {
  return {
    id: row.id,
    appName: row.app_name,
    entityName: row.entity_name,
    discoveryUrl: row.discovery_url,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DataConnectorsRepository {
  constructor(private readonly db: Database) {}

  findAll(): ChartDataConnector[] {
    const rows = this.db
      .prepare('SELECT * FROM data_connectors ORDER BY app_name ASC, entity_name ASC')
      .all() as ConnectorRow[];
    return rows.map(mapRow);
  }

  findById(id: number): ChartDataConnector | null {
    const row = this.db
      .prepare('SELECT * FROM data_connectors WHERE id = ? LIMIT 1')
      .get(id) as ConnectorRow | undefined;
    return row ? mapRow(row) : null;
  }

  findByDiscoveryUrl(discoveryUrl: string): ChartDataConnector | null {
    const row = this.db
      .prepare('SELECT * FROM data_connectors WHERE discovery_url = ? LIMIT 1')
      .get(discoveryUrl) as ConnectorRow | undefined;
    return row ? mapRow(row) : null;
  }

  /** Provisioning is idempotent per (app, entity) pair. */
  findByAppEntity(appName: string, entityName: string): ChartDataConnector | null {
    const row = this.db
      .prepare(
        'SELECT * FROM data_connectors WHERE app_name = ? AND entity_name = ? LIMIT 1',
      )
      .get(appName, entityName) as ConnectorRow | undefined;
    return row ? mapRow(row) : null;
  }

  create(input: UpsertConnectorInput): ChartDataConnector {
    const result = this.db
      .prepare(
        `INSERT INTO data_connectors (app_name, entity_name, discovery_url, is_active)
         VALUES (?, ?, ?, ?)`,
      )
      .run(
        input.appName,
        input.entityName,
        input.discoveryUrl,
        input.isActive === false ? 0 : 1,
      );
    const row = this.db
      .prepare('SELECT * FROM data_connectors WHERE id = ?')
      .get(result.lastInsertRowid) as ConnectorRow;
    return mapRow(row);
  }

  update(id: number, patch: Partial<UpsertConnectorInput>): ChartDataConnector | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }
    this.db
      .prepare(
        `UPDATE data_connectors SET
           app_name = ?, entity_name = ?, discovery_url = ?, is_active = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(
        patch.appName ?? existing.appName,
        patch.entityName ?? existing.entityName,
        patch.discoveryUrl ?? existing.discoveryUrl,
        (patch.isActive ?? existing.isActive) ? 1 : 0,
        id,
      );
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM data_connectors WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /** Shape a discovery preview for the UI. */
  toPreview(connector: ChartDataConnector, propertyNames: string[]): ChartConnectorPreviewResult {
    return {
      appName: connector.appName,
      entityName: connector.entityName,
      propertyNames,
    };
  }
}
