import type { ChartDataMapping } from '@/shared/charts/chart-data-mapping';
import type { ChartLegendPosition, ChartSchema } from '@/shared/charts/chart-types';
import { CATALOG_HOST_APP_IDS } from '@/shared/lab-integrations/catalog-manifests';

/**
 * Shared dimension vocabulary for catalog chart slots.
 *
 * Charts previously grouped on whatever string the app happened to store. With person and
 * account fields promoted to lookups (phase 31), a slot can declare *what kind of thing*
 * it groups by, so charts render meaningfully regardless of which app owns the data.
 */
export type CatalogChartDimension =
  | 'status'
  | 'category'
  | 'priority'
  | 'stage'
  | 'kind'
  | 'condition'
  | 'response'
  | 'quarter'
  | 'destination'
  | 'project'
  | 'role'
  | 'owner'
  | 'account';

export interface CatalogChartSlotConfig {
  groupByField?: string;
  /** Semantic meaning of the grouping — drives labels and future cross-app charts. */
  dimension?: CatalogChartDimension;
  measure?: 'count' | 'sum';
  measureField?: string;
  chartType?: ChartSchema['chartType'];
  /** When false, report widgets hide the series legend (values may still show). Default: show legend. */
  legendDisplay?: boolean;
  /** Chart.js legend position. Top + data labels on bar/line charts get extra padding/grace automatically. */
  legendPosition?: ChartLegendPosition;
  datasetLabel?: string;
  mappingMode?: 'aggregate' | 'dateRangeSeries';
  seriesLabelField?: string;
  startDateField?: string;
  endDateField?: string;
  timelineChart?: boolean;
  labelOrder?: string[];
}

/** Maps a stored field name to its shared dimension. Used when a slot omits `dimension`. */
export const CATALOG_CHART_FIELD_DIMENSIONS: Readonly<Record<string, CatalogChartDimension>> = {
  status: 'status',
  category: 'category',
  priority: 'priority',
  stage: 'stage',
  kind: 'kind',
  condition: 'condition',
  response: 'response',
  quarter: 'quarter',
  destination: 'destination',
  project: 'project',
  role: 'role',
  owner: 'owner',
  ownerName: 'owner',
  owner_name: 'owner',
  userName: 'owner',
  teamMember: 'owner',
  company: 'account',
  companyId: 'account',
};

export function resolveChartDimension(
  config: Pick<CatalogChartSlotConfig, 'groupByField' | 'dimension'>,
): CatalogChartDimension | undefined {
  if (config.dimension) {
    return config.dimension;
  }
  const field = config.groupByField;
  return field ? CATALOG_CHART_FIELD_DIMENSIONS[field] : undefined;
}

