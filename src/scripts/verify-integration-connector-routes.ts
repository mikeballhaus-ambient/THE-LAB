/**
 * Assert every integration host registers `/api/connector/{segment}` routes for its manifest services.
 *
 * Usage: npm run verify:integration-connectors
 */
import { verifyIntegrationConnectorRoutes } from '@/backend/lab-integrations/verify-integration-connector-routes';

function main(): void {
  const errors = verifyIntegrationConnectorRoutes();
  if (errors.length > 0) {
    console.error('[verify:integration-connectors] failed:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  console.log('[verify:integration-connectors] ok — connector route wiring checked for golden hosts');
}

main();
