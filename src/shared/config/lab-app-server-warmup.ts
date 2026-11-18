import type { IApp } from '@/shared/types/app/app.d';
import { PROTECTED_PLATFORM_APP_IDS } from '@/shared/types/app/protected-apps';

/**
 * When true (default), main backend starts enabled hybrid/server app processes after listen.
 * Set LAB_APP_SERVER_WARMUP=0 to disable (e.g. minimal dev or external process supervisor).
 */
export function isLabAppServerWarmupEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.LAB_APP_SERVER_WARMUP?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') {
    return false;
  }
  return true;
}

/**
 * Which apps warm on boot.
 *
 * - `platform` (default) — protected platform product apps + their transitive dependency closure.
 *   Catalog apps start on demand when a user launches them or a host resolves launch deps.
 * - `all` — every enabled hybrid/server app (legacy behaviour; heavy with large catalogs).
 *
 * Set `LAB_APP_SERVER_WARMUP_SCOPE=all` to restore the old behaviour.
 */
export type LabAppServerWarmupScope = 'platform' | 'all';

export function resolveLabAppServerWarmupScope(
  env: NodeJS.ProcessEnv = process.env,
): LabAppServerWarmupScope {
  const raw = env.LAB_APP_SERVER_WARMUP_SCOPE?.trim().toLowerCase();
  return raw === 'all' ? 'all' : 'platform';
}

/** Enabled registry apps that expose a server entry (hybrid + server). */
export function shouldWarmUpAppServer(app: IApp): boolean {
  if (!app.isEnabled) {
    return false;
  }
  if (app.type !== 'server' && app.type !== 'hybrid') {
    return false;
  }
  if (app.isServerSideEnabled === false) {
    return false;
  }
  const entry = app.server?.entry?.trim();
  const port = app.server?.port;
  if (!entry || !port || port <= 0) {
    return false;
  }
  return true;
}

/**
 * App ids that must be running for the platform product apps to work:
 * the protected platform apps plus everything they depend on, transitively.
 *
 * Only includes apps that pass {@link shouldWarmUpAppServer} — browser apps in the
 * dependency lists (e.g. CRM's optional Approvals/Ledger) contribute nothing.
 */
export function resolvePlatformWarmupAppIds(apps: IApp[]): Set<string> {
  const byId = new Map(apps.map((app) => [app.id, app]));
  const warmable = new Set(apps.filter(shouldWarmUpAppServer).map((app) => app.id));

  const platformRootIds: readonly string[] = PROTECTED_PLATFORM_APP_IDS;
  const queue: string[] = platformRootIds.filter((id) => warmable.has(id));
  const included = new Set<string>(queue);

  while (queue.length > 0) {
    const id = queue.pop() as string;
    const app = byId.get(id);
    if (!app) {
      continue;
    }
    const deps = [...(app.dependencies ?? []), ...(app.optionalDependencies ?? [])];
    for (const depId of deps) {
      if (!warmable.has(depId) || included.has(depId)) {
        continue;
      }
      included.add(depId);
      queue.push(depId);
    }
  }

  return included;
}

/**
 * Returns the set of app ids to warm for the given scope.
 * `all` returns every warmable app id; `platform` returns the dependency closure.
 */
export function resolveWarmupAppIds(
  apps: IApp[],
  scope: LabAppServerWarmupScope = resolveLabAppServerWarmupScope(),
): Set<string> {
  if (scope === 'all') {
    return new Set(apps.filter(shouldWarmUpAppServer).map((app) => app.id));
  }
  return resolvePlatformWarmupAppIds(apps);
}
