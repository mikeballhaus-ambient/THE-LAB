import { AppGateway } from '@/services/AppGateway';
import { AppRegistry } from '@/shared/services/AppRegistry';
import { toRegistryAppId } from '@/shared/lab-integrations/normalize-app-id';

export type IntegrationLaunchReason = 'integration-wizard' | 'runtime-binding' | 'registry-dependency';

/**
 * Ephemeral provider launches for integration wizard / runtime slots (rm-64).
 * v1: acquire launches server apps; release only decrements refcounts (no auto-teardown).
 */
export class IntegrationLaunchCoordinator {
  private static instance: IntegrationLaunchCoordinator | null = null;
  private refCounts = new Map<string, Map<IntegrationLaunchReason, number>>();

  private constructor() {}

  static getInstance(): IntegrationLaunchCoordinator {
    if (!IntegrationLaunchCoordinator.instance) {
      IntegrationLaunchCoordinator.instance = new IntegrationLaunchCoordinator();
    }
    return IntegrationLaunchCoordinator.instance;
  }

  private totalRefs(providerRegistryId: string): number {
    const reasons = this.refCounts.get(providerRegistryId);
    if (!reasons) {
      return 0;
    }
    let total = 0;
    for (const count of reasons.values()) {
      total += count;
    }
    return total;
  }

  async acquire(providerAppId: string, reason: IntegrationLaunchReason): Promise<boolean> {
    const registryId = toRegistryAppId(providerAppId);
    const registry = AppRegistry.getInstance();
    const app = await registry.getById(registryId);
    if (!app?.server?.entry) {
      return true;
    }

    const reasonMap = this.refCounts.get(registryId) ?? new Map<IntegrationLaunchReason, number>();
    const next = (reasonMap.get(reason) ?? 0) + 1;
    reasonMap.set(reason, next);
    this.refCounts.set(registryId, reasonMap);

    if (this.totalRefs(registryId) === 1) {
      return AppGateway.getInstance().launch(registryId, app.server);
    }
    return true;
  }

  release(providerAppId: string, reason: IntegrationLaunchReason): void {
    const registryId = toRegistryAppId(providerAppId);
    const reasonMap = this.refCounts.get(registryId);
    if (!reasonMap) {
      return;
    }
    const next = (reasonMap.get(reason) ?? 0) - 1;
    if (next <= 0) {
      reasonMap.delete(reason);
    } else {
      reasonMap.set(reason, next);
    }
    if (reasonMap.size === 0) {
      this.refCounts.delete(registryId);
    }
  }

  /** Test / diagnostics */
  getRefCount(providerAppId: string, reason: IntegrationLaunchReason): number {
    const registryId = toRegistryAppId(providerAppId);
    return this.refCounts.get(registryId)?.get(reason) ?? 0;
  }
}

export const integrationLaunchCoordinator = IntegrationLaunchCoordinator.getInstance();
