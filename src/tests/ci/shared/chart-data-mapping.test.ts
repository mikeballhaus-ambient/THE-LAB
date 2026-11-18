import { describe, expect, test } from '@jest/globals';
import { aggregateRowsToChartData, dateRangeSeriesRowsToChartData } from '@/shared/charts/chart-data-mapping';
import { catalogChartDataMapping, catalogChartLegendOptions, catalogChartType } from '@/shared/config/catalog-chart-config';

describe('aggregateRowsToChartData', () => {
  test('counts rows by groupByField', () => {
    const payload = aggregateRowsToChartData(
      [
        { status: 'open', priority: 'high' },
        { status: 'open', priority: 'low' },
        { status: 'done', priority: 'high' },
      ],
      { mode: 'aggregate', groupByField: 'status', measure: 'count', datasetLabel: 'Tasks' },
    );
    expect(payload.labels).toEqual(['done', 'open']);
    expect(payload.datasets[0]?.data).toEqual([1, 2]);
  });

  test('labelOrder + funnelCumulative builds queue funnel shape', () => {
    const payload = aggregateRowsToChartData(
      [
        { status: 'open' },
        { status: 'open' },
        { status: 'resolved' },
        { status: 'closed' },
      ],
      {
        mode: 'aggregate',
        groupByField: 'status',
        measure: 'count',
        datasetLabel: 'Tickets',
        labelOrder: ['new', 'open', 'pending', 'resolved', 'closed'],
        funnelCumulative: true,
      },
    );
    expect(payload.labels).toEqual(['New', 'Open', 'Pending', 'Resolved', 'Closed']);
    expect(payload.datasets[0]?.data).toEqual([4, 4, 2, 2, 1]);
  });
});

describe('dateRangeSeriesRowsToChartData', () => {
  test('builds one stepped line per trip on daily x labels', () => {
    const payload = dateRangeSeriesRowsToChartData(
      [
        { name: 'Summit', startDate: '2026-10-08', endDate: '2026-10-10' },
        { name: 'Northwind', startDate: '2026-10-12', endDate: '2026-10-13' },
      ],
      {
        mode: 'dateRangeSeries',
        seriesLabelField: 'name',
        startDateField: 'startDate',
        endDateField: 'endDate',
      },
    );
    expect(payload.labels?.length).toBe(6);
    expect(payload.datasets).toHaveLength(2);
    expect(payload.datasets[0]?.label).toBe('Summit');
    expect(payload.datasets[0]?.data?.filter((v) => v != null)).toEqual([1, 1, 1]);
    expect(payload.datasets[1]?.label).toBe('Northwind');
    expect(payload.datasets[1]?.data?.filter((v) => v != null)).toEqual([2, 2]);
  });

  test('merges rows with the same series label (itinerary items per trip)', () => {
    const payload = dateRangeSeriesRowsToChartData(
      [
        { tripName: 'Summit', startAt: '2026-10-08T09:00:00', endAt: '2026-10-08T12:00:00' },
        { tripName: 'Summit', startAt: '2026-10-10T14:00:00', endAt: '2026-10-10T18:00:00' },
        { tripName: 'Northwind', startAt: '2026-10-12', endAt: '2026-10-13' },
      ],
      {
        mode: 'dateRangeSeries',
        seriesLabelField: 'tripName',
        startDateField: 'startAt',
        endDateField: 'endAt',
      },
    );
    expect(payload.datasets).toHaveLength(2);
    expect(payload.datasets[0]?.label).toBe('Summit');
    const summit = payload.datasets[0]?.data ?? [];
    expect(summit.filter((v) => v != null)).toEqual([1, 1]);
    expect(summit.some((v) => v === null)).toBe(true);
    expect(payload.datasets[1]?.label).toBe('Northwind');
  });
});

describe('catalogChartDataMapping travel itinerary', () => {
  test('maps itinerary-by-kind slot to aggregate on kind', () => {
    expect(catalogChartType('app-travel-itinerary', 'reports.itinerary-by-kind')).toBe('doughnut');
    expect(catalogChartDataMapping('app-travel-itinerary', 'reports.itinerary-by-kind', 'Itinerary by kind')).toEqual({
      mode: 'aggregate',
      groupByField: 'kind',
      measure: 'count',
      datasetLabel: 'Itinerary items',
      labelOrder: ['flight', 'hotel', 'transport', 'activity', 'other'],
    });
  });
});

describe('catalogChartDataMapping suggestion box', () => {
  test('suggestions-by-vote sums votes per title', () => {
    expect(catalogChartType('app-suggestion-box', 'reports.suggestions-by-vote')).toBe('bar');
    expect(catalogChartDataMapping('app-suggestion-box', 'reports.suggestions-by-vote', 'Suggestions by vote')).toEqual({
      mode: 'aggregate',
      groupByField: 'title',
      measure: 'sum',
      measureField: 'votes',
      datasetLabel: 'Votes',
    });
  });
});

describe('catalogChartDataMapping job applicant tracker', () => {
  test('applicants-by-stage is bar', () => {
    expect(catalogChartType('app-job-applicant-tracker', 'reports.applicants-by-stage')).toBe('bar');
    expect(catalogChartDataMapping('app-job-applicant-tracker', 'reports.applicants-by-stage', 'Applicants by stage')).toMatchObject({
      mode: 'aggregate',
      groupByField: 'stage',
      measure: 'count',
    });
  });

  test('applicants-stage-breakdown is pie with right legend', () => {
    expect(catalogChartType('app-job-applicant-tracker', 'reports.applicants-stage-breakdown')).toBe('pie');
    expect(
      catalogChartLegendOptions('app-job-applicant-tracker', 'reports.applicants-stage-breakdown'),
    ).toEqual({ legendDisplay: true, legendPosition: 'right' });
  });
});
