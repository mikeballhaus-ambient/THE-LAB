/**
 * Repository for forms table operations.
 * Provides CRUD operations for form management.
 */

import { Database } from 'better-sqlite3';
import { DataConnector, FormComponent, FormSchema, FormSchemaDBReturn, FormSchemaOptions } from '@/apps/lab-formsbuilder/shared/types';
import { parseFormSchemaJson, serializeFormSchemaJson } from '@/apps/lab-formsbuilder/shared/utils/schema-json';
import { syncFormComponentTypesFromConnector } from '@/shared/forms/sync-form-component-types-from-connector';
import { mergeHelpDeskTicketLookupsOntoConnector } from '@/shared/lab-integrations/help-desk-ticket-lookup-contracts';
import { asDbRow, asJsonColumnString, asOptionalString } from '@/shared/utils/record-narrowing';

export class FormsRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Get all forms (optionally filtered by active status).
   */
  async findAll(options?: FormSchemaOptions): Promise<FormSchemaDBReturn> {
    const db = this.db;

    // Build query with JOIN to fetch related data_connector row
    let sql = `
      SELECT
        f.*,
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
      FROM forms f
      LEFT JOIN data_connectors dc ON f.data_connector_id = dc.id
    `;
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    if (options?.dataConnecter?.id !== undefined) {
      whereClauses.push('f.data_connector_id = ?');
      params.push(options.dataConnecter.id);
    }

    if (options?.is_active !== undefined) {
      whereClauses.push(options.is_active ? 'f.is_active = 1' : 'f.is_active = 0');
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add pagination
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    sql += ` ORDER BY f.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const formsData = db.prepare(sql).all(...params);

    const forms = this.mapDataRows(formsData)

    // Get total count for pagination metadata (count only active forms matching filters)
    let countSql = 'SELECT COUNT(*) as total FROM forms';
    const countParams: unknown[] = [];
    const countClauses: string[] = [];

    if (options?.dataConnecter?.id !== undefined) {
      countClauses.push('data_connector_id = ?');
      countParams.push(options.dataConnecter.id);
    }

    if (options?.is_active !== undefined) {
      countClauses.push(options.is_active ? 'is_active = 1' : 'is_active = 0');
    }

    if (countClauses.length > 0) {
      countSql += ` WHERE ${countClauses.join(' AND ')}`;
    }

    const totalResult = db.prepare(countSql).get(...countParams) as { total: number };

    return {
      forms,
      total: totalResult.total,
      limit,
      offset,
    };
  }

  /**
   * Get form by key.
   */
  async findByKey(formKey: string): Promise<FormSchema | null> {
    const result = this.db.prepare(`
      SELECT
        f.*,
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
      FROM forms f
      LEFT JOIN data_connectors dc ON f.data_connector_id = dc.id
      WHERE f.form_key = ?
    `).get(formKey);
    return result ? this.mapDataRow(asDbRow(result)) : null;
  }

  /**
   * Get form by ID.
   */
  async findById(id: number): Promise<FormSchema | null> {
    const result = this.db.prepare(`
      SELECT
        f.*,
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
      FROM forms f
      LEFT JOIN data_connectors dc ON f.data_connector_id = dc.id
      WHERE f.id = ?
    `).get(id);
    return result ? this.mapDataRow(asDbRow(result)) : null;
  }

  /**
   * Create a new form.
   */
  async create(data: Omit<FormSchema, 'id' | 'created_at' | 'updated_at'>): Promise<FormSchema> {
    const insert = this.db.prepare(`
      INSERT INTO forms (form_key, name, description, data_connector_id, schema_json, components_json, validation_json, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const isActive =
      data.is_active === undefined || data.is_active === null
        ? 1
        : data.is_active
          ? 1
          : 0;

    insert.run(
      data.formKey,
      data.name,
      data.description || null,
      data.dataConnecter?.id ?? null,
      serializeFormSchemaJson(data.model, data.columns, data.formActions),
      data.components ? JSON.stringify(data.components) : null,
      data.validationRules ? JSON.stringify(data.validationRules) : null,
      isActive,
    );

    const id = Number((this.db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id);
    if (!id) {
      throw new Error('Failed to insert form: no lastInsertRowId returned');
    }

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to retrieve created form');
    }
    return created;
  }

  /**
   * Update an existing form.
   */
  async update(id: number, data: Partial<FormSchema>): Promise<FormSchema | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.formKey !== undefined) { fields.push('form_key = ?'); params.push(data.formKey); }
    if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
    if (data.dataConnecter !== undefined) {
      fields.push('data_connector_id = ?');
      params.push(data.dataConnecter?.id ?? null);
    }
    if (data.model !== undefined || data.columns !== undefined || data.formActions !== undefined) {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }
      fields.push('schema_json = ?');
      params.push(
        serializeFormSchemaJson(
          data.model ?? existing.model,
          data.columns ?? existing.columns,
          data.formActions ?? existing.formActions,
        ),
      );
    }
    if (data.components !== undefined) { fields.push('components_json = ?'); params.push(JSON.stringify(data.components)); }
    if (data.validationRules !== undefined) { fields.push('validation_json = ?'); params.push(JSON.stringify(data.validationRules)); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE forms SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    this.db.prepare(sql).run(...params);
    return this.findById(id);
  }

  /**
   * Delete a form by ID.
   */
  async delete(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM forms WHERE id = ?').run(id);
    return (result.changes as number) > 0;
  }

  /**
   * Delete a form by key.
   */
  async deleteByKey(key: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM forms WHERE form_key = ?').run(key);
    return (result.changes as number) > 0;
  }

  /**
   * Activate a form.
   */
  async activate(id: number): Promise<FormSchema | null> {
    return this.update(id, { is_active: true });
  }

  /**
   * Deactivate a form.
   */
  async deactivate(id: number): Promise<FormSchema | null> {
    return this.update(id, { is_active: false });
  }

  /**
   * Get count of active forms.
   */
  async getActiveCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM forms WHERE is_active = 1').get() as { count: number };
    return result.count;
  }

  /**
   * Get count of all forms.
   */
  async getCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM forms').get() as { count: number };
    return result.count;
  }

  mapDataRows(rows: unknown[]): FormSchema[] {
    return rows.map((row) => this.mapDataRow(asDbRow(row)))
  }

  mapDataRow(data: Record<string, unknown>): FormSchema {
    const safeJson = <T>(raw: string | null | undefined, fallback: T): T => {
      if (!raw) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    };

    // Build full DataConnector from JOIN result (columns are prefixed with 'dc.')
    // Handle both JOINed queries and direct SELECT * FROM forms
    const hasJoinedColumns = data.dc_app_name !== undefined;

    const dataConnector = hasJoinedColumns && data.data_connector_id
      ? {
        id: data.data_connector_id,
        appName: data.dc_app_name || null,
        entityName: data.dc_entity_name || null,
        discoveryUrl: data.dc_discovery_url || null,
        discoveryType: data.dc_discovery_type || null,
        entityModel: asJsonColumnString(data.dc_entity_model) ? safeJson<unknown>(asJsonColumnString(data.dc_entity_model), null) : null,
        endpoints: asJsonColumnString(data.dc_endpoints) ? safeJson<unknown>(asJsonColumnString(data.dc_endpoints), null) : null,
        capabilities: asJsonColumnString(data.dc_capabilities) ? safeJson<unknown>(asJsonColumnString(data.dc_capabilities), null) : null,
        createdAt: data.dc_created_at || null,
        updatedAt: data.dc_updated_at || null,
        last_verified_at: data.dc_last_verified_at || null,
        is_active: data.dc_is_active ?? 0,
      } as DataConnector
      : null;

      let processedComponents: unknown[] = [];
      const formComponents = asJsonColumnString(data.components_json)
        ? safeJson<FormComponent[]>(asJsonColumnString(data.components_json), [])
        : [];

      const connectorForRuntime =
        dataConnector != null ? mergeHelpDeskTicketLookupsOntoConnector(dataConnector) : null;

      if (connectorForRuntime?.endpoints?.lookups?.length) {
        processedComponents = syncFormComponentTypesFromConnector(connectorForRuntime, formComponents);
      } else {
        processedComponents = formComponents;
      }

    const { model, columns, formActions } = parseFormSchemaJson(asOptionalString(data.schema_json));

    return {
      id: data.id,
      formKey: data.form_key,
      name: data.name,
      description: data.description,
      components: processedComponents,
      validationRules: asJsonColumnString(data.validation_json)
        ? safeJson<unknown>(asJsonColumnString(data.validation_json), {})
        : {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      model,
      columns,
      formActions,
      is_active: data.is_active,
      dataConnecter: connectorForRuntime ?? dataConnector,
    } as FormSchema
  }
}
