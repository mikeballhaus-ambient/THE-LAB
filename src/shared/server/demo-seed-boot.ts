import type { Database } from 'better-sqlite3';
import { isAppSeedBootDisabled } from '@/shared/config/app-seed-boot-flags';

export interface DemoSeedBootAdapter {
  bootFlagKey: string;
  has(db: Database): boolean;
  seed(db: Database, options?: { adminApply?: boolean }): unknown;
}

/**
 * Run an app's own demo seed at server boot.
 *
 * Each catalog app calls this with **its own** seed module, so no shared module has to
 * import all 15 apps. Boot seeding must never prevent an app from starting — failures are
 * logged and swallowed; the Settings → Apply path remains available to repair.
 *
 * Skipped only when the admin removed the pack (boot flag set). **`adapter.has()` is
 * deliberately not consulted here**: a seed may need to supersede its own earlier output
 * (a revision bump), and that check lives inside `seed()`, which is idempotent. Short-
 * circuiting on `has()` first made such revisions unreachable on boot.
 */
export function runDemoSeedOnBoot(db: Database, appId: string, adapter: DemoSeedBootAdapter): void {
  try {
    if (isAppSeedBootDisabled(db, adapter.bootFlagKey)) {
      return;
    }
    adapter.seed(db);
  } catch (err) {
    console.warn(
      `[${appId}] demo seed on boot failed:`,
      err instanceof Error ? err.message : err,
    );
  }
}
