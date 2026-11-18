import { ref } from 'vue';
import type {
  ChartConnectorPreviewResult,
  ChartDataConnector,
} from '@/apps/lab-chartbuilder/shared/types/chart-data-connector';
import { API_V1_PREFIX, apiFetch, apiUrl, parseJsonResponse } from '../utils/api-client';

export function useChartConnectors(serverUrl: string) {
  const connectors = ref<ChartDataConnector[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadConnectors(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiFetch(apiUrl(serverUrl, `${API_V1_PREFIX}/connectors`));
      const data = await parseJsonResponse<{ connectors: ChartDataConnector[] }>(response);
      connectors.value = data.connectors ?? [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load connectors';
      connectors.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function previewDiscovery(discoveryUrl: string): Promise<ChartConnectorPreviewResult> {
    const response = await apiFetch(apiUrl(serverUrl, `${API_V1_PREFIX}/connectors/preview`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discovery_url: discoveryUrl }),
    });
    return parseJsonResponse<ChartConnectorPreviewResult>(response);
  }

  async function createConnector(discoveryUrl: string): Promise<ChartDataConnector> {
    const response = await apiFetch(apiUrl(serverUrl, `${API_V1_PREFIX}/connectors`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discovery_url: discoveryUrl, is_active: true }),
    });
    const created = await parseJsonResponse<ChartDataConnector>(response);
    connectors.value = [...connectors.value, created];
    return created;
  }

  async function verifyConnector(id: number): Promise<ChartDataConnector> {
    const response = await apiFetch(
      apiUrl(serverUrl, `${API_V1_PREFIX}/connectors/${id}/verify`),
      { method: 'POST' },
    );
    const updated = await parseJsonResponse<ChartDataConnector>(response);
    const idx = connectors.value.findIndex((c) => c.id === id);
    if (idx >= 0) {
      connectors.value[idx] = updated;
    }
    return updated;
  }

  async function deleteConnector(id: number): Promise<void> {
    const response = await apiFetch(apiUrl(serverUrl, `${API_V1_PREFIX}/connectors/${id}`), {
      method: 'DELETE',
    });
    if (!response.ok) {
      const body = await parseJsonResponse<{ error?: string }>(response).catch(() => ({ error: 'Delete failed' }));
      throw new Error(body.error ?? 'Delete failed');
    }
    connectors.value = connectors.value.filter((c) => c.id !== id);
  }

  return {
    connectors,
    loading,
    error,
    loadConnectors,
    previewDiscovery,
    createConnector,
    verifyConnector,
    deleteConnector,
  };
}