const CHART_BY_HOST_SLOT: Record<string, Record<string, CatalogChartSlotConfig>> = {
  'app-okr-goals': {
    'reports.kr-by-status': { groupByField: 'status', chartType: 'doughnut', datasetLabel: 'Key results' },
    'reports.objectives-by-quarter': { groupByField: 'quarter', chartType: 'bar', datasetLabel: 'Objectives' },
  },
  'app-travel-itinerary': {
    'reports.trips-by-destination': {
      groupByField: 'destination',
      chartType: 'bar',
      datasetLabel: 'Trips',
      mappingMode: 'aggregate',
    },
    'reports.itinerary-by-kind': {
      groupByField: 'kind',
      dimension: 'kind',
      chartType: 'doughnut',
      datasetLabel: 'Itinerary items',
      mappingMode: 'aggregate',
      measure: 'count',
      labelOrder: ['flight', 'hotel', 'transport', 'activity', 'other'],
    },
  },
  'app-project-charter': {
    'reports.charters-by-status': {
      groupByField: 'status',
      dimension: 'status',
      chartType: 'doughnut',
      datasetLabel: 'Charters',
      mappingMode: 'aggregate',
      measure: 'count',
      labelOrder: ['draft', 'active', 'on-hold', 'complete'],
    },
    'reports.charters-by-sponsor': {
      groupByField: 'sponsor',
      dimension: 'owner',
      chartType: 'bar',
      datasetLabel: 'Charters',
      mappingMode: 'aggregate',
      measure: 'count',
    },
  },
  'app-time-tracking': {
    'reports.hours-by-project': {
      groupByField: 'project',
      measure: 'sum',
      measureField: 'minutes',
      chartType: 'bar',
      datasetLabel: 'Minutes',
      mappingMode: 'aggregate',
    },
    'reports.hours-by-user': {
      groupByField: 'userName',
      dimension: 'owner',
      measure: 'sum',
      measureField: 'minutes',
      chartType: 'bar',
      datasetLabel: 'Minutes',
      mappingMode: 'aggregate',
    },
  },
  'app-job-applicant-tracker': {
    'reports.applicants-by-stage': {
      groupByField: 'stage',
      dimension: 'stage',
      chartType: 'bar',
      datasetLabel: 'Applicants',
      mappingMode: 'aggregate',
      measure: 'count',
      labelOrder: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'],
    },
    'reports.applicants-stage-breakdown': {
      groupByField: 'stage',
      dimension: 'stage',
      chartType: 'pie',
      legendDisplay: true,
      legendPosition: 'right',
      datasetLabel: 'Applicants',
      mappingMode: 'aggregate',
      measure: 'count',
      labelOrder: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'],
    },
  },
  'app-suggestion-box': {
    'reports.suggestions-by-status': {
      groupByField: 'status',
      dimension: 'status',
      chartType: 'pie',
      datasetLabel: 'Suggestions',
      mappingMode: 'aggregate',
      measure: 'count',
    },
    'reports.suggestions-by-vote': {
      groupByField: 'title',
      chartType: 'bar',
      datasetLabel: 'Votes',
      mappingMode: 'aggregate',
      measure: 'sum',
      measureField: 'votes',
    },
  },
  'app-expense-reports': {
    'reports.expenses-by-status': { groupByField: 'status', chartType: 'doughnut', datasetLabel: 'Expenses' },
    'reports.expenses-by-category': { groupByField: 'category', chartType: 'bar', datasetLabel: 'Expenses' },
  },
  'app-knowledge-base': {
    'reports.articles-by-category': { groupByField: 'category', chartType: 'bar', datasetLabel: 'Articles' },
    'reports.articles-by-status': { groupByField: 'status', chartType: 'pie', datasetLabel: 'Articles' },
  },
  'app-training-quizzes': {
    'reports.quizzes-overview': {
      groupByField: 'title',
      chartType: 'bar',
      datasetLabel: 'Quizzes',
      mappingMode: 'aggregate',
      measure: 'count',
    },
    'reports.certifications-by-status': {
      groupByField: 'status',
      dimension: 'status',
      chartType: 'doughnut',
      datasetLabel: 'Certifications',
      mappingMode: 'aggregate',
      measure: 'count',
      labelOrder: ['active', 'revoked'],
    },
  },
  'app-onboarding-checklist': {
    'reports.checklists-by-role': {
      groupByField: 'role',
      dimension: 'role',
      chartType: 'bar',
      datasetLabel: 'Checklists',
      mappingMode: 'aggregate',
      measure: 'count',
    },
    'reports.tasks-by-status': {
      groupByField: 'status',
      dimension: 'status',
      chartType: 'doughnut',
      datasetLabel: 'Tasks',
      mappingMode: 'aggregate',
      measure: 'count',
      labelOrder: ['todo', 'doing', 'done'],
    },
  },
  // `app-weather-dashboard` has no chart slots — the observations pie was removed.
  'app-home-maintenance': {
    'reports.tasks-by-status': {
      groupByField: 'status',
      chartType: 'doughnut',
      datasetLabel: 'Tasks',
      legendDisplay: true,
      legendPosition: 'right',
    },
    'reports.tasks-by-priority': { groupByField: 'priority', chartType: 'bar', datasetLabel: 'Tasks' },
    'reports.cost-by-asset': {
      groupByField: 'assetName',
      measure: 'sum',
      measureField: 'cost',
      chartType: 'bar',
      datasetLabel: 'Cost (USD)',
      mappingMode: 'aggregate',
    },
  },
  'app-rental-property': {
    'reports.properties-by-status': { groupByField: 'status', chartType: 'bar', datasetLabel: 'Properties' },
    'reports.payments-by-status': { groupByField: 'status', chartType: 'pie', datasetLabel: 'Payments' },
  },
  'app-event-rsvp': {
    'reports.rsvps-by-response': {
      groupByField: 'response',
      dimension: 'response',
      chartType: 'doughnut',
      datasetLabel: 'RSVPs',
      mappingMode: 'aggregate',
      measure: 'count',
    },
    'reports.events-by-location': {
      groupByField: 'location',
      dimension: 'destination',
      chartType: 'bar',
      datasetLabel: 'Events',
      mappingMode: 'aggregate',
      measure: 'count',
      legendPosition: 'top',
    },
  },
  'app-polls-surveys': {
    'reports.polls-by-status': {
      groupByField: 'status',
      dimension: 'status',
      chartType: 'bar',
      datasetLabel: 'Polls',
      mappingMode: 'aggregate',
      measure: 'count',
    },
    'reports.polls-by-kind': {
      groupByField: 'kind',
      dimension: 'kind',
      chartType: 'doughnut',
      datasetLabel: 'Polls',
      mappingMode: 'aggregate',
      measure: 'count',
    },
  },
};

