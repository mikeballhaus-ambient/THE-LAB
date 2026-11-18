import { VSCodeLogger } from '../../utils/logger';
import {
  platformAuditRepository,
  type PlatformAuditCategory,
} from './platform-audit-repository';

export class PlatformAuditService {
  private static instance: PlatformAuditService | null = null;

  static getInstance(): PlatformAuditService {
    if (!PlatformAuditService.instance) {
      PlatformAuditService.instance = new PlatformAuditService();
    }
    return PlatformAuditService.instance;
  }

  record(params: {
    actorUserId: number | null | undefined;
    category: PlatformAuditCategory;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
  }): void {
    try {
      platformAuditRepository.insert({
        actorUserId: params.actorUserId ?? null,
        category: params.category,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details,
      });
      void VSCodeLogger.getInstance().then((logger) =>
        logger.structured('info', 'platform_audit', {
          category: params.category,
          action: params.action,
          actorUserId: params.actorUserId ?? null,
          targetType: params.targetType,
          targetId: params.targetId,
        }),
      );
    } catch (err) {
      void VSCodeLogger.getInstance().then((logger) =>
        logger.error(`platform audit write failed: ${err instanceof Error ? err.message : String(err)}`),
      );
    }
  }

  listRecent(limit = 100) {
    return platformAuditRepository.listRecent(limit);
  }
}

export const platformAuditService = PlatformAuditService.getInstance();
