import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';
import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';

export async function pushPlatformMatchState(
  recipientUserIds: number[],
  matchId: string,
  match: Record<string, unknown>,
): Promise<void> {
  const base = resolvePlatformBackendUrl();
  const response = await fetch(`${base}/api/platform/comms/match-state`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Lab-App-Service-Token': resolveLabAppServiceToken(),
    },
    body: JSON.stringify({ recipientUserIds, matchId, match }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Platform match-state push failed (${response.status})`);
  }
}
