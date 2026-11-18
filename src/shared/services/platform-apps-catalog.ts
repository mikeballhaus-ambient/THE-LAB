import type { PlatformAppsCatalogPort } from './platform-apps-catalog-port';

let catalogPort: PlatformAppsCatalogPort | null = null;

export function registerPlatformAppsCatalog(port: PlatformAppsCatalogPort): void {
  catalogPort = port;
}

export function getPlatformAppsCatalog(): PlatformAppsCatalogPort {
  if (!catalogPort) {
    throw new Error(
      'PlatformAppsCatalog is not registered. Call registerPlatformAppsCatalog() during backend startup or CLI bootstrap.',
    );
  }
  return catalogPort;
}

/** Browser / tests: registry hydration uses socket data instead of SQLite. */
export function tryGetPlatformAppsCatalog(): PlatformAppsCatalogPort | null {
  return catalogPort;
}

export function resetPlatformAppsCatalogForTests(): void {
  catalogPort = null;
}

export type { PlatformAppsCatalogPort } from './platform-apps-catalog-port';
