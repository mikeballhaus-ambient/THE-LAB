import { IUpdateParams, IUpdateResponse } from '@/shared/types/app/app-database';
import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import { Task, TaskStatus, TaskPriority, TaskFilter, TaskSort, TaskCreateInput, TaskUpdateInput, PaginationInfo, TaskListResponse } from '../../shared/types/task.types';
import { normalizeTaskMetadata } from '../../shared/utils/normalize-task-metadata';
import { normalizeStoredDueDate, parseDueDateValue } from '@/shared/utils/calendar-date';

const TASK_SORT_SQL_COLUMNS: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  dueDate: 'due_date',
  priority: 'priority',
  status: 'status',
  title: 'title',
};

function resolveTaskSortColumn(field: string): string {
  return TASK_SORT_SQL_COLUMNS[field] ?? 'created_at';
}

export class TaskService {
  private static instance: TaskService | null = null;
  private dbProxy: AppDatabaseServiceProxy;

  private constructor() {
    this.dbProxy = AppDatabaseServiceProxy.getInstance();
  }

  public static getInstance(): TaskService {
    if (!this.instance) {
      this.instance = new TaskService();
    }
    return this.instance;
  }

  // Create a new task
  private serializeDueDateForDb(value: Date | string | undefined | null): string | null {
    return normalizeStoredDueDate(value);
  }

  public async createTask(input: TaskCreateInput): Promise<Task | null> {
    const taskData: Record<string, unknown> = {
      title: input.title,
      description: input.description || '',
      status: input.status || TaskStatus.PENDING,
      priority: input.priority,
      due_date: this.serializeDueDateForDb(input.dueDate ?? null),
      assignee_id: input.assigneeId || null,
      tags: input.tags ? JSON.stringify(input.tags) : '[]',
      metadata: normalizeTaskMetadata(input.metadata),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const insertResult = await this.dbProxy.insert({
      tableName: 'tasks',
      data: taskData
    });

    if (!insertResult.success) {
      throw new Error(`Failed to create task: ${insertResult.error}`);
    }

    taskData.id = insertResult.insertId

    return await this.getTask(insertResult.insertId)
  }

  // Get a single task by ID
  public async getTask(id: number): Promise<Task | null> {
    const result = await this.dbProxy.select({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      params: [id]
    });

    if (result.rows.length === 0) return null;

    return this.mapTaskFromRow(result.rows[0] as Record<string, unknown>);
  }

  // Update an existing task
  public async updateTask(id: number, updates: TaskUpdateInput): Promise<Task | null> {
    const existingTask = await this.getTask(id);
    if (!existingTask) return null;

    const updateData: Record<string, string | null> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.dueDate !== undefined) {
      updateData.due_date = updates.dueDate == null ? null : this.serializeDueDateForDb(updates.dueDate);
    }
    if (updates.assigneeId !== undefined) updateData.assignee_id = updates.assigneeId || null;
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt instanceof Date ? updates.completedAt.toISOString() : null;
    if (updates.metadata !== undefined) {
      updateData.metadata = normalizeTaskMetadata(updates.metadata);
    }

    updateData.updated_at = new Date().toISOString();

    const updateResult = await this.dbProxy.update({
      tableName: 'tasks',
      data: updateData,
      where: { id: id }
    } as IUpdateParams) as IUpdateResponse;

    if (!updateResult.success) {
      return null;
    }

    return await this.getTask(id)
  }

  // Delete a task
  public async deleteTask(id: number): Promise<boolean> {
    const result = await this.dbProxy.delete({
      tableName: 'tasks',
      where: { id: id }
    });

    return result.success && result.affected > 0;
  }

  // Find tasks with filtering and pagination
  public async findTasks(filter?: TaskFilter, sort?: TaskSort, pagination?: PaginationInfo): Promise<TaskListResponse> {
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params: (string | number)[] = [];

    // Apply filters
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter?.priority) {
      sql += ' AND priority = ?';
      params.push(filter.priority);
    }

    if (filter?.assigneeId) {
      sql += ' AND assignee_id = ?';
      params.push(filter.assigneeId);
    }

    if (filter?.tags && filter.tags.length > 0) {
      const tagConditions = filter.tags.map(() => 'tags LIKE ?').join(' OR ');
      sql += ` AND (${tagConditions})`;
      params.push(...filter.tags.map((tag) => `%${tag}%`));
    }

    if (filter?.startDate) {
      sql += ' AND created_at >= ?';
      params.push(filter.startDate instanceof Date ? filter.startDate.toISOString() : filter.startDate);
    }

    if (filter?.endDate) {
      sql += ' AND created_at <= ?';
      params.push(filter.endDate instanceof Date ? filter.endDate.toISOString() : filter.endDate);
    }

