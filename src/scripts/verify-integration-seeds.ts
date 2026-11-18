/**
 * Phase 10 gate — bootstrap from committed seeds and assert integration manifests + bindings.
 *
 * Usage: npm run verify:integration-seeds
 */
import { verifyIntegrationConnectorRoutes } from '@/backend/lab-integrations/verify-integration-connector-routes';
import { verifyIntegrationSeedPackFromBootstrap } from '@/backend/lab-integrations/verify-integration-seed-pack';

async function main(): Promise<void> {
  const connectorRouteErrors = verifyIntegrationConnectorRoutes();
  if (connectorRouteErrors.length > 0) {
    console.error('[verify:integration-seeds] connector route wiring failed:');
    for (const err of connectorRouteErrors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  const result = await verifyIntegrationSeedPackFromBootstrap();

  for (const warning of result.warnings) {
    console.warn(`[verify:integration-seeds] warning: ${warning}`);
  }

  if (!result.ok) {
    console.error('[verify:integration-seeds] failed:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `[verify:integration-seeds] ok — bindings=${result.stats.bindingCount} manifestHosts=${result.stats.manifestHostsChecked}`,
  );
}

main().catch((err) => {
  console.error('[verify:integration-seeds] unexpected error:', err);
  process.exit(1);
});
