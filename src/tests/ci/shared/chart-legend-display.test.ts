import { describe, expect, test } from '@jest/globals';
import {
  legendAndDataLabelLayoutOptions,
  resolveReportLegendDisplay,
} from '@/shared/charts/chart-options';

describe('resolveReportLegendDisplay', () => {
  test('shows legend by default (values + legend together)', () => {
    expect(resolveReportLegendDisplay(undefined)).toBe(true);
    expect(resolveReportLegendDisplay({})).toBe(true);
    expect(resolveReportLegendDisplay({ showDataLabels: true })).toBe(true);
  });

  test('honours explicit legendDisplay from chart schema', () => {
    expect(resolveReportLegendDisplay({ legendDisplay: true })).toBe(true);
    expect(resolveReportLegendDisplay({ legendDisplay: false })).toBe(false);
  });
});

describe('legendAndDataLabelLayoutOptions', () => {
  test('adds top padding and extra y grace when legend is top on bar charts', () => {
    const opts = legendAndDataLabelLayoutOptions({
      chartType: 'bar',
      legendDisplay: true,
      legendPosition: 'top',
      showDataLabels: true,
    });
    expect(opts.layout).toEqual({ padding: { top: 14 } });
    expect(opts.scales).toEqual({ y: { grace: '14%' } });
  });

  test('uses lighter spacing when legend is bottom', () => {
    const opts = legendAndDataLabelLayoutOptions({
      chartType: 'bar',
      legendDisplay: true,
      legendPosition: 'bottom',
      showDataLabels: true,
    });
    expect(opts.layout).toEqual({ padding: { bottom: 8 } });
    expect(opts.scales).toEqual({ y: { grace: '8%' } });
  });

  test('does nothing for radial charts', () => {
    expect(
      legendAndDataLabelLayoutOptions({
        chartType: 'doughnut',
        legendDisplay: true,
        legendPosition: 'top',
        showDataLabels: true,
      }),
    ).toEqual({});
  });
});
