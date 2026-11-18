import type { LabIntegrationKind } from '@/shared/types/lab-integrations';

/** Context passed to a bindable provider app when the last platform binding to a providerRef is removed. */
export interface LabIntegrationProviderUnbindContext {
  providerRef: string;
  providerAppId: string;
  kind: LabIntegrationKind;
  hostAppId: string;
  slot: string;
}

/** Result of provider-local stub teardown (forms, charts, future surfaces). */
export interface LabIntegrationProviderUnbindOutcome {
  assetDeleted: boolean;
  connectorDeleted: boolean;
  skipped: boolean;
  skipReason?: string;
}

/**
 * Bindable integration providers (Forms Builder, Chart Builder, …) implement this contract.
 * Register handlers in `integration-provider-unbind-registry.ts` on the platform backend.
 */
export interface LabIntegrationProviderUnbindHandler {
  /** Registry app id (`app-lab-formsbuilder`, `app-lab-chartbuilder`, …). */
  registryAppId: string;
  /** Binding kinds this provider owns for cleanup. */
  kinds: readonly LabIntegrationKind[];
  cleanupAfterUnbind(
    context: LabIntegrationProviderUnbindContext,
  ): Promise<LabIntegrationProviderUnbindOutcome>;
}
