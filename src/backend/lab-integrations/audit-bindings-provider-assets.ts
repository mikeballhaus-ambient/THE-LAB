import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';
import {
  buildBindingReadinessRow,
  summarizeBindingReadiness,
  type LabIntegrationBindingReadinessRow,
  type LabIntegrationBindingsReadinessSummary,
} from '@/shared/lab-integrations/binding-provider-asset-audit';
import { providerAssetExistsForBinding } from './validate-provider-asset-ref';

export interface LabIntegrationBindingsAuditResult {
  bindings: LabIntegrationBindingRecord[];
  bindingReadiness: LabIntegrationBindingReadinessRow[];
  readinessSummary: LabIntegrationBindingsReadinessSummary;
}

export async function auditBindingsProviderAssets(
  bindings: LabIntegrationBindingRecord[],
): Promise<LabIntegrationBindingsAuditResult> {
  const bindingReadiness: LabIntegrationBindingReadinessRow[] = [];
  for (const binding of bindings) {
    const exists = await providerAssetExistsForBinding(
      binding.kind,
      binding.providerAppId,
      binding.providerRef,
    );
    bindingReadiness.push(buildBindingReadinessRow(binding, exists));
  }
  return {
    bindings,
    bindingReadiness,
    readinessSummary: summarizeBindingReadiness(bindingReadiness),
  };
}
