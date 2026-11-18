/**
 * Repository for data_connectors table operations.
 * Provides CRUD operations for data connector management.
 */

import { Database } from 'better-sqlite3';
import { DataConnector } from '../../shared/types';
import { asDbRow, asJsonColumnString } from '@/shared/utils/record-narrowing';

export class DataConnectorsRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Get all data connectors (optionally filtered by active status).
   */
  async findAll(options?: { isActive?: boolean }): Promise<DataConnector[]> {
    let sql = 'SELECT * FROM data_connectors';
    const params: unknown[] = [];

    if (options?.isActive !== undefined) {
      sql += ' WHERE is_active = ?';
      params.push(options.isActive ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params);
    return this.mapDataRows(rows)
  }

  /**
   * Get data connector by ID.
   */
  async findById(id: number): Promise<DataConnector | null> {
    const result = this.db.prepare('SELECT * FROM data_connectors WHERE id = ?').get(id)
    return result ? this.mapDataRow(asDbRow(result)) : null
  }

  /**
   * Get data connector by app_name.
   */
  async findByAppName(appName: string): Promise<DataConnector | null> {
    const result = this.db.prepare('SELECT * FROM data_connectors WHERE app_name = ?').get(appName);
    return result ? this.mapDataRow(asDbRow(result)) : null
  }

  /**
   * Get data connector by entity_name.
   */
  async findByEntityName(entityName: string): Promise<DataConnector | null> {
    const result = this.db.prepare('SELECT * FROM data_connectors WHERE entity_name = ?').get(entityName);
    return result ? this.mapDataRow(asDbRow(result)) : null
  }

  /**
   * Create a new data connector.
   */
  async create(data: DataConnector): Promise<DataConnector | null> {
    const insert = this.db.prepare(`
      INSERT INTO data_connectors (app_name, entity_name, discovery_url, discovery_type, entity_model, endpoints, capabilities, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertResult = insert.run(
      data.appName,
      data.entityName,
      data.discoveryUrl,
      data.discoveryType ?? 'REST',
      data.entityModel ? JSON.stringify(data.entityModel) : null,
      data.endpoints ? JSON.stringify(data.endpoints) : null,
      data.capabilities ? JSON.stringify(data.capabilities) : null,
      data.is_active !== undefined && data.is_active !== 0 ? 1 : 0,
      new Date().toISOString(),
      new Date().toISOString(),
    );

    const id = Number(insertResult.lastInsertRowid);
    if (!id) {
      throw new Error('Failed to insert data connector: no lastInsertRowId returned');
    }

    return this.findById(id);
  }

  /**
   * Update an existing data connector.
   */
  async update(id: number, data: Partial<DataConnector>): Promise<DataConnector | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.appName !== undefined) { fields.push('app_name = ?'); params.push(data.appName); }
    if (data.entityName !== undefined) { fields.push('entity_name = ?'); params.push(data.entityName); }
    if (data.discoveryUrl !== undefined) { fields.push('discovery_url = ?'); params.push(data.discoveryUrl); }
    if (data.discoveryType !== undefined) { fields.push('discovery_type = ?'); params.push(data.discoveryType); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active); }
    if (data.last_verified_at !== undefined) { fields.push('last_verified_at = ?'); params.push(data.last_verified_at); }
    if (data.entityModel !== undefined) { fields.push('entity_model = ?'); params.push(JSON.stringify(data.entityModel)); }
    if (data.endpoints !== undefined) { fields.push('endpoints = ?'); params.push(JSON.stringify(data.endpoints)); }
    if (data.capabilities !== undefined) { fields.push('capabilities = ?'); params.push(JSON.stringify(data.capabilities)); }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE data_connectors SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    this.db.prepare(sql).run(...params);
    return this.findById(id);
  }

  /**
   * Delete a data connector by ID.
   */
  async delete(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM data_connectors WHERE id = ?').run(id);
    return (result.changes as number) > 0;
  }

  /**
   * Delete a data connector by app_name.
   */
  async deleteByAppName(appName: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM data_connectors WHERE app_name = ?').run(appName);
    return (result.changes as number) > 0;
  }

  /**
   * Activate a data connector.
   */
  async activate(id: number): Promise<DataConnector | null> {
    return this.update(id, { is_active: 1 });
  }

  /**
   * Deactivate a data connector.
   */
  async deactivate(id: number): Promise<DataConnector | null> {
    return this.update(id, { is_active: 0 });
  }

  /**
   * Verify a data connector by updating last_verified_at timestamp.
   */
  async verify(id: number): Promise<DataConnector | null> {
    const now = new Date().toISOString();
    return this.update(id, { last_verified_at: now });
  }

  /**
   * Get count of active connectors.
   */
  async getActiveCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM data_connectors WHERE is_active = 1').get() as { count: number };
    return result.count;
  }

  /**
   * Get count of all connectors.
   */
  async getCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM data_connectors').get() as { count: number };
    return result.count;
  }

  mapDataRow(row: Record<string, unknown>): DataConnector {
    return {
      id: row.id,
      appName: row.app_name,
      entityName: row.entity_name,
      discoveryUrl: row.discovery_url,
      discoveryType: row.discovery_type,
      entityModel: asJsonColumnString(row.entity_model) ? JSON.parse(asJsonColumnString(row.entity_model)!) : null,
      endpoints: asJsonColumnString(row.endpoints) ? JSON.parse(asJsonColumnString(row.endpoints)!) : null,
      capabilities: asJsonColumnString(row.capabilities) ? JSON.parse(asJsonColumnString(row.capabilities)!) : null,
      is_active: row.is_active ? (row.is_active ? 1 : 0) : 0, // Convert boolean to 0/1 for database
      createdAt: new Date().toISOString(),
      updatedAt: row.updated_at,
      last_verified_at: row.last_verified_at || null,
    } as DataConnector
  }

  mapDataRows(rows: unknown[]): DataConnector[] {
    return rows.map((row) => this.mapDataRow(asDbRow(row)))
  }
}
