import { AppDatabaseServiceProxy as FormsBuilderDb } from '@/apps/lab-formsbuilder/db/app-db-service';
import { AppDatabaseServiceProxy as ChartBuilderDb } from '@/apps/lab-chartbuilder/db/app-db-service';
import { LabIntegrationsError } from '@/backend/db/LabIntegrations/lab-integrations-service';
import type { LabIntegrationKind } from '@/shared/types/lab-integrations';
import { appIdsMatch } from '@/shared/lab-integrations/normalize-app-id';

type ProviderRefValidator = (
  kind: LabIntegrationKind,
  providerAppId: string,
  providerRef: string,
) => Promise<void>;

let validatorOverride: ProviderRefValidator | null = null;

/** Jest: skip or customize provider DB checks (main DB tests use :memory: only). */
export function setProviderAssetRefValidatorForTests(validator: ProviderRefValidator | null): void {
  validatorOverride = validator;
}

async function assertFormExists(providerRef: string): Promise<void> {
  const proxy = FormsBuilderDb.getInstance();
  await proxy.initialize();
  const form = await proxy.getFormsRepository().findByKey(providerRef);
  if (!form) {
    throw new LabIntegrationsError(
      `Forms Builder has no published form with key "${providerRef}". Call lab_integrations_provision_form_stub for this slot (use the returned formKey as providerRef) before lab_integrations_upsert_binding.`,
      'VALIDATION',
    );
  }
}

async function assertChartExists(providerRef: string): Promise<void> {
  const proxy = ChartBuilderDb.getInstance();
  await proxy.initialize();
  const chart = proxy.getChartsRepository().findByKey(providerRef);
  if (!chart) {
    throw new LabIntegrationsError(
      `Chart Builder has no chart with key "${providerRef}". Provision a chart stub (or create the chart) before binding chart.surface.`,
      'VALIDATION',
    );
  }
}

function kindRequiresProviderAsset(kind: LabIntegrationKind): boolean {
  return kind === 'form.surface' || kind === 'chart.surface';
}

async function checkProviderAssetExists(
  kind: LabIntegrationKind,
  providerAppId: string,
  providerRef: string,
): Promise<boolean> {
  if (!kindRequiresProviderAsset(kind)) {
    return true;
  }
  try {
    await assertProviderAssetExists(kind, providerAppId, providerRef);
    return true;
  } catch (err) {
    if (err instanceof LabIntegrationsError && err.code === 'VALIDATION') {
      return false;
    }
    throw err;
  }
}

export async function providerAssetExistsForBinding(
  kind: LabIntegrationKind,
  providerAppId: string,
  providerRef: string,
): Promise<boolean> {
  if (validatorOverride) {
    try {
      await validatorOverride(kind, providerAppId, providerRef);
      return true;
    } catch {
      return false;
    }
  }
  return checkProviderAssetExists(kind, providerAppId, providerRef);
}

export async function assertProviderAssetExists(
  kind: LabIntegrationKind,
  providerAppId: string,
  providerRef: string,
): Promise<void> {
  if (validatorOverride) {
    await validatorOverride(kind, providerAppId, providerRef);
    return;
  }

  const ref = providerRef.trim();
  if (!ref) {
    throw new LabIntegrationsError('providerRef is required for bindings', 'VALIDATION');
  }

  if (kind === 'form.surface') {
    if (!appIdsMatch(providerAppId, 'app-lab-formsbuilder')) {
      throw new LabIntegrationsError(
        `kind form.surface requires providerAppId app-lab-formsbuilder (got ${providerAppId})`,
        'VALIDATION',
      );
    }
    await assertFormExists(ref);
    return;
  }

  if (kind === 'chart.surface') {
    if (!appIdsMatch(providerAppId, 'app-lab-chartbuilder')) {
      throw new LabIntegrationsError(
        `kind chart.surface requires providerAppId app-lab-chartbuilder (got ${providerAppId})`,
        'VALIDATION',
      );
    }
    await assertChartExists(ref);
  }
}
