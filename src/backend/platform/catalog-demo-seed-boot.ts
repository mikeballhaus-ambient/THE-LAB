import type { Database } from 'better-sqlite3';
import { isCatalogDemoSeedAppId, executeCatalogDemoSeedPack } from './catalog-demo-seed-direct';
import { catalogDemoPackIdFor } from '@/shared/config/catalog-demo-seed-packs';

/**
 * Boot-time demo seeding for catalog app servers.
 *
 * Called from each app's `server.ts` right after its tables are bootstrapped, so the app
 * opens with rows on a fresh clone **without** the user clicking Apply in Settings.
 *
 * Non-fatal by design: a seed failure must never stop an app server from starting. The
 * admin Apply path in Settings remains available to repair a failed boot seed.
 */
export function seedCatalogDemoOnBoot(db: Database, appId: string): void {
  if (!isCatalogDemoSeedAppId(appId)) {
    return;
  }
  const packId = catalogDemoPackIdFor(appId);
  if (!packId) {
    return;
  }
  void executeCatalogDemoSeedPack(db, appId, packId, 'apply').catch((err: unknown) => {
    console.warn(
      `[${appId}] demo seed on boot failed:`,
      err instanceof Error ? err.message : err,
    );
  });
}

/**
 * Fire-and-forget variant for `start()` bodies that are not `async`-aware.
 *
 * Kept separate so call sites read intentionally: `void seedCatalogDemoOnBootAsync(db, id)`.
 */
export async function seedCatalogDemoOnBootAsync(db: Database, appId: string): Promise<void> {
  if (!isCatalogDemoSeedAppId(appId)) {
    return;
  }
  const packId = catalogDemoPackIdFor(appId);
  if (!packId) {
    return;
  }
  try {
    await executeCatalogDemoSeedPack(db, appId, packId, 'apply');
  } catch (err) {
    console.warn(
      `[${appId}] demo seed on boot failed:`,
      err instanceof Error ? err.message : err,
    );
  }
}
