import type { Database } from 'better-sqlite3';
import { AppDatabaseServiceProxy } from '@/apps/lab-formsbuilder/db/app-db-service';
import { DataConnectorsRepository, FormsRepository } from '@/apps/lab-formsbuilder/db/repositories';
import type {
  LabIntegrationProviderUnbindContext,
  LabIntegrationProviderUnbindHandler,
  LabIntegrationProviderUnbindOutcome,
} from '@/shared/lab-integrations/integration-provider-unbind';
import {
  isLabIntegrationsHubDiscoveryUrl,
  isRm64ProvisionedFormDescription,
} from '@/shared/lab-integrations/integration-stub-markers';

function countFormsUsingConnector(db: Database, connectorId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM forms WHERE data_connector_id = ?')
    .get(connectorId) as { count: number };
  return row?.count ?? 0;
}

export async function cleanupFormsBuilderStubFromRepos(
  repos: {
    forms: FormsRepository;
    connectors: DataConnectorsRepository;
    db: Database;
  },
  providerRef: string,
): Promise<LabIntegrationProviderUnbindOutcome> {
  const { forms, connectors, db } = repos;

  const form = await forms.findByKey(providerRef);
  if (!form) {
    return { assetDeleted: false, connectorDeleted: false, skipped: true, skipReason: 'asset_not_found' };
  }

  const connectorId = form.dataConnecter?.id;
  const hubConnector = isLabIntegrationsHubDiscoveryUrl(form.dataConnecter?.discoveryUrl ?? null);
  const stubForm = isRm64ProvisionedFormDescription(form.description ?? null);

  if (!stubForm && !hubConnector) {
    return {
      assetDeleted: false,
      connectorDeleted: false,
      skipped: true,
      skipReason: 'not_integration_stub',
    };
  }

  const assetDeleted = await forms.deleteByKey(providerRef);

  let connectorDeleted = false;
  if (connectorId != null && assetDeleted) {
    if (countFormsUsingConnector(db, connectorId) === 0) {
      connectorDeleted = await connectors.delete(connectorId);
    }
  }

  return { assetDeleted, connectorDeleted, skipped: false };
}

async function cleanupFormsBuilderStub(providerRef: string): Promise<LabIntegrationProviderUnbindOutcome> {
  const proxy = AppDatabaseServiceProxy.getInstance();
  await proxy.initialize();
  return cleanupFormsBuilderStubFromRepos(
    {
      forms: proxy.getFormsRepository(),
      connectors: proxy.getDataConnectorsRepository(),
      db: proxy.getDb(),
    },
    providerRef,
  );
}

export const formsBuilderUnbindProvider: LabIntegrationProviderUnbindHandler = {
  registryAppId: 'app-lab-formsbuilder',
  kinds: ['form.surface'],
  async cleanupAfterUnbind(context: LabIntegrationProviderUnbindContext) {
    return cleanupFormsBuilderStub(context.providerRef);
  },
};
