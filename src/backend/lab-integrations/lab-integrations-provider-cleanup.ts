import type { LabIntegrationBindingRecord, LabIntegrationKind } from '@/shared/types/lab-integrations';
import { labIntegrationsRepository } from '@/backend/db/LabIntegrations/lab-integrations-repository';
import { runLabIntegrationProviderUnbindCleanup } from './integration-provider-unbind-registry';

export interface ProviderUnbindCleanupResult {
  providerRef: string;
  providerAppId: string;
  kind: LabIntegrationKind;
  /** Primary flag — true when the provider asset (form, chart, …) was deleted. */
  assetDeleted: boolean;
  connectorDeleted: boolean;
  skipped: boolean;
  skipReason?: string;
  /** Mirrors `assetDeleted` for form.surface (MCP / UI convenience). */
  formDeleted: boolean;
  /** Mirrors `assetDeleted` for chart.surface (MCP / UI convenience). */
  chartDeleted: boolean;
}

/**
 * After a binding row is removed: invoke the bindable provider's unbind handler when
 * no binding still references `providerRef`.
 */
export async function cleanupProviderAssetsAfterUnbind(
  binding: LabIntegrationBindingRecord,
): Promise<ProviderUnbindCleanupResult> {
  const base: ProviderUnbindCleanupResult = {
    providerRef: binding.providerRef,
    providerAppId: binding.providerAppId,
    kind: binding.kind,
    assetDeleted: false,
    formDeleted: false,
    chartDeleted: false,
    connectorDeleted: false,
    skipped: false,
  };

  if (labIntegrationsRepository.countByProviderRef(binding.providerRef) > 0) {
    return { ...base, skipped: true, skipReason: 'provider_ref_still_bound' };
  }

  const outcome = await runLabIntegrationProviderUnbindCleanup({
    providerRef: binding.providerRef,
    providerAppId: binding.providerAppId,
    kind: binding.kind,
    hostAppId: binding.hostAppId,
    slot: binding.slot,
  });

  const assetDeleted = outcome.assetDeleted;
  return {
    ...base,
    assetDeleted,
    connectorDeleted: outcome.connectorDeleted,
    skipped: outcome.skipped,
    skipReason: outcome.skipReason,
    formDeleted: binding.kind === 'form.surface' ? assetDeleted : false,
    chartDeleted: binding.kind === 'chart.surface' ? assetDeleted : false,
  };
}

/** @deprecated Import from `providers/forms-builder-unbind-provider` */
export { cleanupFormsBuilderStubFromRepos } from './providers/forms-builder-unbind-provider';
