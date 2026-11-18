import type { Task, TaskList } from '../types';

export interface DashboardChartSegment {
  key: string;
  label: string;
  value: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const STATUS_ORDER = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

function countByField(
  tasks: Task[],
  field: 'status' | 'priority',
  labelMap: Record<string, string>,
  orderedKeys: string[],
): DashboardChartSegment[] {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const key = String(task[field] ?? '_empty');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const segments = orderedKeys
    .filter((key) => counts.has(key))
    .map((key) => ({
      key,
      label: labelMap[key] ?? key,
      value: counts.get(key) ?? 0,
    }));
  for (const [key, value] of counts) {
    if (orderedKeys.includes(key) || key === '_empty') {
      continue;
    }
    segments.push({
      key,
      label: labelMap[key] ?? key,
      value,
    });
  }
  return segments;
}

export function taskStatusCounts(tasks: Task[]): DashboardChartSegment[] {
  return countByField(tasks, 'status', STATUS_LABELS, STATUS_ORDER);
}

export function taskPriorityCounts(tasks: Task[]): DashboardChartSegment[] {
  return countByField(tasks, 'priority', PRIORITY_LABELS, PRIORITY_ORDER);
}

export function openTasksByListSegments(lists: TaskList[]): DashboardChartSegment[] {
  return lists.map((list) => ({
    key: String(list.id),
    label: list.name,
    value: Math.max(0, list.taskCount - list.completedCount),
  }));
}
