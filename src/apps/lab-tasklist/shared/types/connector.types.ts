import type { TaskPriority, TaskStatus } from './task.types';

/** Payload shape for Forms Builder / connector CRUD (camelCase field keys). */
export interface ConnectorTaskRecord {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assigneeId?: string;
  tags: string[];
  taskListId?: number;
  /** JSON string; typically set by host apps (CRM), not shown on default task forms */
  metadata?: string | null;
}

export interface ConnectorTaskListRecord {
  id: number;
  name: string;
  description: string;
}

export interface ConnectorTaskCreateBody {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  assigneeId?: string;
  tags?: string[];
  taskListId?: number;
  metadata?: string | null;
  id?: number;
}

export interface ConnectorTaskUpdateBody extends Partial<ConnectorTaskCreateBody> {
  id?: number;
}

export interface ConnectorTaskListCreateBody {
  name: string;
  description?: string;
}

export interface ConnectorTaskListUpdateBody extends Partial<ConnectorTaskListCreateBody> {
  id?: number;
}
