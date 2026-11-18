import type { ChartDataPayload } from './chart-types';
import { parseDueDateValue } from '@/shared/utils/calendar-date';

export type ChartAggregateMeasure = 'count' | 'sum' | 'avg';

export type ChartDataMapping =
  | {
      mode: 'aggregate';
      groupByField: string;
      measure: ChartAggregateMeasure;
      measureField?: string;
      labelField?: string;
      datasetLabel?: string;
      /** Fixed bucket order (matches row values case-insensitively). */
      labelOrder?: string[];
      /** Sum each stage through the end — required for Chart.js funnel charts. */
      funnelCumulative?: boolean;
    }
  | {
      mode: 'dateRangeSeries';
      /** Row field used as the line / legend label (e.g. trip name). */
      seriesLabelField: string;
      startDateField: string;
      endDateField: string;
      /** Cap daily buckets on the x-axis (inclusive). */
      maxDays?: number;
    }
  | {
      mode: 'passthrough';
    };

/** Sum from each index through the end so funnel segments taper. */
export function toCumulativeFunnelValues(values: readonly number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  const out: number[] = [];
  let tailSum = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    tailSum += values[i];
    out.unshift(tailSum);
  }
  return out;
}

function formatGroupLabel(raw: string): string {
  if (!raw) {
    return raw;
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function bucketForKey(
  buckets: Map<string, { count: number; sum: number }>,
  key: string,
): { count: number; sum: number } {
  const direct = buckets.get(key);
  if (direct) {
    return direct;
  }
  const lower = key.toLowerCase();
  for (const [label, bucket] of buckets) {
    if (label.toLowerCase() === lower) {
      return bucket;
    }
  }
  return { count: 0, sum: 0 };
}

export interface ChartFilterSpec {
  contextKey: string;
  targetParam: string;
  required?: boolean;
}

export function aggregateRowsToChartData(
  rows: readonly Record<string, unknown>[],
  mapping: Extract<ChartDataMapping, { mode: 'aggregate' }>,
): ChartDataPayload {
  const buckets = new Map<string, { count: number; sum: number }>();

  for (const row of rows) {
    const rawGroup = row[mapping.groupByField];
    const label =
      rawGroup === null || rawGroup === undefined || rawGroup === ''
        ? '(empty)'
        : String(rawGroup);
    const bucket = buckets.get(label) ?? { count: 0, sum: 0 };
    bucket.count += 1;
    if (mapping.measureField) {
      const measureRaw = row[mapping.measureField];
      const n = typeof measureRaw === 'number' ? measureRaw : Number(measureRaw);
      if (!Number.isNaN(n)) {
        bucket.sum += n;
      }
    }
    buckets.set(label, bucket);
  }

  const measureValue = (bucket: { count: number; sum: number }): number => {
    if (mapping.measure === 'sum') {
      return bucket.sum;
    }
    if (mapping.measure === 'avg') {
      return bucket.count === 0 ? 0 : bucket.sum / bucket.count;
    }
    return bucket.count;
  };

  let labels: string[];
  let data: number[];

  if (mapping.labelOrder?.length) {
    labels = mapping.labelOrder.map((key) => formatGroupLabel(key));
    data = mapping.labelOrder.map((key) => measureValue(bucketForKey(buckets, key)));
  } else {
    labels = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
    data = labels.map((label) => measureValue(buckets.get(label)!));
  }

  if (mapping.funnelCumulative) {
    data = toCumulativeFunnelValues(data);
  }

  return {
    labels,
    datasets: [
      {
        label: mapping.datasetLabel ?? 'Count',
        data,
      },
    ],
  };
}

const DEFAULT_TIMELINE_MAX_DAYS = 366;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function formatTimelineAxisLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function parseChartRowDate(raw: unknown): Date | undefined {
  return parseDueDateValue(raw);
}

/**
 * Line chart: one series per distinct seriesLabelField value, x-axis = daily dates.
 * Rows sharing a label merge (e.g. itinerary items under one trip name). Each line uses its
 * own y lane (1..n) for inclusive [start, end] spans; gaps between items stay null.
 */
export function dateRangeSeriesRowsToChartData(
  rows: readonly Record<string, unknown>[],
  mapping: Extract<ChartDataMapping, { mode: 'dateRangeSeries' }>,
): ChartDataPayload {
  type SeriesRow = { label: string; start: Date; end: Date };
  const series: SeriesRow[] = [];

  for (const row of rows) {
    const labelRaw = row[mapping.seriesLabelField];
    const label =
      labelRaw === null || labelRaw === undefined || String(labelRaw).trim() === ''
        ? '(unnamed)'
        : String(labelRaw).trim();
    const start = parseChartRowDate(row[mapping.startDateField]);
    if (!start) {
      continue;
    }
    const endParsed = parseChartRowDate(row[mapping.endDateField]);
    const end = endParsed ? endParsed : start;
    const startDay = startOfLocalDay(start);
    const endDay = startOfLocalDay(end);
    series.push({
      label,
      start: startDay <= endDay ? startDay : endDay,
      end: startDay <= endDay ? endDay : startDay,
    });
  }

  if (series.length === 0) {
    return { labels: [], datasets: [] };
  }

  const intervalsByLabel = new Map<string, { start: Date; end: Date }[]>();
  for (const row of series) {
    const bucket = intervalsByLabel.get(row.label) ?? [];
    bucket.push({ start: row.start, end: row.end });
    intervalsByLabel.set(row.label, bucket);
  }

  const groupedSeries = [...intervalsByLabel.entries()]
    .map(([label, intervals]) => {
      const earliest = intervals.reduce(
        (min, iv) => (iv.start < min ? iv.start : min),
        intervals[0]!.start,
      );
      return { label, intervals, earliest };
    })
    .sort((a, b) => a.earliest.getTime() - b.earliest.getTime() || a.label.localeCompare(b.label));

  let rangeStart = series[0].start;
  let rangeEnd = series[0].end;
  for (const row of series) {
    if (row.start < rangeStart) {
      rangeStart = row.start;
    }
    if (row.end > rangeEnd) {
      rangeEnd = row.end;
    }
  }

  const maxDays = mapping.maxDays ?? DEFAULT_TIMELINE_MAX_DAYS;
  const labels: string[] = [];
  const dayDates: Date[] = [];
  for (let cursor = rangeStart, i = 0; cursor <= rangeEnd && i < maxDays; cursor = addLocalDays(cursor, 1), i += 1) {
    dayDates.push(cursor);
    labels.push(formatTimelineAxisLabel(cursor));
  }

  const datasets = groupedSeries.map((group, index) => {
    const lane = index + 1;
    const data = dayDates.map((day) => {
      const t = day.getTime();
      const active = group.intervals.some(
        (iv) => t >= iv.start.getTime() && t <= iv.end.getTime(),
      );
      return active ? lane : null;
    });
    return {
      label: group.label,
      data,
      stepped: true,
      fill: false,
      spanGaps: false,
    };
  });

  return { labels, datasets };
}
