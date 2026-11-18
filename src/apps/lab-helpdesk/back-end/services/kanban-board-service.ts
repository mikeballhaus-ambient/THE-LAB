import { randomUUID } from 'node:crypto';
import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import type {
  KanbanBoard,
  KanbanBoardColumn,
  KanbanBoardCreateInput,
  KanbanBoardFieldKey,
  KanbanBoardUpdateInput,
} from '../../shared/types/kanban-board.types';
import { parseKanbanColumnsJson, serializeKanbanColumns } from '../../shared/utils/kanban-board-utils';
import { seedKanbanSystemBoardsIfMissing } from '../db/seed-kanban-defaults';

const ALLOWED_FIELDS = new Set<KanbanBoardFieldKey>(['status', 'priority', 'assigneeId']);

export class KanbanBoardService {
  private static instance: KanbanBoardService | null = null;

  private get db(): AppDatabaseServiceProxy {
    return AppDatabaseServiceProxy.getInstance();
  }

  public static getInstance(): KanbanBoardService {
    if (!this.instance) {
      this.instance = new KanbanBoardService();
    }
    return this.instance;
  }

  private mapRow(row: Record<string, unknown>): KanbanBoard {
    return {
      id: Number(row.id),
      name: String(row.name ?? ''),
      fieldKey: row.field_key as KanbanBoardFieldKey,
      columns: parseKanbanColumnsJson(String(row.columns_json ?? '[]')),
      sortOrder: Number(row.sort_order ?? 0),
      isSystem: Number(row.is_system ?? 0) === 1,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private validateInput(
    fieldKey: KanbanBoardFieldKey,
    columns: KanbanBoardColumn[],
    name: string,
  ): string | null {
    if (!name.trim()) {
      return 'name is required';
    }
    if (!ALLOWED_FIELDS.has(fieldKey)) {
      return 'invalid fieldKey';
    }
    if (columns.length === 0) {
      return 'at least one column is required';
    }
    const values = new Set<string>();
    for (const col of columns) {
      if (!col.label.trim()) {
        return 'each column needs a label';
      }
      if (!col.value.trim()) {
        return 'each column needs a value';
      }
      if (values.has(col.value)) {
        return 'column values must be unique';
      }
      values.add(col.value);
    }
    return null;
  }

  private normalizeColumns(columns: KanbanBoardColumn[]): KanbanBoardColumn[] {
    return columns.map(col => ({
      id: col.id?.trim() || randomUUID(),
      label: col.label.trim(),
      value: col.value.trim(),
    }));
  }

  public async list(): Promise<KanbanBoard[]> {
    const result = await this.db.select({
      sql: 'SELECT * FROM kanban_boards ORDER BY sort_order ASC, id ASC',
      params: [],
    });
    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  public async getById(id: number): Promise<KanbanBoard | null> {
    const result = await this.db.select({
      sql: 'SELECT * FROM kanban_boards WHERE id = ?',
      params: [String(id)],
    });
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0] as Record<string, unknown>);
  }

  public async create(input: KanbanBoardCreateInput): Promise<KanbanBoard | null> {
    const columns = this.normalizeColumns(input.columns);
    const err = this.validateInput(input.fieldKey, columns, input.name);
    if (err) {
      throw new Error(err);
    }
    const now = new Date().toISOString();
    const insert = await this.db.insert({
      tableName: 'kanban_boards',
      data: {
        name: input.name.trim(),
        field_key: input.fieldKey,
        columns_json: serializeKanbanColumns(columns),
        sort_order: input.sortOrder ?? 0,
        is_system: 0,
        created_at: now,
        updated_at: now,
      },
    });
    if (!insert.success || insert.insertId == null) {
      return null;
    }
    return await this.getById(insert.insertId);
  }

  public async update(id: number, input: KanbanBoardUpdateInput): Promise<KanbanBoard | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }
    const name = input.name !== undefined ? input.name : existing.name;
    const fieldKey = input.fieldKey !== undefined ? input.fieldKey : existing.fieldKey;
    const columns = input.columns !== undefined
      ? this.normalizeColumns(input.columns)
      : existing.columns;
    const err = this.validateInput(fieldKey, columns, name);
    if (err) {
      throw new Error(err);
    }
    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      name: name.trim(),
      field_key: fieldKey,
      columns_json: serializeKanbanColumns(columns),
    };
    if (input.sortOrder !== undefined) {
      data.sort_order = input.sortOrder;
    }
    const result = await this.db.update({
      tableName: 'kanban_boards',
      data,
      where: { id },
    });
    if (!result.success) {
      return null;
    }
    return await this.getById(id);
  }

  public async delete(id: number): Promise<{ ok: boolean; error?: string }> {
    const existing = await this.getById(id);
    if (!existing) {
      return { ok: false, error: 'not found' };
    }
    if (existing.isSystem) {
      return { ok: false, error: 'system boards cannot be deleted' };
    }
    const result = await this.db.delete({ tableName: 'kanban_boards', where: { id } });
    return { ok: result.success && result.affected > 0 };
  }

  /** Seed default system boards when none exist (boot respects admin remove flag). */
  public async seedDefaultsIfEmpty(): Promise<void> {
    const rawDb = AppDatabaseServiceProxy.getInstance().getDb();
    seedKanbanSystemBoardsIfMissing(rawDb);
  }
}
