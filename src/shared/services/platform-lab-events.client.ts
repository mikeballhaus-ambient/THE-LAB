import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabUserNotification } from '@/shared/types/lab-domain-event';
import type { LabDomainEventCatalogResponse } from '@/shared/types/lab-domain-event-catalog';

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.error ?? body.message ?? `HTTP ${response.status}`);
  }
  return body as T;
}

export async function fetchLabNotifications(): Promise<{ notifications: LabUserNotification[] }> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(`${base}/api/platform/lab-events/notifications`, labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: { notifications: LabUserNotification[] } }>(response);
  return body.data;
}

export async function fetchLabDomainEventCatalog(): Promise<LabDomainEventCatalogResponse> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(`${base}/api/platform/lab-events/catalog`, labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: LabDomainEventCatalogResponse }>(response);
  return body.data;
}

export async function markLabNotificationRead(notificationId: string): Promise<void> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(`${base}/api/platform/lab-events/notifications/${encodeURIComponent(notificationId)}/read`, labPlatformFetchInit({ method: 'POST' }));
  await parseJson<{ success: true; data: { notificationId: string } }>(response);
}

/** Dismiss one notification. The server scopes the delete to the caller. */
export async function deleteLabNotification(notificationId: string): Promise<void> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-events/notifications/${encodeURIComponent(notificationId)}`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  await parseJson<{ success: true; data: { notificationId: string } }>(response);
}

/** Dismiss several notifications in one request, returning how many were removed. */
export async function deleteLabNotifications(
  notificationIds: readonly string[],
): Promise<number> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-events/notifications/delete`,
    labPlatformFetchInit({
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    }),
  );
  const body = await parseJson<{ success: true; data: { deleted: number } }>(response);
  return body.data.deleted;
}
