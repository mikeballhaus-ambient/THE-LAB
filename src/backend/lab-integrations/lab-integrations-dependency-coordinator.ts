import appsService from '../db/Apps/apps-service';
import { labIntegrationsRepository } from '../db/LabIntegrations/lab-integrations-repository';
import { LabIntegrationsError } from '../db/LabIntegrations/lab-integrations-service';
import type { AppMetadata, IApp } from '@/shared/types/app/app.d';
import { DependencyGraph } from '@/shared/services/DependencyGraph';
import { resolveLaunchDependencyIds } from '@/shared/lab-integrations/resolve-launch-dependencies';
import { appIdsMatch, toRegistryAppId } from '@/shared/lab-integrations/normalize-app-id';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';

function resolveHostApp(hostAppId: string): IApp | undefined {
  const registryId = toRegistryAppId(hostAppId);
  return appsService.getAppById(registryId) ?? appsService.getAppById(hostAppId);
}

function getIntegrationPromotedDeps(metadata: AppMetadata | undefined): string[] {
  const list = metadata?.integrationPromotedDeps;
  return Array.isArray(list) ? list.map(toRegistryAppId) : [];
}

function setIntegrationPromotedDeps(metadata: AppMetadata, deps: string[]): AppMetadata {
  return { ...metadata, integrationPromotedDeps: deps };
}

function countEnabledBindingsForProvider(
  hostAppId: string,
  providerAppId: string,
  bindings: LabIntegrationBindingRecord[],
): number {
  return bindings.filter(
    (row) =>
      row.enabled && appIdsMatch(row.hostAppId, hostAppId) && appIdsMatch(row.providerAppId, providerAppId),
  ).length;
}

function assertNoDependencyCycle(host: IApp, nextDependencies: string[]): void {
  const allApps = appsService.getAllApps();
  const patched = allApps.map((app) =>
    app.id === host.id ? { ...app, dependencies: nextDependencies } : app,
  );
  const graph = new DependencyGraph(patched);
  if (graph.hasCycle()) {
    throw new LabIntegrationsError(
      'Adding this integration dependency would create a circular dependency',
      'VALIDATION',
    );
  }
}

export class LabIntegrationsDependencyCoordinator {
  private static instance: LabIntegrationsDependencyCoordinator | null = null;

  private constructor() {}

  static getInstance(): LabIntegrationsDependencyCoordinator {
    if (!LabIntegrationsDependencyCoordinator.instance) {
      LabIntegrationsDependencyCoordinator.instance = new LabIntegrationsDependencyCoordinator();
    }
    return LabIntegrationsDependencyCoordinator.instance;
  }

  getLaunchDependencyIds(hostAppId: string): string[] {
    const host = resolveHostApp(hostAppId);
    if (!host) {
      throw new LabIntegrationsError('Host app not found', 'NOT_FOUND');
    }
    const bindings = labIntegrationsRepository.listByHost(hostAppId);
    const hostBindings = bindings.length
      ? bindings
      : labIntegrationsRepository.listByHost(toRegistryAppId(hostAppId));
    return resolveLaunchDependencyIds(host.dependencies ?? [], hostBindings, host.id);
  }

  promoteIntegrationDependency(hostAppId: string, providerAppId: string): IApp {
    const host = resolveHostApp(hostAppId);
    if (!host) {
      throw new LabIntegrationsError('Host app not found', 'NOT_FOUND');
    }

    const providerId = toRegistryAppId(providerAppId);
    const deps = (host.dependencies ?? []).map(toRegistryAppId);
    if (deps.some((id) => appIdsMatch(id, providerId))) {
      return host;
    }

    const nextDeps = [...deps, providerId];
    assertNoDependencyCycle(host, nextDeps);

    const promoted = getIntegrationPromotedDeps(host.metadata);
    const nextPromoted = promoted.includes(providerId) ? promoted : [...promoted, providerId];
    const metadata = setIntegrationPromotedDeps(host.metadata ?? { category: '', author: '', version: '', tags: [] }, nextPromoted);

    const updated: IApp = { ...host, dependencies: nextDeps, metadata };
    appsService.updateApp(host.id, updated);
    const saved = appsService.getAppById(host.id);
    if (!saved) {
      throw new LabIntegrationsError('Failed to update host dependencies', 'VALIDATION');
    }
    return saved;
  }

  demoteIntegrationDependencyIfUnused(hostAppId: string, providerAppId: string): IApp | null {
    const host = resolveHostApp(hostAppId);
    if (!host) {
      return null;
    }

    const providerId = toRegistryAppId(providerAppId);
    const bindings = [
      ...labIntegrationsRepository.listByHost(hostAppId),
      ...labIntegrationsRepository.listByHost(toRegistryAppId(hostAppId)),
    ];

    if (countEnabledBindingsForProvider(host.id, providerId, bindings) > 0) {
      return host;
    }

    const promoted = getIntegrationPromotedDeps(host.metadata);
    if (!promoted.some((id) => appIdsMatch(id, providerId))) {
      return host;
    }

    const nextDeps = (host.dependencies ?? [])
      .map(toRegistryAppId)
      .filter((id) => !appIdsMatch(id, providerId));
    const nextPromoted = promoted.filter((id) => !appIdsMatch(id, providerId));
    const metadata = setIntegrationPromotedDeps(
      host.metadata ?? { category: '', author: '', version: '', tags: [] },
      nextPromoted,
    );

    const updated: IApp = { ...host, dependencies: nextDeps, metadata };
    appsService.updateApp(host.id, updated);
    return appsService.getAppById(host.id) ?? null;
  }
}

export const labIntegrationsDependencyCoordinator = LabIntegrationsDependencyCoordinator.getInstance();
