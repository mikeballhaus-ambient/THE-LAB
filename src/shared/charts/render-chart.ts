import type { ChartRenderRequest, ChartRenderResponse } from './chart-types';
import { labAppFetch } from '@/shared/composables/useLabUserHeaders';

const API_V1 = '/api/v1';

function apiUrl(serverUrl: string, path: string): string {
  const base = serverUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export async function renderChart(
  serverUrl: string,
  chartKey: string,
  request: ChartRenderRequest,
): Promise<ChartRenderResponse> {
  const response = await labAppFetch(
    apiUrl(serverUrl, `${API_V1}/charts/render/${encodeURIComponent(chartKey)}`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Failed to render chart (${response.status})`);
  }
  return (await response.json()) as ChartRenderResponse;
}
