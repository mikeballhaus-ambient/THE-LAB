import { databaseManager } from '@/backend/db/DatabaseManager';
import { AppDatabaseServiceProxy } from '@/apps/lab-formsbuilder/db/app-db-service';
import { provisionFormStubInFormsBuilderDb } from '@/backend/lab-integrations/lab-integrations-form-stub-provisioner';
import { enrichDiscoveryContractForStub } from '@/backend/lab-integrations/enrich-discovery-contract';
import { labIntegrationsHubService } from '@/backend/lab-integrations/lab-integrations-hub-service';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { makeTestUser } from '@/tests/helpers/test-user';

const admin = makeTestUser({ userId: 1, role: 'owner' });
const hostAppId = 'app-lab-chartbuilder';
const serviceId = 'chart-builder.charts';
const slots = ['chart.designer.metadata', 'chart.designer.connector'] as const;

async function main(): Promise<void> {
  await databaseManager.initialize();
  const registry = labIntegrationsHubService.getRegistryDiscoveryForCaller(admin, hostAppId, serviceId);
  const manifest = appsRepository.getIntegrationManifest(hostAppId);
  const service = manifest?.integrationServices?.find((row) => row.serviceId === serviceId);
  const contract = await enrichDiscoveryContractForStub(registry, {
    discoveryPath: service?.connector?.discoveryPath,
    serviceId,
    actorUserId: 1,
  });

  const proxy = AppDatabaseServiceProxy.getInstance();
  await proxy.initialize();
  const repos = {
    connectors: proxy.getDataConnectorsRepository(),
    forms: proxy.getFormsRepository(),
  };

  for (const slot of slots) {
    const result = await provisionFormStubInFormsBuilderDb(
      { hostAppId, serviceId, slot, overwrite: true, publish: true, contract, formName: slot },
      repos,
    );
    console.log(`${slot}: ${result.fieldCount} fields`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
