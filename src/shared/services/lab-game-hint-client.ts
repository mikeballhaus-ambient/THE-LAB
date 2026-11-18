import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';

export interface LabGameHintPurchaseRequest {
  skuId: string;
  sourceRef: string;
}

export interface LabGameHintPurchaseResponse {
  unlocked: boolean;
  balance: number | null;
  skippedDuplicate?: boolean;
  chargedQuarks?: number;
  devMock?: boolean;
}

function normalizeBase(serverUrl: string): string {
  return serverUrl.replace(/\/$/, '');
}

export async function purchaseLabGameHint(
  serverUrl: string,
  body: LabGameHintPurchaseRequest,
): Promise<LabGameHintPurchaseResponse> {
  const base = normalizeBase(serverUrl);
  const response = await fetch(
    `${base}/api/game-hints/purchase`,
    labPlatformFetchInit({
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
  const json = (await response.json()) as {
    success?: boolean;
    data?: LabGameHintPurchaseResponse;
    error?: string;
  };
  if (!response.ok || !json.success || !json.data?.unlocked) {
    throw new Error(json.error ?? `Hint purchase failed (${response.status})`);
  }
  return json.data;
}
