/**
 * AppUpdateManager - Manages app version checking and updates
 * 
 * Provides:
 * - Check for available updates  
 * - Download and apply app updates
 * - Version history and changelog management
 */

import { tryGetPlatformAppsCatalog } from './platform-apps-catalog';
import { IApp, ChangelogEntry } from '../../shared/types/app/app.d';

type CatalogApp = IApp & { latestVersion?: string; isUpdateAvailable?: boolean };

// Simple semver comparison - in production, use proper semver library
function versionGt(v1: string, v2: string): boolean {
  const [major1, minor1, patch1] = v1.split('.').map(Number);
  const [major2, minor2, patch2] = v2.split('.').map(Number);
  
  if (major1 > major2) return true;
  if (major1 < major2) return false;
  if (minor1 > minor2) return true;
  if (minor1 < minor2) return false;
  return patch1 > patch2;
}

function listCatalogApps(): IApp[] {
  const catalog = tryGetPlatformAppsCatalog();
  return catalog ? catalog.getAllApps() : [];
}

/**
 * Singleton instance of AppUpdateManager
 */
let instance: AppUpdateManager | null = null;

/**
 * Get or create singleton instance of AppUpdateManager
 */
export function getAppUpdateManager(): AppUpdateManager {
    if (!instance) {
        instance = new AppUpdateManager();
    }
    return instance;
}

/**
 * AppUpdateManager - Handles app version updates and changelog management
 */
export class AppUpdateManager {
    private registryUrl: string | null = null;
    private cache: Map<string, ChangelogEntry> = new Map();

    /**
     * Initialize update manager with optional registry URL
     * @param registryUrl URL of the app registry API (default: null - use local files)
     */
    constructor(registryUrl?: string) {
        this.registryUrl = registryUrl || process.env.APP_REGISTRY_URL || null;
    }

    /**
     * Check all apps for available updates
     * Fetches latest versions from registry and compares with installed versions
     * @param apps Array of current app configurations
     * @returns Apps with update availability flags set
     */
    async checkForUpdates(apps: IApp[]): Promise<IApp[]> {
        try {
            // Apps are now loaded from SQLite via appsService
            const localApps = apps;
         
            return apps.map(app => {
                const version = app.version || '0.0.0';
                // Check if update is available (simulated - in production, fetch from registry)
                const latestVersion = (localApps as CatalogApp[]).find((a) => a.id === app.id)?.latestVersion;
                if (latestVersion && versionGt(latestVersion, version)) {
                    app.latestVersion = latestVersion;
                    app.isUpdateAvailable = true;
                }
              
                // Always sync version to local config version
                const localApp = (localApps as CatalogApp[]).find((a) => a.id === app.id);
                if (localApp && localApp.version !== version) {
                    localApp.version = version;
                    localApp.latestVersion = version;
                    localApp.changelog = (localApp.changelog || []).map((c) => ({
                        ...c,
                        version: c.version ?? version,
                        date: c.date ?? '',
                        notes: c.notes ?? '',
                    }));
                }
              
                return app;
            });
        } catch (error) {
            console.error('Failed to check for updates:', error);
            return apps;
        }
    }

