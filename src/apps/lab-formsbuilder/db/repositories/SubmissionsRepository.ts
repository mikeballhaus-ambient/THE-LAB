/**
 * Repository for form_submissions table operations.
 * Provides CRUD operations for form submission tracking.
 */

import { Database } from 'better-sqlite3';
import { asDbRow, asJsonColumnString } from '@/shared/utils/record-narrowing';
import type { FormSubmissionDBReturn, FormSubmission, FormSubmissionSchemaOptions, DataConnector } from '@/apps/lab-formsbuilder/shared/types';

export class SubmissionsRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Get all form submissions (optionally filtered).
   */
  async findAll(options?: FormSubmissionSchemaOptions): Promise<FormSubmissionDBReturn> {
    // Build query with LEFT JOINs to fetch related data
    let sql = `
      SELECT
        fs.*,
        f.name as f_name,
        f.description as f_description,
        f.is_active as f_is_active,
        dc.app_name as dc_app_name,
        dc.entity_name as dc_entity_name,
        dc.discovery_url as dc_discovery_url,
        dc.discovery_type as dc_discovery_type,
        dc.entity_model as dc_entity_model,
        dc.endpoints as dc_endpoints,
        dc.capabilities as dc_capabilities,
        dc.created_at as dc_created_at,
        dc.updated_at as dc_updated_at,
        dc.last_verified_at as dc_last_verified_at,
        dc.is_active as dc_is_active
      FROM form_submissions fs
      LEFT JOIN forms f ON fs.form_key = f.form_key
      LEFT JOIN data_connectors dc ON fs.data_connector_id = dc.id
    `;
    const params: unknown[] = [];

    if (options?.formKey) {
      sql += ' WHERE fs.form_key = ?';
      params.push(options.formKey);
    }
    if (options?.data_connector_id !== undefined) {
      sql += options.formKey ? ' AND fs.data_connector_id = ?' : ' WHERE fs.data_connector_id = ?';
      params.push(options.data_connector_id);
    }
    if (options?.status) {
      sql += (sql.includes('WHERE') ? ' AND ' : ' WHERE ') + 'fs.status = ?';
      params.push(options.status);
    }

    // Add pagination
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    sql += ' ORDER BY fs.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params);
    const formSubmissions = this.mapDataRows(rows);

    let countSql = 'SELECT COUNT(*) as total FROM form_submissions fs';
    const countParams: unknown[] = [];
    const countWhere: string[] = [];

    if (options?.formKey) {
      countWhere.push('fs.form_key = ?');
      countParams.push(options.formKey);
    }
    if (options?.data_connector_id !== undefined) {
      countWhere.push('fs.data_connector_id = ?');
      countParams.push(options.data_connector_id);
    }
    if (options?.status) {
      countWhere.push('fs.status = ?');
      countParams.push(options.status);
    }
    if (countWhere.length > 0) {
      countSql += ` WHERE ${countWhere.join(' AND ')}`;
    }

    const totalResult = this.db.prepare(countSql).get(...countParams) as { total: number };


    return {
      formSubmissions,
      total: totalResult.total,
      limit,
      offset
    } as FormSubmissionDBReturn;
  }

  /**
   * Get form submission by ID.
   */
  async findById(id: number): Promise<FormSubmission | null> {
    const result = this.db.prepare(`
      SELECT
        fs.*,
        f.name as f_name,
        f.description as f_description,
        f.is_active as f_is_active,
        dc.app_name as dc_app_name,
        dc.entity_name as dc_entity_name,
        dc.discovery_url as dc_discovery_url,
        dc.discovery_type as dc_discovery_type,
        dc.entity_model as dc_entity_model,
        dc.endpoints as dc_endpoints,
        dc.capabilities as dc_capabilities,
        dc.created_at as dc_created_at,
        dc.updated_at as dc_updated_at,
        dc.last_verified_at as dc_last_verified_at,
        dc.is_active as dc_is_active
      FROM form_submissions fs
      LEFT JOIN forms f ON fs.form_key = f.form_key
      LEFT JOIN data_connectors dc ON fs.data_connector_id = dc.id
      WHERE fs.id = ?
    `).get(id);
    return result ? this.mapDataRow(asDbRow(result)) : null;
  }

  /**
   * Get form submission by form_key and data_connector_id.
   */
  async findByFormKeyAndConnector(formKey: string, dataConnectorId: number): Promise<FormSubmission | null> {
    const result = this.db.prepare(`
      SELECT
        fs.*,
        f.name as f_name,
        f.description as f_description,
        f.is_active as f_is_active,
        dc.app_name as dc_app_name,
        dc.entity_name as dc_entity_name,
        dc.discovery_url as dc_discovery_url,
        dc.discovery_type as dc_discovery_type,
        dc.entity_model as dc_entity_model,
        dc.endpoints as dc_endpoints,
        dc.capabilities as dc_capabilities,
        dc.created_at as dc_created_at,
        dc.updated_at as dc_updated_at,
        dc.last_verified_at as dc_last_verified_at,
        dc.is_active as dc_is_active
      FROM form_submissions fs
      LEFT JOIN forms f ON fs.form_key = f.form_key
      LEFT JOIN data_connectors dc ON fs.data_connector_id = dc.id
      WHERE fs.form_key = ? AND fs.data_connector_id = ?
    `).get(formKey, dataConnectorId);
    return result ? this.mapDataRow(asDbRow(result)) : null;
  }

  /**
   * Create a new form submission.
   */
  async create(data: FormSubmission): Promise<FormSubmission | null> {
    const insert = this.db.prepare(`
      INSERT INTO form_submissions (form_key, data_connector_id, data, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const runResult = insert.run(
      data.formKey,
      data.data_connector_id,
      data.data ? JSON.stringify(data.data) : null,
      data.status || 'pending',
      new Date().toISOString(),
      new Date().toISOString()
    );

    const id = Number(runResult.lastInsertRowid);
    if (!id) {
      throw new Error('Failed to insert form submission: no lastInsertRowId returned');
    }

    // Use prepared statement to avoid race condition
    const result = await this.findById(id)
    if (!result) {
      throw new Error('Failed to retrieve created form submission');
    }
    return result;
  }

  /**
   * Update an existing form submission.
   */
  async update(id: number, data: Partial<FormSubmission>): Promise<FormSubmission | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.formKey !== undefined) { fields.push('form_key = ?'); params.push(data.formKey); }
    if (data.data_connector_id !== undefined) { fields.push('data_connector_id = ?'); params.push(data.data_connector_id); }
    if (data.data !== undefined) { fields.push('data = ?'); params.push(JSON.stringify(data.data)); }
    if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE form_submissions SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    this.db.prepare(sql).run(...params);
    return await this.findById(id);
  }

  /**
   * Delete a form submission by ID.
   */
  async delete(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM form_submissions WHERE id = ?').run(id);
    return (result.changes as number) > 0;
  }

  /**
   * Delete form submissions by form_key.
   */
  async deleteByFormKey(formKey: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM form_submissions WHERE form_key = ?').run(formKey);
    return (result.changes as number) > 0;
  }

  /**
   * Mark submission as submitted.
   */
  async markAsSubmitted(id: number): Promise<FormSubmission | null> {
    return await this.update(id, { status: 'submitted' });
  }

  /**
   * Mark submission as failed.
   */
  async markAsFailed(id: number, errorMessage?: string): Promise<FormSubmission | null> {
    const data: Partial<FormSubmission> = { status: 'failed' };
    if (errorMessage) {
      // Note: We don't store error messages in the database per schema design
      // This is just for tracking purposes
    }
    return await this.update(id, data);
  }

  /**
   * Get count of submissions by status.
   */
  async getCountByStatus(status: string): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM form_submissions WHERE status = ?').get(status) as { count: number };
    return result.count;
  }

  /**
   * Get total submission count.
   */
  async getCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM form_submissions').get() as { count: number };
    return result.count;
  }

  /**
   * Get submissions for a specific form key.
   */
  async getByFormKey(formKey: string): Promise<FormSubmission[]> {
    const rows = this.db.prepare(`
      SELECT
        fs.*,
        f.name as f_name,
        f.description as f_description,
        f.is_active as f_is_active,
        dc.app_name as dc_app_name,
        dc.entity_name as dc_entity_name,
        dc.discovery_url as dc_discovery_url,
        dc.discovery_type as dc_discovery_type,
        dc.entity_model as dc_entity_model,
        dc.endpoints as dc_endpoints,
        dc.capabilities as dc_capabilities,
        dc.created_at as dc_created_at,
        dc.updated_at as dc_updated_at,
        dc.last_verified_at as dc_last_verified_at,
        dc.is_active as dc_is_active
      FROM form_submissions fs
      LEFT JOIN forms f ON fs.form_key = f.form_key
      LEFT JOIN data_connectors dc ON fs.data_connector_id = dc.id
      WHERE fs.form_key = ?
      ORDER BY fs.created_at DESC
    `).all(formKey) as FormSubmissionDBReturn[];
    return this.mapDataRows(rows);
  }

  /**
   * Map multiple database rows to FormSubmission objects.
   */
  mapDataRows(rows: unknown[]): FormSubmission[] {
    return rows.map((row) => this.mapDataRow(asDbRow(row)));
  }

  /**
   * Map a single database row to a FormSubmission object with optional related data.
   */
  mapDataRow(data: Record<string, unknown>): FormSubmission {
    const safeJson = <T>(value: string | null | undefined, fallback: T): T => {
      if (!value) return fallback;
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    };

    // Build optional form object from joined columns
    const form = data.f_name
      ? {
        name: data.f_name,
        description: data.f_description || undefined,
        is_active: data.f_is_active === 1,
      }
      : undefined;

    // Build optional data connector object from joined columns
    const dataConnector = data.dc_app_name
      ? {
        appName: data.dc_app_name,
        entityName: data.dc_entity_name || undefined,
        discoveryUrl: data.dc_discovery_url || undefined,
        discoveryType: data.dc_discovery_type || undefined,
        entityModel: asJsonColumnString(data.dc_entity_model)
          ? safeJson<unknown>(asJsonColumnString(data.dc_entity_model), undefined)
          : undefined,
        endpoints: asJsonColumnString(data.dc_endpoints)
          ? safeJson<unknown>(asJsonColumnString(data.dc_endpoints), undefined)
          : undefined,
        capabilities: asJsonColumnString(data.dc_capabilities)
          ? safeJson<unknown>(asJsonColumnString(data.dc_capabilities), undefined)
          : undefined,
        createdAt: data.dc_created_at ?? null,
        updatedAt: data.dc_updated_at ?? null,
        last_verified_at: data.dc_last_verified_at || null,
        is_active: data.dc_is_active ?? 0,
      } as DataConnector
      : undefined;

    return {
      id: data.id,
      formKey: data.form_key,
      data_connector_id: data.data_connector_id,
      data: asJsonColumnString(data.data)
        ? safeJson<FormSubmission['data']>(asJsonColumnString(data.data), {})
        : {},
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      form,
      dataConnector,
    } as FormSubmission;
  }
}
