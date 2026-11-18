import type { Task } from '../../../shared/types/task.types';
import type {
  ConnectorTaskCreateBody,
  ConnectorTaskListRecord,
  ConnectorTaskRecord,
  ConnectorTaskUpdateBody,
} from '../../../shared/types/connector.types';
import { TaskPriority, TaskStatus } from '../../../shared/types/task.types';
import { normalizeTaskMetadata } from '../../../shared/utils/normalize-task-metadata';
import { normalizeStoredDueDate, parseDueDateValue } from '@/shared/utils/calendar-date';

export function formatDateForConnector(value: Date | string | undefined): string | undefined {
  const normalized = normalizeStoredDueDate(value ?? null);
  return normalized ?? undefined;
}

export function taskToConnectorRecord(task: Task, taskListId?: number): ConnectorTaskRecord {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    dueDate: formatDateForConnector(task.dueDate),
    assigneeId: task.assigneeId,
    tags: task.tags ?? [],
    ...(taskListId != null ? { taskListId } : {}),
    ...(task.metadata != null && task.metadata !== '' ? { metadata: task.metadata } : {}),
  };
}

export function listToConnectorRecord(list: {
  id: number;
  name: string;
  description?: string;
}): ConnectorTaskListRecord {
  return {
    id: list.id,
    name: list.name,
    description: list.description ?? '',
  };
}

export function parseConnectorTaskCreate(body: ConnectorTaskCreateBody): {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
  taskListId?: number;
  metadata?: string | null;
} {
  const priority = body.priority ?? TaskPriority.MEDIUM;
  const dueDate = parseDueDateValue(body.dueDate);
  return {
    title: body.title?.trim() ?? '',
    description: body.description,
    status: body.status ?? TaskStatus.PENDING,
    priority,
    dueDate,
    assigneeId: body.assigneeId,
    tags: body.tags,
    taskListId: body.taskListId != null ? Number(body.taskListId) : undefined,
    metadata: normalizeTaskMetadata(body.metadata),
  };
}

export function parseConnectorTaskUpdate(body: ConnectorTaskUpdateBody): {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
  taskListId?: number;
  metadata?: string | null;
} {
  const out: ReturnType<typeof parseConnectorTaskUpdate> = {};
  if (body.title !== undefined) {
    out.title = body.title;
  }
  if (body.description !== undefined) {
    out.description = body.description;
  }
  if (body.status !== undefined) {
    out.status = body.status;
  }
  if (body.priority !== undefined) {
    out.priority = body.priority;
  }
  if (body.dueDate !== undefined) {
    out.dueDate = body.dueDate ? parseDueDateValue(body.dueDate) : undefined;
  }
  if (body.assigneeId !== undefined) {
    out.assigneeId = body.assigneeId;
  }
  if (body.tags !== undefined) {
    out.tags = body.tags;
  }
  if (body.taskListId !== undefined && body.taskListId !== null) {
    out.taskListId = Number(body.taskListId);
  }
  if (body.metadata !== undefined) {
    out.metadata = normalizeTaskMetadata(body.metadata);
  }
  return out;
}
