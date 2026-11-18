import type { RuntimeApp } from '@/shared/types';

/**
 * When closing a host app, dependency apps launched only as dependencies (and not
 * still required by another running app) should be torn down with it.
 */
export function collectDependencyAppsToTeardown(
  closingAppId: string,
  runningApps: RuntimeApp[],
  dependencyMap: Record<string, string[]>,
): string[] {
  const closingDeps = dependencyMap[closingAppId];
  if (!closingDeps?.length) {
    return [];
  }

  const otherRunningIds = runningApps
    .filter((app) => app.id !== closingAppId && app.isDependencyLaunch !== true)
    .map((app) => app.id);

  const stillNeededByOther = new Set<string>();
  for (const runningId of otherRunningIds) {
    const deps = dependencyMap[runningId];
    if (!deps?.length) {
      continue;
    }
    for (const depId of deps) {
      stillNeededByOther.add(depId);
    }
  }

  const toTeardown: string[] = [];
  for (const depId of closingDeps) {
    const runtime = runningApps.find((app) => app.id === depId);
    if (!runtime?.isDependencyLaunch) {
      continue;
    }
    if (stillNeededByOther.has(depId)) {
      continue;
    }
    toTeardown.push(depId);
  }

  return toTeardown;
}

export function resolveNextActiveTabId(runningApps: RuntimeApp[]): string | null {
  const primary =
    runningApps.find((app) => app.isDependencyLaunch !== true) ?? runningApps[0];
  return primary?.id ?? null;
}
