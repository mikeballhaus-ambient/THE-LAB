import { getLabUserHeaders, labAppFetch } from '@/shared/composables/useLabUserHeaders';

export async function submitRecordToConnectorApi(options: {
  serverUrl: string;
  connectorEntitySegment: string;
  recordId?: string | number | null;
  data: Record<string, unknown>;
  hostAppId?: string;
}): Promise<void> {
  const base = options.serverUrl.replace(/\/$/, '');
  const segment = options.connectorEntitySegment;
  const isEdit = options.recordId != null;
  const url = isEdit
    ? `${base}/api/connector/${segment}/${encodeURIComponent(String(options.recordId))}`
    : `${base}/api/connector/${segment}`;

  const headers: HeadersInit = options.hostAppId
    ? getLabUserHeaders({
        'Content-Type': 'application/json',
        'X-Host-App-Id': options.hostAppId,
      })
    : getLabUserHeaders({ 'Content-Type': 'application/json' });

  const response = await labAppFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(options.data),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(body.message ?? body.error ?? `Save failed (${response.status})`);
  }
}

export async function deleteRecordViaConnectorApi(options: {
  serverUrl: string;
  connectorEntitySegment: string;
  recordId: string | number;
  hostAppId?: string;
}): Promise<void> {
  const base = options.serverUrl.replace(/\/$/, '');
  const url = `${base}/api/connector/${options.connectorEntitySegment}/${encodeURIComponent(String(options.recordId))}`;

  const headers: HeadersInit = options.hostAppId
    ? getLabUserHeaders({ 'X-Host-App-Id': options.hostAppId })
    : getLabUserHeaders();

  const response = await labAppFetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(body.message ?? body.error ?? `Delete failed (${response.status})`);
  }
}