export function catalogChartSlotConfig(
  hostAppId: string,
  slot: string,
): CatalogChartSlotConfig | null {
  return CHART_BY_HOST_SLOT[hostAppId]?.[slot] ?? null;
}

export function catalogChartDataMapping(
  hostAppId: string,
  slot: string,
  fallbackLabel: string,
): ChartDataMapping {
  const cfg = catalogChartSlotConfig(hostAppId, slot);
  if (!cfg) {
    return { mode: 'aggregate', groupByField: 'status', measure: 'count', datasetLabel: fallbackLabel };
  }
  if (cfg.mappingMode === 'dateRangeSeries') {
    return {
      mode: 'dateRangeSeries',
      seriesLabelField: cfg.seriesLabelField ?? 'name',
      startDateField: cfg.startDateField ?? 'startDate',
      endDateField: cfg.endDateField ?? 'endDate',
    };
  }
  return {
    mode: 'aggregate',
    groupByField: cfg.groupByField ?? 'status',
    measure: cfg.measure ?? 'count',
    measureField: cfg.measureField,
    datasetLabel: cfg.datasetLabel ?? fallbackLabel,
    labelOrder: cfg.labelOrder,
  };
}

export function catalogChartType(hostAppId: string, slot: string): ChartSchema['chartType'] {
  return catalogChartSlotConfig(hostAppId, slot)?.chartType ?? 'bar';
}

export function catalogChartTimelineOptions(
  hostAppId: string,
  slot: string,
): Pick<ChartSchema['options'], 'timelineChart' | 'showDataLabels'> {
  const cfg = catalogChartSlotConfig(hostAppId, slot);
  if (cfg?.timelineChart) {
    return { timelineChart: true, showDataLabels: false };
  }
  return {};
}

export function catalogChartLegendPosition(
  hostAppId: string,
  slot: string,
): ChartLegendPosition | undefined {
  return catalogChartSlotConfig(hostAppId, slot)?.legendPosition;
}

export function catalogChartLegendOptions(
  hostAppId: string,
  slot: string,
): Pick<ChartSchema['options'], 'legendDisplay' | 'legendPosition'> {
  const cfg = catalogChartSlotConfig(hostAppId, slot);
  if (!cfg) {
    return {};
  }
  const out: Pick<ChartSchema['options'], 'legendDisplay' | 'legendPosition'> = {};
  if (cfg.legendDisplay !== undefined) {
    out.legendDisplay = cfg.legendDisplay;
  }
  if (cfg.legendPosition) {
    out.legendPosition = cfg.legendPosition;
  }
  return out;
}

export function isCatalogHostAppId(hostAppId: string): boolean {
  return (CATALOG_HOST_APP_IDS as string[]).includes(hostAppId);
}
