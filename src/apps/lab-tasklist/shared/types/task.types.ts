// Task Management System - Shared Types
// This file defines the core interfaces for task management

/**
 * TaskStatus represents the current state of a task
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * TaskPriority represents the priority level of a task
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Task represents a single task item in the system
 */
export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
  completedAt?: Date;
  /** JSON string (host-app context, e.g. CRM entity linkage) */
  metadata?: string | null;
}

/**
 * TaskList represents a collection of related tasks
 */
export interface TaskList {
  id: number;
  name: string;
  description?: string;
  /** THE-LAB host app registry id; null = standalone Task List app */
  appId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  taskCount: number;
  completedCount: number;
  tasks: Task[];
}

/**
 * TaskFilter represents filter criteria for querying tasks
 */
export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  tags?: string[];
  startDate?: Date | string;
  endDate?: Date | string;
  searchQuery?: string;
}

/**
 * TaskSort represents sorting options for tasks
 */
export interface TaskSort {
  field: keyof Task;
  direction: 'asc' | 'desc';
}

/**
 * TaskCreateInput represents input for creating a new task
 */
export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
  taskListId?: number;
  metadata?: string | null;
}

/**
 * TaskUpdateInput represents input for updating an existing task
 */
export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
  completedAt?: Date;
  metadata?: string | null;
}

/**
 * TaskWithRelations extends Task with related data
 */
export interface TaskWithRelations extends Task {
  list?: TaskList;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * PaginationInfo represents pagination metadata
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * TaskListResponse represents a paginated task list response
 */
export interface TaskListResponse {
  tasks: Task[];
  pagination: PaginationInfo;
  filters: TaskFilter;
}

/**
 * TaskStats represents aggregate statistics for tasks
 */
export interface TaskStats {
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
}

/**
 * TaskListWithTasks extends TaskList with related tasks
 */
export interface TaskListWithTasks extends TaskList {
  tasks: Task[];
}

/**
 * FindTaskListsFilter represents filter criteria for querying task lists
 */
export interface FindTaskListsFilter {
  searchQuery?: string;
  limit?: number;
  offset?: number;
  page?: number;
  /** Filter by host app; omit = Task List native scope (app_id null only) */
  appId?: string | null;
}

/**
 * TaskListsWithTasksResponse represents a paginated task list response
 * with filters applied
 */
export interface TaskListsWithTasksResponse {
  lists: TaskListWithTasks[];
  pagination: PaginationInfo;
  filters: FindTaskListsFilter;
}
