import { VSCodeLogger } from '@/backend/utils/logger';
import { applyLabVirtualBankAdjustment } from '@/shared/services/lab-virtual-bank-client.node';
import { resolveLabGameHintSku } from '@/shared/game-platform/lab-game-hints';

export interface LabGameHintPurchaseParams {
  userId: number;
  hostAppId: string;
  skuId: string;
  sourceRef: string;
}

export interface LabGameHintPurchaseResult {
  unlocked: true;
  balance: number;
  skippedDuplicate?: boolean;
  chargedQuarks: number;
}

/**
 * Debit Quarks for one hint unlock. Duplicate `sourceRef` for the user unlocks without a second charge.
 */
export async function executeLabGameHintPurchase(
  params: LabGameHintPurchaseParams,
): Promise<LabGameHintPurchaseResult> {
  const sku = resolveLabGameHintSku(params.skuId);
  if (!sku) {
    throw new Error(`Unknown game hint SKU: ${params.skuId}`);
  }
  const cost = sku.defaultCostQuarks;
  if (cost <= 0) {
    throw new Error(`Invalid hint cost for SKU: ${params.skuId}`);
  }
  try {
    const result = await applyLabVirtualBankAdjustment({
      userId: params.userId,
      delta: -cost,
      reasonCode: 'hint_purchase',
      reasonLabel: `${sku.label} (${params.hostAppId})`,
      sourceAppId: params.hostAppId,
      sourceRef: params.sourceRef,
      metadata: { skuId: params.skuId },
    });
    return {
      unlocked: true,
      balance: result.balance,
      skippedDuplicate: result.skippedDuplicate,
      chargedQuarks: result.skippedDuplicate ? 0 : cost,
    };
  } catch (error: unknown) {
    const logger = await VSCodeLogger.getInstance();
    logger.warn(
      `[lab-game-hint-purchase] failed (${params.hostAppId}/${params.skuId}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}
