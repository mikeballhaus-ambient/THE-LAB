import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { FunnelController, TrapezoidElement } from 'chartjs-chart-funnel';

let extensionsRegistered = false;

/** Register Chart.js funnel + datalabels plugins once per app bundle. */
export function registerChartJsExtensions(): void {
  if (extensionsRegistered) {
    return;
  }
  Chart.register(FunnelController, TrapezoidElement, ChartDataLabels);
  Chart.defaults.set('plugins.datalabels', {
    display: false,
  });
  extensionsRegistered = true;
}

/** @deprecated Use registerChartJsExtensions */
export const registerChartJsFunnel = registerChartJsExtensions;
