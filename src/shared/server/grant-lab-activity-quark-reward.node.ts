import { VSCodeLogger } from '@/backend/utils/logger';
import { applyLabVirtualBankAdjustment } from '@/shared/services/lab-virtual-bank-client.node';
import {
  LAB_ACTIVITY_QUARK_REWARDS,
  type LabActivityQuarkRewardKind,
  type LabVirtualBankReasonCode,
} from '@/shared/types/lab-virtual-bank';

export interface GrantLabActivityQuarkRewardOptions {
  kind: LabActivityQuarkRewardKind;
  userId: number | null | undefined;
  sourceAppId: string;
  sourceRef: string;
  reasonLabel: string;
}

function reasonCodeForKind(kind: LabActivityQuarkRewardKind): LabVirtualBankReasonCode {
  return kind === 'pollVote' ? 'poll_reward' : 'activity_reward';
}

/**
 * Best-effort Quark credit for catalog lab activities. Returns credited amount (0 when skipped).
 * Idempotent when `sourceRef` was already used for this user.
 */
export async function grantLabActivityQuarkReward(
  options: GrantLabActivityQuarkRewardOptions,
): Promise<number> {
  const userId = options.userId;
  if (userId == null || !Number.isFinite(userId) || userId < 1) {
    return 0;
  }
  const delta = LAB_ACTIVITY_QUARK_REWARDS[options.kind];
  if (delta <= 0) {
    return 0;
  }
  try {
    const result = await applyLabVirtualBankAdjustment({
      userId,
      delta,
      reasonCode: reasonCodeForKind(options.kind),
      reasonLabel: options.reasonLabel,
      sourceAppId: options.sourceAppId,
      sourceRef: options.sourceRef,
    });
    if (result.skippedDuplicate) {
      return 0;
    }
    return delta;
  } catch (error: unknown) {
    const logger = await VSCodeLogger.getInstance();
    logger.warn(
      `[grant-lab-activity-quark-reward] skipped (${options.sourceAppId}/${options.kind}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return 0;
  }
}
