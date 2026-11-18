import type { ChartSchema } from './chart-types';
import { labAppFetch } from '@/shared/composables/useLabUserHeaders';

const API_V1 = '/api/v1';

function apiUrl(serverUrl: string, path: string): string {
  const base = serverUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export async function loadChartSchema(serverUrl: string, chartKey: string): Promise<ChartSchema> {
  const response = await labAppFetch(
    apiUrl(serverUrl, `${API_V1}/charts/load/${encodeURIComponent(chartKey)}`),
  );
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Failed to load chart (${response.status})`);
  }
  return (await response.json()) as ChartSchema;
}
