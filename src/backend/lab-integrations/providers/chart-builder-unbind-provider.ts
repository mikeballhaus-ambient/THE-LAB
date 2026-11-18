import type { Database } from 'better-sqlite3';
import { AppDatabaseServiceProxy } from '@/apps/lab-chartbuilder/db/app-db-service';
import { ChartsRepository, DataConnectorsRepository } from '@/apps/lab-chartbuilder/db/repositories';
import type {
  LabIntegrationProviderUnbindContext,
  LabIntegrationProviderUnbindHandler,
  LabIntegrationProviderUnbindOutcome,
} from '@/shared/lab-integrations/integration-provider-unbind';
import {
  isLabIntegrationsHubDiscoveryUrl,
  isRm64ProvisionedChartDescription,
} from '@/shared/lab-integrations/integration-stub-markers';

function countChartsUsingConnector(db: Database, connectorId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM charts WHERE data_connector_id = ?')
    .get(connectorId) as { count: number };
  return row?.count ?? 0;
}

export function cleanupChartBuilderStubFromRepos(
  repos: {
    charts: ChartsRepository;
    connectors: DataConnectorsRepository;
    db: Database;
  },
  providerRef: string,
): LabIntegrationProviderUnbindOutcome {
  const { charts, connectors, db } = repos;

  const chart = charts.findByKey(providerRef);
  if (!chart) {
    return { assetDeleted: false, connectorDeleted: false, skipped: true, skipReason: 'asset_not_found' };
  }

  const connectorId = chart.dataConnectorId;
  let hubConnector = false;
  if (connectorId != null) {
    const connector = connectors.findById(connectorId);
    hubConnector = isLabIntegrationsHubDiscoveryUrl(connector?.discoveryUrl ?? null);
  }

  const stubChart = isRm64ProvisionedChartDescription(chart.description ?? null);
  if (!stubChart && !hubConnector) {
    return {
      assetDeleted: false,
      connectorDeleted: false,
      skipped: true,
      skipReason: 'not_integration_stub',
    };
  }

  const assetDeleted = charts.delete(providerRef);

  let connectorDeleted = false;
  if (connectorId != null && assetDeleted && countChartsUsingConnector(db, connectorId) === 0) {
    connectorDeleted = connectors.delete(connectorId);
  }

  return { assetDeleted, connectorDeleted, skipped: false };
}

async function cleanupChartBuilderStub(providerRef: string): Promise<LabIntegrationProviderUnbindOutcome> {
  const proxy = AppDatabaseServiceProxy.getInstance();
  await proxy.initialize();
  return cleanupChartBuilderStubFromRepos(
    {
      charts: proxy.getChartsRepository(),
      connectors: proxy.getDataConnectorsRepository(),
      db: proxy.getDb(),
    },
    providerRef,
  );
}

export const chartBuilderUnbindProvider: LabIntegrationProviderUnbindHandler = {
  registryAppId: 'app-lab-chartbuilder',
  kinds: ['chart.surface'],
  async cleanupAfterUnbind(context: LabIntegrationProviderUnbindContext) {
    return cleanupChartBuilderStub(context.providerRef);
  },
};
