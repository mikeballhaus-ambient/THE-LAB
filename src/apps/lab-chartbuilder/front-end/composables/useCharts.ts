import { ref } from 'vue';
import type { ChartListResponse, ChartSchema } from '@/apps/lab-chartbuilder/shared/types';
import { API_V1_PREFIX, apiFetch, apiUrl, parseJsonResponse } from '../utils/api-client';

export function useCharts(serverUrl: string) {
  const charts = ref<ChartSchema[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadCharts(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiFetch(apiUrl(serverUrl, `${API_V1_PREFIX}/charts`));
      const data = await parseJsonResponse<ChartListResponse>(response);
      charts.value = data.charts;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load charts';
      charts.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function getChart(chartKey: string): Promise<ChartSchema | null> {
    try {
      const response = await apiFetch(
        apiUrl(serverUrl, `${API_V1_PREFIX}/charts/${encodeURIComponent(chartKey)}`),
      );
      return await parseJsonResponse<ChartSchema>(response);
    } catch {
      return null;
    }
  }

  async function createChart(schema: ChartSchema): Promise<ChartSchema> {
    const response = await apiFetch(apiUrl(serverUrl, `${API_V1_PREFIX}/charts`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema),
    });
    const created = await parseJsonResponse<ChartSchema>(response);
    await loadCharts();
    return created;
  }

  async function updateChart(chartKey: string, patch: Partial<ChartSchema>): Promise<ChartSchema> {
    const response = await apiFetch(
      apiUrl(serverUrl, `${API_V1_PREFIX}/charts/${encodeURIComponent(chartKey)}`),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      },
    );
    const updated = await parseJsonResponse<ChartSchema>(response);
    await loadCharts();
    return updated;
  }

  async function deleteChart(chartKey: string): Promise<void> {
    const response = await apiFetch(
      apiUrl(serverUrl, `${API_V1_PREFIX}/charts/${encodeURIComponent(chartKey)}`),
      { method: 'DELETE' },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    await loadCharts();
  }

  return {
    charts,
    loading,
    error,
    loadCharts,
    getChart,
    createChart,
    updateChart,
    deleteChart,
  };
}
