import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import {
  listMatchesHostScope,
  normalizeTaskListAppId,
  type TaskListHostAppId,
} from '../../shared/constants/app-scope';
import { taskListScopeWhere } from '../../shared/utils/task-list-scope-sql';
import { taskMetadataEntityFilter } from '../../shared/utils/task-metadata-filter';
import {
  TaskList,
  Task,
  TaskListWithTasks,
  FindTaskListsFilter,
  TaskListsWithTasksResponse,
} from '../../shared/types/task.types';
import { parseDueDateValue } from '@/shared/utils/calendar-date';

export class TaskListService {
  private static instance: TaskListService | null = null;
  private dbProxy: AppDatabaseServiceProxy;

  private constructor() {
    this.dbProxy = AppDatabaseServiceProxy.getInstance();
  }

  public static getInstance(): TaskListService {
    if (!this.instance) {
      this.instance = new TaskListService();
    }
    return this.instance;
  }

  public async getListAppId(id: number): Promise<TaskListHostAppId | undefined> {
    const result = await this.dbProxy.select({
      sql: 'SELECT app_id FROM task_lists WHERE id = ?',
      params: [id],
    });
    if (result.rows.length === 0) {
      return undefined;
    }
    return normalizeTaskListAppId((result.rows[0] as Record<string, unknown>).app_id);
  }

  public async assertListInHostScope(
    listId: number | string,
    hostScope: TaskListHostAppId,
  ): Promise<boolean> {
    const numericId = Number.parseInt(String(listId), 10);
    if (!Number.isFinite(numericId)) {
      return false;
    }
    const listAppId = await this.getListAppId(numericId);
    if (listAppId === undefined) {
      return false;
    }
    return listMatchesHostScope(listAppId, hostScope);
  }

