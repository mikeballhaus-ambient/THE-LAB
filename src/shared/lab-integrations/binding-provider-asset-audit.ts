import type { LabIntegrationBindingRecord, LabIntegrationKind } from '@/shared/types/lab-integrations';

export type BindingProviderReadiness = 'ready' | 'missing_provider_asset' | 'not_applicable';

export interface LabIntegrationBindingReadinessRow {
  bindingId: string;
  slot: string;
  kind: LabIntegrationKind;
  providerAppId: string;
  providerRef: string;
  enabled: boolean;
  providerAssetExists: boolean;
  readiness: BindingProviderReadiness;
}

export interface LabIntegrationBindingsReadinessSummary {
  totalBindings: number;
  ready: number;
  missingProviderAsset: number;
  notApplicable: number;
}

export function summarizeBindingReadiness(
  rows: LabIntegrationBindingReadinessRow[],
): LabIntegrationBindingsReadinessSummary {
  let ready = 0;
  let missingProviderAsset = 0;
  let notApplicable = 0;
  for (const row of rows) {
    if (row.readiness === 'ready') {
      ready += 1;
    } else if (row.readiness === 'missing_provider_asset') {
      missingProviderAsset += 1;
    } else {
      notApplicable += 1;
    }
  }
  return {
    totalBindings: rows.length,
    ready,
    missingProviderAsset,
    notApplicable,
  };
}

export function buildBindingReadinessRow(
  binding: LabIntegrationBindingRecord,
  providerAssetExists: boolean,
): LabIntegrationBindingReadinessRow {
  let readiness: BindingProviderReadiness = 'not_applicable';
  if (binding.kind === 'form.surface' || binding.kind === 'chart.surface') {
    readiness = providerAssetExists ? 'ready' : 'missing_provider_asset';
  }
  return {
    bindingId: binding.id,
    slot: binding.slot,
    kind: binding.kind,
    providerAppId: binding.providerAppId,
    providerRef: binding.providerRef,
    enabled: binding.enabled,
    providerAssetExists,
    readiness,
  };
}
