/**
 * rm-69.6 — assert manifest index matches disk and merged catalog is valid.
 *
 * Usage: npm run verify:domain-event-manifests
 */
import { verifyDomainEventManifestPack } from '@/shared/lab-domain-events/verify-domain-event-manifest-pack';

function main(): void {
  const result = verifyDomainEventManifestPack();

  for (const warning of result.warnings) {
    console.warn(`[verify:domain-event-manifests] warning: ${warning}`);
  }

  if (!result.ok) {
    console.error('[verify:domain-event-manifests] failed:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `[verify:domain-event-manifests] ok — manifests=${result.stats.manifestFiles} entries=${result.stats.catalogEntries}`,
  );
}

main();