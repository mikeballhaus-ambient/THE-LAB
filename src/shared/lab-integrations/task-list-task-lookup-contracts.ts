import { TaskPriority, TaskStatus } from '@/apps/lab-tasklist/shared/types/task.types';
import { TASK_LIST_APP_REGISTRY_ID } from '@/apps/lab-tasklist/shared/constants/app-scope';
import type { LookupContract } from '@/shared/types/forms-builder-integration';

const TASK_STATUS_LOOKUP = [
  { id: TaskStatus.PENDING, value: TaskStatus.PENDING, label: 'Pending' },
  { id: TaskStatus.IN_PROGRESS, value: TaskStatus.IN_PROGRESS, label: 'In progress' },
  { id: TaskStatus.COMPLETED, value: TaskStatus.COMPLETED, label: 'Completed' },
  { id: TaskStatus.CANCELLED, value: TaskStatus.CANCELLED, label: 'Cancelled' },
] as const;

const TASK_PRIORITY_LOOKUP = [
  { id: TaskPriority.LOW, value: TaskPriority.LOW, label: 'Low' },
  { id: TaskPriority.MEDIUM, value: TaskPriority.MEDIUM, label: 'Medium' },
  { id: TaskPriority.HIGH, value: TaskPriority.HIGH, label: 'High' },
  { id: TaskPriority.URGENT, value: TaskPriority.URGENT, label: 'Urgent' },
] as const;

const TASK_TAG_LOOKUP = [
  { id: 'bug', value: 'bug', label: 'Bug' },
  { id: 'feature', value: 'feature', label: 'Feature' },
  { id: 'docs', value: 'docs', label: 'Documentation' },
  { id: 'blocked', value: 'blocked', label: 'Blocked' },
  { id: 'review', value: 'review', label: 'Review' },
] as const;

/** Lookup endpoints for Task entity connector (Forms Builder autopopulate + runtime fetch). */
export function buildTaskEntityLookupContracts(apiBase: string): LookupContract[] {
  const base = apiBase.replace(/\/$/, '');
  return [
    {
      forProperty: 'status',
      endpoint: {
        url: `${base}/api/connector/tasks/statuses`,
        type: 'GET',
        data: {},
        response: [...TASK_STATUS_LOOKUP],
      },
    },
    {
      forProperty: 'priority',
      endpoint: {
        url: `${base}/api/connector/tasks/priorities`,
        type: 'GET',
        data: {},
        response: [...TASK_PRIORITY_LOOKUP],
      },
    },
    {
      forProperty: 'tags',
      endpoint: {
        url: `${base}/api/connector/tasks/tags`,
        type: 'GET',
        data: {},
        response: [...TASK_TAG_LOOKUP],
      },
    },
    {
      forProperty: 'taskListId',
      endpoint: {
        url: `${base}/api/connector/tasks/task-lists`,
        type: 'GET',
        data: {},
        response: [],
      },
    },
    {
      forProperty: 'assigneeId',
      endpoint: {
        url: `${base}/api/platform/users/lookup?appId=${encodeURIComponent(TASK_LIST_APP_REGISTRY_ID)}`,
        type: 'GET',
        data: {},
        response: [],
      },
    },
  ];
}
