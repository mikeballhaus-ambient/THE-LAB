import type { ChartDataPayload } from '@/shared/charts';
import { chartColorWithAlpha, getLabChartSeriesPalette } from '@/shared/charts/lab-chart-theme';
import type { ConnectorEntityRecord } from '../types/entity.types';
import type { DashboardChartSegment } from './dashboard-aggregates';

/** Sum from each index through the end so funnel segments taper (Chart.js funnel expects decreasing values). */
export function toCumulativeFunnelValues(values: number[]): number[] {
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

export function segmentsToChartData(
  segments: DashboardChartSegment[],
  datasetLabel = 'Count',
): ChartDataPayload {
  const palette = getLabChartSeriesPalette();
  return {
    labels: segments.map((s) => s.label),
    datasets: [
      {
        label: datasetLabel,
        data: segments.map((s) => s.value),
        backgroundColor: palette,
        borderColor: palette[0],
      },
    ],
  };
}

function salesStageCount(records: ConnectorEntityRecord[], stages: string[]): number {
  return records.filter((r) => stages.includes(String(r.stage ?? ''))).length;
}

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

const PIPELINE_FUNNEL_STAGES: { key: string; label: string }[] = [
  { key: 'prospecting', label: 'Prospecting' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'closed-won', label: 'Closed won' },
];

/** Pipeline value ($) by sales stage in funnel order. */
export function buildPipelineByStageFunnelData(records: ConnectorEntityRecord[]): ChartDataPayload {
  const sums = new Map<string, number>();
  for (const row of records) {
    const stage = String(fieldValue(row, 'stage') ?? '_empty');
    if (stage === '_empty' || stage === 'closed-lost') {
      continue;
    }
    const raw = fieldValue(row, 'amount');
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) {
      continue;
    }
    sums.set(stage, (sums.get(stage) ?? 0) + n);
  }
  const labels = PIPELINE_FUNNEL_STAGES.map((s) => s.label);
  const stageAmounts = PIPELINE_FUNNEL_STAGES.map(
    (s) => Math.round((sums.get(s.key) ?? 0) * 100) / 100,
  );
  const data = toCumulativeFunnelValues(stageAmounts);
  const palette = getLabChartSeriesPalette();
  return {
    labels,
    datasets: [
      {
        label: 'Cumulative pipeline ($)',
        data,
        backgroundColor: palette,
      },
    ],
  };
}

/** Snapshot counts for a simple categorical line chart. */
export function buildPortfolioOverviewChartData(
  contactCount: number,
  leadCount: number,
  salesCount: number,
  serviceCount: number,
): ChartDataPayload {
  const palette = getLabChartSeriesPalette();
  return {
    labels: ['Contacts', 'Leads', 'Open deals', 'Service cases'],
    datasets: [
      {
        label: 'Records',
        data: [contactCount, leadCount, salesCount, serviceCount],
        borderColor: palette[0],
        backgroundColor: chartColorWithAlpha(palette[0], 0.4),
        fill: true,
      },
    ],
  };
}

export function buildLeadFunnelChartData(
  leadCount: number,
  salesRecords: ConnectorEntityRecord[],
): ChartDataPayload {
  const stageCounts = [
    leadCount,
    salesStageCount(salesRecords, ['prospecting', 'qualification']),
    salesStageCount(salesRecords, ['proposal', 'negotiation']),
    salesStageCount(salesRecords, ['closed-won']),
  ];
  const palette = getLabChartSeriesPalette();
  return {
    labels: ['Leads', 'Prospecting', 'Proposal', 'Closed won'],
    datasets: [
      {
        label: 'Count',
        data: toCumulativeFunnelValues(stageCounts),
        backgroundColor: palette,
      },
    ],
  };
}
