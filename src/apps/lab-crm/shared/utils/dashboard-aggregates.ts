import type { ConnectorEntityRecord } from '../types/entity.types';
import { formatCrmCurrencyAmount } from './record-list-display';

export interface DashboardChartSegment {
  key: string;
  label: string;
  value: number;
}

/** Canonical sales pipeline order for bar/funnel charts (not value-sorted). */
export const SALES_PIPELINE_STAGE_ORDER = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed-won',
  'closed-lost',
];

const STAGE_LABELS: Record<string, string> = {
  prospecting: 'Prospecting',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  'closed-won': 'Closed won',
  'closed-lost': 'Closed lost',
};

const SERVICE_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

function fieldValue(record: ConnectorEntityRecord, field: string): unknown {
  if (field in record) {
    return record[field];
  }
  const nested = record.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested) && field in nested) {
    return (nested as Record<string, unknown>)[field];
  }
  return undefined;
}

export function countRecordsByEnumField(
  records: ConnectorEntityRecord[],
  field: string,
  labelMap: Record<string, string> = {},
): DashboardChartSegment[] {
  const counts = new Map<string, number>();
  for (const row of records) {
    const raw = fieldValue(row, field);
    const key = raw == null || raw === '' ? '_empty' : String(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: key === '_empty' ? 'Unset' : labelMap[key] ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

export function sumNumericField(records: ConnectorEntityRecord[], field: string): number {
  let total = 0;
  for (const row of records) {
    const raw = fieldValue(row, field);
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(n)) {
      total += n;
    }
  }
  return total;
}

export function pipelineByStage(records: ConnectorEntityRecord[]): DashboardChartSegment[] {
  const sums = new Map<string, number>();
  for (const row of records) {
    const stage = String(fieldValue(row, 'stage') ?? '_empty');
    const raw = fieldValue(row, 'amount');
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) {
      continue;
    }
    sums.set(stage, (sums.get(stage) ?? 0) + n);
  }
  return [...sums.entries()]
    .map(([key, value]) => ({
      key,
      label: key === '_empty' ? 'Unset' : STAGE_LABELS[key] ?? key,
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);
}

export function salesStageCounts(records: ConnectorEntityRecord[]): DashboardChartSegment[] {
  return countRecordsByEnumField(records, 'stage', STAGE_LABELS);
}

export function orderSegmentsByKeys(
  segments: DashboardChartSegment[],
  keyOrder: string[],
): DashboardChartSegment[] {
  const byKey = new Map(segments.map((s) => [s.key, s]));
  const ordered = keyOrder
    .map((key) => byKey.get(key))
    .filter((s): s is DashboardChartSegment => s != null);
  const rest = segments.filter((s) => !keyOrder.includes(s.key));
  return [...ordered, ...rest];
}

export function salesStageCountsInPipelineOrder(
  records: ConnectorEntityRecord[],
): DashboardChartSegment[] {
  return orderSegmentsByKeys(salesStageCounts(records), SALES_PIPELINE_STAGE_ORDER);
}

export function serviceStatusCounts(records: ConnectorEntityRecord[]): DashboardChartSegment[] {
  return countRecordsByEnumField(records, 'status', SERVICE_STATUS_LABELS);
}

export function servicePriorityCounts(records: ConnectorEntityRecord[]): DashboardChartSegment[] {
  return countRecordsByEnumField(records, 'priority', PRIORITY_LABELS);
}

export function formatCurrency(amount: number): string {
  return formatCrmCurrencyAmount(amount);
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function taskStatusCounts(tasks: { status: string }[]): DashboardChartSegment[] {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const key = task.status?.trim() || '_empty';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: key === '_empty' ? 'Unset' : TASK_STATUS_LABELS[key] ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

export function taskPriorityCounts(tasks: { priority: string }[]): DashboardChartSegment[] {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const key = task.priority?.trim() || '_empty';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: key === '_empty' ? 'Unset' : PRIORITY_LABELS[key] ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

export function countTasksByStatus(tasks: { status: string }[], status: string): number {
  return tasks.filter((t) => t.status === status).length;
}
