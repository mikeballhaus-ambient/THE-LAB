import type { AppServerUrlSource, PlatformAppServerEntry } from '@/shared/types/platform-app-servers';

export type ApiHostEnv = {
  backendUrl?: string;
  theLabBackendUrl?: string;
  viteApiBaseUrl?: string;
  baseUrl?: string;
};

/** Host used to build app server URLs (no trailing slash, no port). */
export function resolveApiBaseHostFromEnv(env: ApiHostEnv): string {
  const explicit = env.backendUrl?.trim() || env.theLabBackendUrl?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '').replace(/:3000$/, '');
  }
  const host = (env.viteApiBaseUrl ?? env.baseUrl ?? 'http://localhost').replace(/\/$/, '');
  return host.replace(/:3000$/, '');
}

export function resolveAppServerPort(app: AppServerUrlSource): number | null {
  if (app.type === 'browser') {
    return null;
  }
  const port = app.server?.port ?? app.requiresPort;
  if (port == null || Number.isNaN(Number(port))) {
    return null;
  }
  return Number(port);
}

export function buildAppServerBaseUrl(apiHost: string, port: number): string {
  const host = apiHost.replace(/\/$/, '');
  return `${host}:${port}`;
}

export function toPlatformAppServerEntry(
  app: AppServerUrlSource,
  apiHost: string,
  isRunning: boolean,
): PlatformAppServerEntry | null {
  const port = resolveAppServerPort(app);
  if (port == null) {
    return null;
  }
  return {
    appId: app.id,
    name: app.name,
    url: buildAppServerBaseUrl(apiHost, port),
    port,
    type: app.type,
    isServerSideEnabled: Boolean(app.isServerSideEnabled),
    isRunning,
  };
}

export function listPlatformAppServerEntries(
  apps: ReadonlyArray<AppServerUrlSource>,
  apiHost: string,
  runningAppIds: ReadonlySet<string> | ReadonlyArray<string>,
  filterIds?: ReadonlySet<string> | ReadonlyArray<string>,
): PlatformAppServerEntry[] {
  const running = runningAppIds instanceof Set ? runningAppIds : new Set(runningAppIds);
  const filter = filterIds
    ? filterIds instanceof Set
      ? filterIds
      : new Set(filterIds)
    : null;

  const entries: PlatformAppServerEntry[] = [];
  for (const app of apps) {
    if (app.isEnabled === false) {
      continue;
    }
    if (filter && !filter.has(app.id)) {
      continue;
    }
    const entry = toPlatformAppServerEntry(app, apiHost, running.has(app.id));
    if (entry) {
      entries.push(entry);
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name) || a.appId.localeCompare(b.appId));
  return entries;
}

export function urlForAppId(
  apps: ReadonlyArray<PlatformAppServerEntry>,
  appId: string,
): string {
  return apps.find((a) => a.appId === appId)?.url ?? '';
}

export type LabAppMountProps = {
  serverUrl?: string;
  appDescription?: string;
};

/** Props passed from AppLifecycle into mounted app root SFCs (hybrid/server). */
export function buildLabAppMountProps(
  app: AppServerUrlSource & { description?: string },
  env: ApiHostEnv = {},
): LabAppMountProps {
  const props: LabAppMountProps = {};
  const description = app.description?.trim();
  if (description) {
    props.appDescription = description;
  }
  const port = resolveAppServerPort(app);
  if (port != null) {
    props.serverUrl = buildAppServerBaseUrl(resolveApiBaseHostFromEnv(env), port);
  }
  return props;
}