    /**
     * Get changelog for a specific version
     * @param appId - App identifier  
     * @param version - Version to get changelog for
     * @returns ChangelogEntry or null if not found
     */
    async getChangelog(appId: string, version: string): Promise<ChangelogEntry | null> {
        try {
            // Check cache first
            const cacheKey = `${appId}:${version}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey) as ChangelogEntry;
            }

            // Apps are now loaded from SQLite via appsService
            const apps = listCatalogApps();
            const app = apps.find((a) => a.id === appId);
      
            if (!app || !app.changelog) {
                return null;
            }

            const changelogEntry = app.changelog.find((entry: ChangelogEntry) => entry.version === version);
            if (changelogEntry) {
                this.cache.set(cacheKey, changelogEntry);
            }

            return changelogEntry || null;
        } catch (error) {
            console.error('Failed to get changelog:', error);
            return null;
        }
    }

    /**
     * Download and apply app update
     * @param appId - App identifier to update
     * @returns true if update was successful, false otherwise
     */
    async updateApp(appId: string): Promise<boolean> {
        try {
            // Apps are now loaded from SQLite via appsService
            const apps = listCatalogApps();
            const app = apps.find((a) => a.id === appId);
      
            if (!app) {
                throw new Error(`App ${appId} not found`);
            }

            const { type, server, componentPath } = app;

            // Apply update based on app type
            if (type === 'browser' && componentPath) {
                return await this.updateBrowserApp(appId, componentPath);
            } else if (type === 'server' && server?.entry) {
                return await this.updateServerApp(appId, server.entry);
            }

            throw new Error(`No update target found for app ${appId}`);
        } catch (error) {
            console.error('App update failed:', error);
            return false;
        }
    }

    /**
     * Update a browser app by writing updated component
     * @param appId - App identifier
     * @param componentPath - Path to the Vue component
     * @returns true if update successful
     */
    private async updateBrowserApp(targetAppId: string, componentPath: string): Promise<boolean> {
        try {
            const timestamp = new Date().toISOString();
            const formattedPath = componentPath.replace(/^src\//, '');
      
            console.log(`[${formattedPath}] Updating browser app: ${targetAppId} at ${componentPath}`);
      
            // In production: download from registry and write to file
            // For demo: create placeholder
            const updateContent = `// Updated by AppUpdateManager
// App: ${targetAppId}
// Timestamp: ${timestamp}
// TODO: Implement your component logic here

<template>
  <div class="updated-app">
    <h1>${componentPath.replace(/^src\//, '')} - Update Applied</h1>
    <p>Version updated successfully on ${new Date().toLocaleDateString()}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  console.log('component updated');
});
</script>

<style scoped>
.updated-app {
  text-align: center;
  padding: 2rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
}
</style>`;

            const fs = await import('fs/promises');
            await fs.writeFile(
                componentPath,
                updateContent,
                'utf-8'
            );

            console.log(`[AppUpdateManager] Browser app ${targetAppId} updated successfully`);
            return true;
        } catch (error) {
            console.error(`[AppUpdateManager] Failed to update browser app ${targetAppId}:`, error);
            return false;
        }
    }

    /**
     * Update a server app
     * @param appId - App identifier
     * @param entryPath - Path to the server entry file
     * @returns true if update successful
     */
    private async updateServerApp(targetAppId: string, entryPath: string): Promise<boolean> {
        try {
            const timestamp = new Date().toISOString();
      
            console.log(`[AppUpdateManager] Updating server app: ${targetAppId} at ${entryPath}`);
      
            // Create updated entry point
            const updateContent = `// Updated by AppUpdateManager
// App: ${targetAppId}
// Timestamp: ${timestamp}
// TODO: Implement your server logic here

/**
 * Updated ${targetAppId} server entry point
 * Update applied on ${new Date().toLocaleDateString()}
 */

// TODO: Setup server, handlers, and start listening
console.log(\`${targetAppId} server v${targetAppId} updated\`);
console.log(\`Server ready to accept connections\`);
`;

            const pathModule = await import('path');
            const fsModule = await import('fs/promises');
            await fsModule.writeFile(
                pathModule.join(__dirname, '..', '..', entryPath),
                updateContent,
                'utf-8'
            );
            console.log(`[AppUpdateManager] Server app ${targetAppId} entry updated`);

            return true;
        } catch (error) {
            console.error(`[AppUpdateManager] Failed to update server app ${targetAppId}:`, error);
            return false;
        }
    }

    /**
     * Get the current version of an app
     * @param appId - App identifier
     * @returns Version string or null if not found
     */
    async getAppVersion(appId: string): Promise<string | null> {
        try {
            // Apps are now loaded from SQLite via appsService
            const apps = listCatalogApps();
            const app = apps.find((a) => a.id === appId);
            return app ? app.version : null;
        } catch (error) {
            console.error('Failed to get app version:', error);
            return null;
        }
    }

    /**
     * Clear the changelog cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}
