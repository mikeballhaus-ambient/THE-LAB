import { appsService } from '../db/Apps/apps-service';
import { getLabAppManager } from '../services/lab-app-manager-registry';
import type { IApp } from '@/shared/types/app/App';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabWorkflowDefinition } from '@/shared/types/lab-workflow';
import type {
  LabWorkflowPrepareAppsAttempt,
  LabWorkflowPrepareAppsResult,
  LabWorkflowRequiredAppHosting,
  LabWorkflowRequiredAppReadiness,
  LabWorkflowRequiredAppRef,
  LabWorkflowRequiredAppsSummary,
  LabWorkflowRequiredAppStatus,
} from '@/shared/types/lab-workflow-required-apps';
import { orderDependenciesForLaunch } from '@/shared/config/platform-app-dependency-order';
import {
  collectWorkflowRequiredAppRefs,
  workflowRequiredAppUsesOnlyPlatformConnectors,
} from '@/shared/utils/lab-workflow-required-apps';

/** Unit tests often evaluate workflows without bootstrapping the apps repository. */
function safeGetAppById(appId: string): IApp | undefined {
  try {
    return appsService.getAppById(appId);
  } catch {
    return undefined;
  }
}

function resolveHosting(
  app: IApp | undefined,
  ref: LabWorkflowRequiredAppRef,
): LabWorkflowRequiredAppHosting {
  if (workflowRequiredAppUsesOnlyPlatformConnectors(ref) && ref.roles.length === 1 && ref.roles[0] === 'integration_provider') {
    return 'platform_backend';
  }
  if (!app || app.type === 'browser' || !app.server?.port) {
    return 'not_required';
  }
  if (app.type === 'server' || app.type === 'hybrid') {
    return 'catalog_app_server';
  }
  return 'not_required';
}

function refNeedsLaunchableServer(
  app: IApp | undefined,
  ref: LabWorkflowRequiredAppRef,
  hosting: LabWorkflowRequiredAppHosting,
): boolean {
  if (hosting !== 'catalog_app_server') {
    return false;
  }
  if (!app?.isEnabled) {
    return false;
  }
  if (ref.roles.includes('event_publisher')) {
    return true;
  }
  if (ref.roles.includes('integration_provider') && !workflowRequiredAppUsesOnlyPlatformConnectors(ref)) {
    return true;
  }
  return false;
}

async function readinessForApp(
  app: IApp | undefined,
  ref: LabWorkflowRequiredAppRef,
): Promise<LabWorkflowRequiredAppStatus> {
  const hosting = resolveHosting(app, ref);
  let readiness: LabWorkflowRequiredAppReadiness = 'unknown';
  const launchable = refNeedsLaunchableServer(app, ref, hosting);

  if (!app) {
    readiness = 'unknown';
  } else if (!app.isEnabled) {
    readiness = 'disabled';
  } else if (hosting === 'platform_backend') {
    readiness = 'ready';
  } else if (hosting === 'not_required') {
    readiness = app.type === 'browser' ? 'browser_only' : 'ready';
  } else if (launchable) {
    const manager = getLabAppManager();
    const healthy = manager ? await manager.isAppServerHealthyById(app.id) : false;
    readiness = healthy ? 'ready' : 'stopped';
  } else {
    readiness = 'ready';
  }

  return {
    appId: ref.appId,
    name: app?.name ?? ref.appId,
    roles: ref.roles,
    serviceIds: ref.serviceIds,
    hosting,
    readiness,
    launchable,
  };
}

export async function summarizeWorkflowRequiredApps(
  definition: LabWorkflowDefinition,
  catalogEntries: LabDomainEventCatalogEntry[],
): Promise<LabWorkflowRequiredAppsSummary> {
  const refs = collectWorkflowRequiredAppRefs(definition, catalogEntries);
  const apps: LabWorkflowRequiredAppStatus[] = [];
  for (const ref of refs) {
    const app = safeGetAppById(ref.appId);
    apps.push(await readinessForApp(app, ref));
  }
  const allLaunchableReady = apps.filter((row) => row.launchable).every((row) => row.readiness === 'ready');
  return { apps, allLaunchableReady };
}

function launchOrderForRefs(refs: LabWorkflowRequiredAppRef[]): string[] {
  const manager = getLabAppManager();
  const graph = manager?.getDependencyGraph?.();
  const seeds = refs.filter((ref) => {
    const app = safeGetAppById(ref.appId);
    const hosting = resolveHosting(app, ref);
    return refNeedsLaunchableServer(app, ref, hosting);
  });

  const merged = new Set<string>();
  for (const ref of seeds) {
    const deps = graph?.getAppDependencies(ref.appId) ?? [];
    for (const id of orderDependenciesForLaunch([ref.appId, ...deps])) {
      const app = safeGetAppById(id);
      if (app && (app.type === 'server' || app.type === 'hybrid') && app.server?.port) {
        merged.add(id);
      }
    }
  }
  return orderDependenciesForLaunch([...merged]);
}

export async function prepareWorkflowRequiredApps(
  definition: LabWorkflowDefinition,
  catalogEntries: LabDomainEventCatalogEntry[],
  userId: number,
): Promise<LabWorkflowPrepareAppsResult> {
  const refs = collectWorkflowRequiredAppRefs(definition, catalogEntries);
  const manager = getLabAppManager();
  const attempts: LabWorkflowPrepareAppsAttempt[] = [];

  if (!manager) {
    const apps = await Promise.all(
      refs.map(async (ref) => readinessForApp(safeGetAppById(ref.appId), ref)),
    );
    // Jest and other lightweight hosts have no app process manager; blocking here would fail every
    // workflow test even when steps never call a catalog app server.
    return {
      apps,
      attempts,
      allLaunchableReady: true,
    };
  }

  const order = launchOrderForRefs(refs);
  for (const appId of order) {
    const app = safeGetAppById(appId);
    if (!app || !app.isEnabled || !app.server?.entry || !app.server.port) {
      attempts.push({ appId, success: false, error: 'App is not launchable' });
      continue;
    }
    if (await manager.isAppServerHealthyById(appId)) {
      attempts.push({ appId, success: true });
      continue;
    }
    await manager.launchServerApp(app.id, app.server.entry, app.server.port, userId);
    let healthy = await manager.isAppServerHealthyById(appId);
    for (let attempt = 0; attempt < 30 && !healthy; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      healthy = await manager.isAppServerHealthyById(appId);
    }
    attempts.push({
      appId,
      success: healthy,
      error: healthy ? undefined : 'Launch or health check failed',
    });
  }

  const summary = await summarizeWorkflowRequiredApps(definition, catalogEntries);
  const failed = attempts.filter((row) => !row.success);
  return {
    apps: summary.apps,
    attempts,
    allLaunchableReady: summary.allLaunchableReady,
    message:
      failed.length > 0
        ? `Could not start: ${failed.map((row) => row.appId).join(', ')}`
        : undefined,
  };
}
