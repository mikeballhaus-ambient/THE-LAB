/**
 * rm-67.1 — One-shot (re-runnable) backfill for legacy `(rm-64)` stub descriptions.
 *
 * Usage:
 *   npm run backfill:integration-stub-copy
 *   npm run backfill:integration-stub-copy -- --dry-run
 */
import { migrateLegacyIntegrationStubDescriptions } from '@/backend/lab-integrations/migrate-legacy-integration-stub-descriptions';

const dryRun = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  const result = await migrateLegacyIntegrationStubDescriptions({ dryRun });
  const mode = dryRun ? 'dry-run' : 'applied';
  console.log(
    `[backfill:integration-stub-copy] ${mode} — forms ${result.formsUpdated}/${result.formsScanned}, charts ${result.chartsUpdated}/${result.chartsScanned}`,
  );
}

main().catch((err) => {
  console.error('[backfill:integration-stub-copy] failed:', err);
  process.exit(1);
});
