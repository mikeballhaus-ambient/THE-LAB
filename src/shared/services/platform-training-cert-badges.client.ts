import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { TrainingCertBadge } from '@/apps/training-quizzes/shared/types';

export async function fetchTrainingCertBadgesByUserIds(
  userIds: number[],
): Promise<Record<number, TrainingCertBadge[]>> {
  const unique = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) {
    return {};
  }
  const base = resolvePlatformBackendUrlForClient().replace(/\/$/, '');
  const params = new URLSearchParams({ userIds: unique.join(',') });
  const response = await fetch(
    `${base}/api/platform/training-certifications/badges?${params.toString()}`,
    labPlatformFetchInit(),
  );
  if (!response.ok) {
    return {};
  }
  const body = (await response.json()) as {
    success?: boolean;
    data?: Record<string, TrainingCertBadge[]>;
  };
  if (!body.success || !body.data) {
    return {};
  }
  const out: Record<number, TrainingCertBadge[]> = {};
  for (const [key, value] of Object.entries(body.data)) {
    const id = Number.parseInt(key, 10);
    if (Number.isFinite(id)) {
      out[id] = value;
    }
  }
  return out;
}
