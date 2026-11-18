import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';
import { buildPlatformServiceAuthHeaders } from '@/shared/services/platform-user-client.node';
import type {
  LabVirtualBankAdjustRequest,
  LabVirtualBankAdjustResult,
} from '@/shared/types/lab-virtual-bank';

/** App server → platform: apply a ledger delta for a lab user (service token). */
export async function applyLabVirtualBankAdjustment(
  request: LabVirtualBankAdjustRequest,
): Promise<LabVirtualBankAdjustResult> {
  const base = resolvePlatformBackendUrl();
  const response = await fetch(`${base}/api/platform/virtual-bank/adjust`, {
    method: 'POST',
    headers: {
      ...buildPlatformServiceAuthHeaders(request.userId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as {
    success?: boolean;
    data?: LabVirtualBankAdjustResult;
    error?: string;
  };
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error ?? `Virtual bank adjust failed (${response.status})`);
  }
  return body.data;
}