  // Create a new task list
  public async createList(input: {
    name: string;
    description?: string;
    appId?: TaskListHostAppId;
  }): Promise<TaskList | null> {
    const listData: Record<string, string> = {
      name: input.name,
      description: input.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const appId = normalizeTaskListAppId(input.appId);
    if (appId) {
      listData.app_id = appId;
    }

    const insertResult = await this.dbProxy.insert({
      tableName: 'task_lists',
      data: listData
    });

    if (!insertResult.success) {
      return null;
    }

    const newList = await this.getList(insertResult.insertId, appId ?? null);

    return newList;
  }

  // Get a single task list by ID
  public async getList(
    id: number,
    hostScope: TaskListHostAppId = null,
  ): Promise<TaskListWithTasks | null> {
    const result = await this.dbProxy.select({
      sql: 'SELECT * FROM task_lists WHERE id = ?',
      params: [id],
    });

    if (result.rows.length === 0) return null;

    const list = this.mapListFromRow(result.rows[0] as Record<string, unknown>);
    if (!listMatchesHostScope(list.appId ?? null, hostScope)) {
      return null;
    }

    // Get tasks in this list
    const tasksResult = await this.dbProxy.select({
      sql: 'SELECT t.* FROM tasks t JOIN task_list_tasks tlt ON t.id = tlt.task_id WHERE tlt.task_list_id = ?',
      params: [id]
    });

    const tasks = tasksResult.rows.map((row) => this.mapTaskFromRow(row as Record<string, unknown>));

    // Calculate completed count
    const completedCount = tasks.filter(t => t.status === 'completed').length;

    return {
      ...list,
      tasks,
      taskCount: tasks.length,
      completedCount: completedCount
    };
  }

  // Update an existing task list
  public async updateList(
    id: number,
    updates: {
      name?: string;
      description?: string;
    },
    hostScope: TaskListHostAppId = null,
  ): Promise<TaskList | null> {
    const existingList = await this.getList(id, hostScope);
    if (!existingList) return null;

    const updatedList = {
      ...existingList,
      name: updates.name || existingList.name,
      description: updates.description !== undefined ? updates.description : existingList.description,
      updatedAt: new Date()
    };

    const updateData: Record<string, string> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    updateData.updated_at = new Date().toISOString();

    const updateResult = await this.dbProxy.update({
      tableName: 'task_lists',
      data: updateData,
      where: { id: id }
    });

    if (!updateResult.success) {
      return null;
    }

    return updatedList;
  }

  // Delete a task list
  public async deleteList(id: string, hostScope: TaskListHostAppId = null): Promise<boolean> {
    const numericId = Number(id);
    if (!Number.isNaN(numericId) && !(await this.assertListInHostScope(numericId, hostScope))) {
      return false;
    }
    // First, delete all task_list_tasks entries
    const deleteTasksResult = await this.dbProxy.executeRaw({
      sql: 'DELETE FROM task_list_tasks WHERE task_list_id = ?',
      params: [id]
    });

    if (!deleteTasksResult.success) {
      return false;
    }

    // Then delete the list
    const result = await this.dbProxy.delete({
      tableName: 'task_lists',
      where: { id: id }
    });

    return result.success && result.affected > 0;
  }

  // Find task lists with filtering and pagination
  public async findLists(filter?: FindTaskListsFilter): Promise<TaskListsWithTasksResponse> {
    const hostScope =
      filter && 'appId' in filter && filter.appId !== undefined
        ? normalizeTaskListAppId(filter.appId)
        : null;

    let sql = 'SELECT * FROM task_lists WHERE 1=1';
    const params: string[] = [];

    const scope = taskListScopeWhere(hostScope);
    sql += scope.clause;
    params.push(...scope.params);

    if (filter?.searchQuery) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${filter.searchQuery}%`, `%${filter.searchQuery}%`);
    }

    const limit = filter?.limit || 20;
    const offset = filter?.offset || 0;

    // Execute query
    const result = await this.dbProxy.select({
      sql,
      params,
      limit,
      offset
    });

    const total = result.rows.length || 0;
    const totalPages = Math.ceil(total / limit);

    // Build list with tasks - use for...of loop to properly await each query
    const lists: TaskListWithTasks[] = [];

    for (const row of result.rows) {
      const list = this.mapListFromRow(row as Record<string, unknown>);

      // Get tasks in this list - this is now outside .map(), so await is allowed
      const tasksResult = await this.dbProxy.select({
        sql: 'SELECT t.* FROM tasks t JOIN task_list_tasks tlt ON t.id = tlt.task_id WHERE tlt.task_list_id = ?',
        params: [list.id]
      });

      const tasks = tasksResult.rows.map((taskRow) => this.mapTaskFromRow(taskRow as Record<string, unknown>));

      list.tasks = tasks

      // Calculate completed count
      const completedCount = tasks.filter(t => t.status === 'completed').length;

      lists.push({
        ...list,
        taskCount: tasks.length,
        completedCount
      });
    }

    return {
      lists,
      pagination: {
        page: Math.round(offset / limit) + 1,
        limit,
        total,
        totalPages
      },
      filters: filter || {}
    };
  }

  /** Tasks belonging to any list with the given host app_id */
  public async findTasksForHostApp(
    hostAppId: string,
    options?: { entityKey?: string; recordId?: number },
  ): Promise<Task[]> {
    const scope = taskListScopeWhere(normalizeTaskListAppId(hostAppId));
    const listsResult = await this.dbProxy.select({
      sql: `SELECT id FROM task_lists WHERE 1=1${scope.clause}`,
      params: [...scope.params],
    });
    const listIds = listsResult.rows.map((row) => Number((row as Record<string, unknown>).id));
    if (listIds.length === 0) {
      return [];
    }
    const placeholders = listIds.map(() => '?').join(',');
    const metaFilter = taskMetadataEntityFilter(options?.entityKey, options?.recordId);
    const tasksResult = await this.dbProxy.select({
      sql: `SELECT DISTINCT t.* FROM tasks t
        JOIN task_list_tasks tlt ON t.id = tlt.task_id
        WHERE tlt.task_list_id IN (${placeholders})${metaFilter.clause}`,
      params: [...listIds.map(String), ...metaFilter.params.map(String)],
    });
    return tasksResult.rows.map((row) => this.mapTaskFromRow(row as Record<string, unknown>));
  }

  // Add a task to a list
  public async addTaskToList(
    taskListId: number,
    taskId: number,
    hostScope: TaskListHostAppId = null,
  ): Promise<boolean> {
    if (!(await this.assertListInHostScope(taskListId, hostScope))) {
      return false;
    }
    const existingJoin = await this.dbProxy.select({
      sql: 'SELECT * FROM task_list_tasks WHERE task_list_id = ? AND task_id = ?',
      params: [taskListId, taskId]
    });

    // Already linked — idempotent success (connector edit resends taskListId)
    if (existingJoin.rows.length > 0) {
      return true;
    }

    const insertResult = await this.dbProxy.insert({
      tableName: 'task_list_tasks',
      data: {
        task_list_id: taskListId,
        task_id: taskId,
        created_at: new Date().toISOString()
      }
    });

    return insertResult.success && insertResult.affected > 0;
  }

  // Remove a task from a list
  public async removeTaskFromList(taskListId: number, taskId: number): Promise<boolean> {
    const result = await this.dbProxy.delete({
      tableName: 'task_list_tasks',
      where: { task_list_id: taskListId, task_id: taskId }
    });

    return result.success && result.affected > 0;
  }

  // Get all tasks in a list (without list metadata)
  public async getTasksInList(
    taskListId: number | string,
    hostScope: TaskListHostAppId = null,
  ): Promise<Task[]> {
    const numericId = Number.parseInt(String(taskListId), 10);
    if (!Number.isFinite(numericId)) {
      return [];
    }
    if (!(await this.assertListInHostScope(numericId, hostScope))) {
      return [];
    }
    const result = await this.dbProxy.select({
      sql: 'SELECT t.* FROM tasks t JOIN task_list_tasks tlt ON t.id = tlt.task_id WHERE tlt.task_list_id = ?',
      params: [numericId]
    });

    return result.rows.map((row) => this.mapTaskFromRow(row as Record<string, unknown>));
  }

  // Get list statistics
  public async getListStats(taskListId: number): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
  }> {
    const result = await this.dbProxy.select({
      sql: `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM tasks t
        JOIN task_list_tasks tlt ON t.id = tlt.task_id
        WHERE tlt.task_list_id = ?
      `, params: [String(taskListId)]
    });

    const row = result.rows[0] as Record<string, number | null | undefined> | undefined;
    return {
      total: Number(row?.total) || 0,
      completed: Number(row?.completed) || 0,
      inProgress: Number(row?.in_progress) || 0,
      pending: Number(row?.pending) || 0,
      cancelled: Number(row?.cancelled) || 0
    };
  }

  private mapListFromRow(row: Record<string, unknown>): TaskList {
    return {
      id: Number(row.id),
      name: String(row.name ?? ''),
      description: String(row.description ?? ''),
      appId: normalizeTaskListAppId(row.app_id),
      taskCount: 0,
      completedCount: 0,
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    } as TaskList;
  }

  private mapTaskFromRow(row: Record<string, unknown>): Task {
    return {
      id: Number(row.id),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      status: row.status as Task['status'],
      priority: row.priority as Task['priority'],
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
