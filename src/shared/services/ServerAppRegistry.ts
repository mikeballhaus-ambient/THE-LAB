import { IServerConfig, AppMetadata } from '../types/app/app.d';

type ServerAppMetadata = AppMetadata | Record<string, unknown>;

/**
 * ServerAppRegistry - Singleton registry for server app configurations
 * 
 * Provides a centralized store for server app metadata and configurations.
 * Server apps are registered here so that AppManager can discover and
 * manage them during runtime.
 */
export class ServerAppRegistry {
  private static instance: ServerAppRegistry;
  private apps: Map<string, { config: IServerConfig; metadata: ServerAppMetadata }>;

  private constructor() {
    this.apps = new Map();
  }

  /**
   * Get the singleton instance of ServerAppRegistry
   * @returns ServerAppRegistry singleton instance
   */
  public static getInstance(): ServerAppRegistry {
    if (!ServerAppRegistry.instance) {
      ServerAppRegistry.instance = new ServerAppRegistry();
    }
    return ServerAppRegistry.instance;
  }

  /**
   * Register a server app configuration
   * @param id Unique identifier for the server app
   * @param config Server configuration object
   * @param metadata Optional metadata for the server app
   */
  public register(id: string, config: IServerConfig, metadata?: ServerAppMetadata): void {
    // If app already registered, clear existing interval monitoring
    this.apps.set(id, { config, metadata: metadata || {} });

    // Set default port if not specified
    if (!config.port) {
      config = { ...config, port: 4000 };
    }

    console.log(`[ServerAppRegistry] Registered server app: ${id} at port ${config.port}`);
  }

  /**
   * Get server app configuration by ID
   * @param id Unique identifier for the server app
   * @returns App config object if found, undefined otherwise
   */
  public get(id: string): { config: IServerConfig; metadata?: ServerAppMetadata } | undefined {
    return this.apps.get(id);
  }

  /**
   * Check if a server app is registered
   * @param id Unique identifier for the server app
   * @returns true if app is registered
   */
  public has(id: string): boolean {
    return this.apps.has(id);
  }

  /**
   * Get all registered server apps
   * @returns Array of { id, config, metadata } objects
   */
  public getAll(): { id: string; config: IServerConfig; metadata?: ServerAppMetadata }[] {
    return Array.from(this.apps.entries())
      .map(([id, { config, metadata }]) => ({ id, config, metadata }))
      .sort((a, b) =>
        (a.config.port || 0) > (b.config.port || 0) ? 1 : -1
      );
  }

  /**
   * Get all registered server app IDs
   * @returns Array of server app IDs
   */
  public getIds(): string[] {
    return Array.from(this.apps.keys());
  }

  /**
   * Delete a server app from the registry
   * @param id Unique identifier for the server app
   */
  public unregister(id: string): boolean {
    const deleted = this.apps.delete(id);
    if (deleted) {
      console.log(`[ServerAppRegistry] Unregistered server app: ${id}`);
    }
    return deleted;
  }

  /**
   * Get the number of registered server apps
   * @returns Count of registered server apps
   */
  public size(): number {
    return this.apps.size;
  }

  /**
   * Check if registry is empty
   * @returns true if no apps are registered
   */
  public isEmpty(): boolean {
    return this.apps.size === 0;
  }

  /**
   * Iterate over all registered server apps
   * @param callback Function to call for each app: (id, config, metadata) => void
   */
  public forEach(
    callback: (id: string, config: IServerConfig, metadata: ServerAppMetadata) => void
  ): void {
    this.apps.forEach((value, key) => {
      callback(key, value.config, value.metadata);
    });
  }

  /**
   * Update metadata for a registered server app
   * @param id Unique identifier for the server app
   * @param metadata New metadata object
   */
  public updateMetadata(id: string, metadata: ServerAppMetadata): boolean {
    const app = this.apps.get(id);
    if (app) {
      app.metadata = metadata;
      console.log(`[ServerAppRegistry] Updated metadata for server app: ${id}`);
      return true;
    }
    console.warn(`[ServerAppRegistry] No server app found with id: ${id}`);
    return false;
  }

  /**
   * Clear all server apps from the registry
   */
  public clear(): void {
    this.apps.clear();
    console.log('[ServerAppRegistry] Cleared all server apps');
  }
}