    // Apply sorting
    if (sort) {
      const direction = sort.direction === 'asc' ? 'ASC' : 'DESC';
      sql += ` ORDER BY ${resolveTaskSortColumn(String(sort.field))} ${direction}`;
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    // Apply pagination
    const limit = pagination?.limit || 20;
    const offset = pagination?.page ? (pagination.page - 1) * limit : 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Execute query
    const result = await this.dbProxy.select({
      sql,
      params: params.map(String),
      limit,
      offset,
    });

    if (!result.success) {
      throw new Error(result.error ?? 'Failed to query tasks');
    }

    const tasks = result.rows.map((row) => this.mapTaskFromRow(row as Record<string, unknown>));

    // Calculate total count for pagination
    // Calculate total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM tasks WHERE 1=1';
    const countParams: string[] = [];

    if (filter?.status) {
      countSql += ' AND status = ?';
      countParams.push(filter.status);
    }

    if (filter?.priority) {
      countSql += ' AND priority = ?';
      countParams.push(filter.priority);
    }

    if (filter?.assigneeId) {
      countSql += ' AND assignee_id = ?';
      countParams.push(filter.assigneeId);
    }

    if (filter?.tags && filter.tags.length > 0) {
      const tagConditions = filter.tags.map(() => `tags LIKE ?`).join(' OR ');
      countSql += ` AND (${tagConditions})`;
      countParams.push(...filter.tags.map(tag => `%${tag}%`));
    }

    if (filter?.startDate) {
      countSql += ' AND created_at >= ?';
      countParams.push(filter.startDate instanceof Date ? filter.startDate.toISOString() : filter.startDate);
    }

    if (filter?.endDate) {
      countSql += ' AND created_at <= ?';
      countParams.push(filter.endDate instanceof Date ? filter.endDate.toISOString() : filter.endDate);
    }

    const countResult = await this.dbProxy.select({
      sql: countSql,
      params: countParams
    });

    const countRow = countResult.rows[0] as Record<string, unknown> | undefined;
    const total = Number(countRow?.total) || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      tasks,
      pagination: {
        page: pagination?.page || 1,
        limit,
        total,
        totalPages
      },
      filters: filter || {}
    };
  }

  // Mark task as completed
  public async markTaskCompleted(id: number): Promise<Task | null> {
    const task = await this.getTask(id);
    if (!task) return null;

    return this.updateTask(id, {
      status: TaskStatus.COMPLETED,
      completedAt: new Date()
    });
  }

  // Mark task as pending
  public async markTaskPending(id: number): Promise<Task | null> {
    const task = await this.getTask(id);
    if (!task) return null;

    return this.updateTask(id, {
      status: TaskStatus.PENDING
    });
  }

  // Mark task as cancelled
  public async markTaskCancelled(id: number): Promise<Task | null> {
    const task = await this.getTask(id);
    if (!task) return null;

    return this.updateTask(id, {
      status: TaskStatus.CANCELLED
    });
  }

  // Get task statistics
  public async getTaskStats(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
    byPriority: {
      urgent: number;
      high: number;
      medium: number;
      low: number;
    };
    byStatus: {
      pending: number;
      in_progress: number;
      completed: number;
      cancelled: number;
    };
  }> {
    const stats = await this.dbProxy.select({
      sql: `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low
        FROM tasks
      `
    });

    const row = stats.rows[0] as Record<string, number | null | undefined> | undefined;
    return {
      total: Number(row?.total) || 0,
      completed: Number(row?.completed) || 0,
      inProgress: Number(row?.in_progress) || 0,
      pending: Number(row?.pending) || 0,
      cancelled: Number(row?.cancelled) || 0,
      byPriority: {
        urgent: Number(row?.urgent) || 0,
        high: Number(row?.high) || 0,
        medium: Number(row?.medium) || 0,
        low: Number(row?.low) || 0
      },
      byStatus: {
        pending: Number(row?.pending) || 0,
        in_progress: Number(row?.in_progress) || 0,
        completed: Number(row?.completed) || 0,
        cancelled: Number(row?.cancelled) || 0
      }
    };
  }

  private mapTaskFromRow(row: Record<string, unknown>): Task {
    return {
      id: Number(row.id),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      dueDate: row.due_date ? parseDueDateValue(String(row.due_date)) : undefined,
      assigneeId: row.assignee_id != null ? String(row.assignee_id) : undefined,
      tags: row.tags ? JSON.parse(String(row.tags)) : [],
      completedAt: row.completed_at ? new Date(String(row.completed_at)) : undefined,
      metadata: row.metadata != null && String(row.metadata).trim() !== '' ? String(row.metadata) : undefined,
    };
  }
}
