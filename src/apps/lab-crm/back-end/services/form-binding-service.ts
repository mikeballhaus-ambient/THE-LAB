import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import type { EntityFormBinding, FormBindingPurpose } from '../../shared/types/entity.types';
import { dedupeFormBindings } from '../../shared/utils/form-binding-resolution';
import { EntityDefinitionService } from './entity-definition-service';

interface BindingRow {
  id: number;
  entity_definition_id: number;
  purpose: string;
  form_key: string;
  is_default: number;
  entity_key?: string;
}

function mapRow(row: BindingRow): EntityFormBinding {
  return {
    id: row.id,
    entityDefinitionId: row.entity_definition_id,
    entityKey: row.entity_key,
    purpose: row.purpose as FormBindingPurpose,
    formKey: row.form_key,
    isDefault: row.is_default === 1,
  };
}

export class FormBindingService {
  private static instance: FormBindingService | null = null;

  public static getInstance(): FormBindingService {
    if (!this.instance) {
      this.instance = new FormBindingService();
    }
    return this.instance;
  }

  private get proxy(): AppDatabaseServiceProxy {
    return AppDatabaseServiceProxy.getInstance();
  }

  async listBindings(entityKey?: string): Promise<EntityFormBinding[]> {
    if (entityKey) {
      const def = await EntityDefinitionService.getInstance().getByEntityKey(entityKey);
      if (!def) {
        return [];
      }
      const result = await this.proxy.select({
        sql: 'SELECT b.*, ? as entity_key FROM entity_form_bindings b WHERE entity_definition_id = ?',
        params: [entityKey, def.id],
      });
      return dedupeFormBindings((result.rows as BindingRow[]).map(mapRow));
    }
    const result = await this.proxy.select({
      sql: `
        SELECT b.*, d.entity_key
        FROM entity_form_bindings b
        JOIN entity_definitions d ON d.id = b.entity_definition_id
        ORDER BY d.sort_order, b.purpose
      `,
      params: [],
    });
    return dedupeFormBindings((result.rows as BindingRow[]).map(mapRow));
  }

  async getDefaultFormKey(
    entityKey: string,
    purpose: FormBindingPurpose,
  ): Promise<string | null> {
    const bindings = await this.listBindings(entityKey);
    const match = bindings.find((b) => b.purpose === purpose);
    return match?.formKey ?? null;
  }

  async upsertBinding(input: {
    entityKey: string;
    purpose: FormBindingPurpose;
    formKey: string;
    isDefault?: boolean;
  }): Promise<EntityFormBinding | null> {
    const def = await EntityDefinitionService.getInstance().getByEntityKey(input.entityKey);
    if (!def) {
      return null;
    }
    // One row per purpose — replace all rows for this purpose (avoids UNIQUE conflicts on form_key).
    const removed = await this.proxy.delete({
      tableName: 'entity_form_bindings',
      where: { entity_definition_id: def.id, purpose: input.purpose },
    });
    if (!removed.success) {
      throw new Error(removed.error ?? 'Failed to clear form binding');
    }

    const isDefault = input.isDefault !== false ? 1 : 0;
    const inserted = await this.proxy.insert({
      tableName: 'entity_form_bindings',
      data: {
        entity_definition_id: def.id,
        purpose: input.purpose,
        form_key: input.formKey,
        is_default: isDefault,
      },
    });
    if (!inserted.success) {
      throw new Error(inserted.error ?? 'Failed to insert form binding');
    }
    return {
      id: inserted.insertId,
      entityDefinitionId: def.id,
      entityKey: input.entityKey,
      purpose: input.purpose,
      formKey: input.formKey,
      isDefault: isDefault === 1,
    };
  }

  /** Rows that would be removed by {@link dedupeStoredBindings}. */
  async countStaleDuplicateRows(): Promise<number> {
    const result = await this.proxy.select({
      sql: `
        SELECT b.*, d.entity_key
        FROM entity_form_bindings b
        JOIN entity_definitions d ON d.id = b.entity_definition_id
      `,
      params: [],
    });
    const all = (result.rows as BindingRow[]).map(mapRow);
    return Math.max(0, all.length - dedupeFormBindings(all).length);
  }

  /** Remove legacy duplicate rows (same entity + purpose); keeps highest id. */
  async dedupeStoredBindings(): Promise<number> {
    const result = await this.proxy.select({
      sql: `
        SELECT b.*, d.entity_key
        FROM entity_form_bindings b
        JOIN entity_definitions d ON d.id = b.entity_definition_id
      `,
      params: [],
    });
    const all = (result.rows as BindingRow[]).map(mapRow);
    const keepIds = new Set(dedupeFormBindings(all).map((b) => b.id));
    let removed = 0;
    for (const row of all) {
      if (keepIds.has(row.id)) {
        continue;
      }
      const deleted = await this.proxy.delete({
        tableName: 'entity_form_bindings',
        where: { id: row.id },
      });
      if (deleted.success) {
        removed += deleted.affected;
      }
    }
    return removed;
  }

  async setEntityFormKey(entityKey: string, formKey: string): Promise<void> {
    for (const purpose of ['create', 'edit'] as const) {
      const row = await this.upsertBinding({
        entityKey,
        purpose,
        formKey,
        isDefault: true,
      });
      if (!row) {
        throw new Error(`Unknown entity: ${entityKey}`);
      }
    }
    await this.dedupeStoredBindings();
  }

  async deleteBinding(id: number): Promise<boolean> {
    const result = await this.proxy.delete({
      tableName: 'entity_form_bindings',
      where: { id },
    });
    return result.affected > 0;
  }
}
