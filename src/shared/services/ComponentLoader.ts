// ComponentLoader.ts (FRONTEND ONLY)
import type { Component } from 'vue';
import { appComponentGlob, type AppVueLoader, type AppVueLoaderMap } from './app-component-glob';

/**
 * Normalize Vite glob keys and registry paths to `/src/apps/...` (forward slashes).
 *
 * Handles three key shapes:
 *  - absolute/registry paths containing `/src/apps/`
 *  - drive-letter keys (`c:/.../src/apps/...`) emitted by root-absolute globs
 *  - relative glob keys (`../../apps/...`) emitted by the relative glob pattern
 */
export function normalizeAppComponentPath(componentPath: string): string {
  const forward = componentPath.trim().replace(/\\/g, '/');
  if (!forward) {
    return forward;
  }
  const srcAppsIdx = forward.indexOf('/src/apps/');
  if (srcAppsIdx >= 0) {
    return forward.slice(srcAppsIdx);
  }
  if (forward.startsWith('src/apps/')) {
    return `/${forward}`;
  }
  // Relative glob keys (e.g. '../../apps/x/front-end/App.vue') → '/src/apps/x/...'
  const appsIdx = forward.indexOf('apps/');
  if (appsIdx > 0 && forward.slice(0, appsIdx).includes('..')) {
    return `/src/${forward.slice(appsIdx)}`;
  }
  return forward.startsWith('/') ? forward : `/${forward}`;
}

function normalizeLoaderMap(loaders: AppVueLoaderMap): AppVueLoaderMap {
  const normalized: AppVueLoaderMap = {};
  for (const [key, loader] of Object.entries(loaders)) {
    normalized[normalizeAppComponentPath(key)] = loader;
  }
  return normalized;
}

let appRootLoaders: AppVueLoaderMap | undefined;

function getAppRootLoaders(): AppVueLoaderMap {
  if (!appRootLoaders) {
    appRootLoaders = normalizeLoaderMap(appComponentGlob);
  }
  return appRootLoaders;
}

const loadedModules = new Map<string, AppVueLoader>();

/** Prefer front-end entry SFCs when multiple glob keys match the same suffix. */
function pickLoaderKey(keys: string[], normalizedPath: string): string | undefined {
  if (keys.length === 0) {
    return undefined;
  }
  if (keys.length === 1) {
    return keys[0];
  }
  const exact = keys.find((k) => k === normalizedPath);
  if (exact) {
    return exact;
  }
  const frontEnd = keys.filter((k) => k.includes('/front-end/'));
  const pool = frontEnd.length > 0 ? frontEnd : keys;
  return pool.sort((a, b) => a.length - b.length)[0];
}

/** Pure lookup helper (testable without Vite `import.meta.glob`). */
export function findAppRootLoaderKey(
  loaders: AppVueLoaderMap,
  componentPath: string,
): string | undefined {
  const normalized = normalizeAppComponentPath(componentPath);
  if (loaders[normalized]) {
    return normalized;
  }
  const suffix = normalized.replace(/^\/src\/apps\//, '').toLowerCase();
  const matches = Object.keys(loaders).filter(
    (key) => key.replace(/^\/src\/apps\//, '').toLowerCase() === suffix,
  );
  return pickLoaderKey(matches, normalized);
}

/**
 * Resolve a dynamic import for a single app root component path.
 * Falls back to scanning glob keys when path casing differs slightly.
 */
export function resolveAppRootLoader(componentPath: string): AppVueLoader | undefined {
  const loaders = getAppRootLoaders();
  const key = findAppRootLoaderKey(loaders, componentPath);
  return key ? loaders[key] : undefined;
}

/** Canonical app root SFC paths created by TemplateGenerator (`/src/apps/{slug}/front-end/App.vue`). */
const APP_ROOT_COMPONENT_PATH_RE =
  /^\/src\/apps\/[a-z0-9][a-z0-9-]*\/front-end\/App\.vue$/i;

export function isAppRootComponentPath(componentPath: string): boolean {
  return APP_ROOT_COMPONENT_PATH_RE.test(normalizeAppComponentPath(componentPath));
}

/**
 * Apps scaffolded while Vite is running are not in `import.meta.glob` until dev server restart.
 * Dynamic import loads newly created app roots without a full restart (dev + production builds).
 */
export function createDynamicAppRootLoader(normalizedPath: string): AppVueLoader {
  return () => import(/* @vite-ignore */ normalizedPath);
}

function resolveLoaderForPath(componentPath: string, normalized: string): AppVueLoader | undefined {
  const fromGlob = resolveAppRootLoader(componentPath);
  if (fromGlob) {
    return fromGlob;
  }
  if (isAppRootComponentPath(normalized)) {
    return createDynamicAppRootLoader(normalized);
  }
  return undefined;
}

/** Load one app dashboard root component (lazy). */
export async function loadAppRootComponent(componentPath: string): Promise<Component | undefined> {
  const normalized = normalizeAppComponentPath(componentPath);
  const cached = loadedModules.get(normalized);
  const loader = cached ?? resolveLoaderForPath(componentPath, normalized);
  if (!loader) {
    console.error(`[ComponentLoader] No lazy loader for: ${componentPath}`);
    return undefined;
  }
  if (!cached) {
    loadedModules.set(normalized, loader);
  }
  try {
    const module = await loader();
    return module.default;
  } catch (error) {
    console.error(`[ComponentLoader] Failed to load app root: ${componentPath}`, error);
    return undefined;
  }
}

/**
 * @deprecated Prefer {@link loadAppRootComponent}. Kept for callers that enumerate keys in tests.
 */
export function getComponentModules(): AppVueLoaderMap {
  return { ...getAppRootLoaders(), ...Object.fromEntries(loadedModules) };
}
