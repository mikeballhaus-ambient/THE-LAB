/**
 * App types definition
 * Defines interfaces and types for app lifecycle management
 */

/**
 * Changelog entry for version history
 */
export interface ChangelogEntry {
  /** Version number (semver format) */
  version: string;
  /** Date of the change */
  date: string;
  /** Notes describing the changes */
  notes: string;
  /** Breaking changes for this version (optional) */
  breakingChanges?: {
    messages?: string[];
  };
  /** Migration guide for this version (optional) */
  migrationGuide?: string;
}

export interface ILifecycleHooks {
  onBeforeMount?(): void;
  onMounted?(): void | Promise<void>;
  onBeforeUnmount?(): void;
  onUnmounted?(): void;
  onSetup?(): void | Promise<void>;
  onTeardown?(): void | Promise<void>;
}

/**
 * Environment configuration for server apps
 */
export interface IServerConfig {
  /** Path to entry point */
  entry: string;
  /** Port number to listen on */
  port: number;
  /** Environment variables for the app */
  env?: {
    [key: string]: string;
  };
}

/**
 * App metadata interface
 */
export interface AppMetadata {
  /** Application category (ui-gallery, server, interactive, etc.) */
  category: string;
  /** Author of the app */
  author: string;
  /** App version */
  version: string;
  /** Tags for categorization */
  tags: string[];
  /** rm-64 — providers added to `dependencies` only via integration bind (safe to demote on unbind) */
  integrationPromotedDeps?: string[];
}

/**
 * App registry interface
 */
export interface IAppRegistry {
  /** Get app by ID */
  get(id: string): IApp | undefined;
  /** Get all apps */
  getAll(): IApp[];
  /** Get apps of specific type */
  getByType(type: 'browser' | 'server' | 'hybrid'): IApp[];
  /** Check if app exists by ID */
  has(id: string): boolean;
}

/**
 * App type discriminator
 */
export type AppType = 'browser' | 'server' | 'hybrid';

export interface IApp {
  id: string;
  name: string;
  description: string;
  faIcon: string;
  order: number;
  type: AppType;
  componentPath: string | undefined;
  isEnabled: boolean;
  isServerSideEnabled?: boolean;
  /** Platform core app; registry delete and removal are blocked when true. */
  isSystem?: boolean;
  /** Ordered platform catalog tag ids (primary = [0]). From app_tag_assignments. */
  catalogTagIds?: string[];
  // Original nested properties for backward compatibility
  server?: IServerConfig;
  metadata?: AppMetadata;
  changelog?: ChangelogEntry[];
  // Flattened properties for tool call compatibility
  serverEntry?: string;
  serverPort?: number;
  serverEnv?: Record<string, string>;
  metadataCategory?: string;
  metadataAuthor?: string;
  metadataVersion?: string;
  metadataTags?: string[];
  changelogVersion?: string;
  changelogDate?: string;
  changelogNotes?: string;
  changelogBreakingChangesMessages?: string[];
  changelogMigrationGuide?: string;
  dependencies: string[];
  optionalDependencies: string[];
  requiresPort?: number;
  version: string;
  latestVersion?: string;
  isUpdateAvailable?: boolean;
  appSystemInstructions?: string;
  /** rm-64 integration manifest (registry snapshot). */
  integrationManifest?: import('../lab-integration-manifest').AppLabIntegrationManifestV1;
}

/**
 * Create app factory function type
 */
export type AppFactory = () => IApp;

/**
 * Interface for app configuration with type discriminator
 */
export interface AppConfigWithAppType {
  id: string;
  name: string;
  description: string;
  faIcon: string;
  order: number;
  componentPath?: string;
  // Original nested properties for backward compatibility
  server?: IServerConfig;
  metadata?: AppMetadata;
  isEnabled?: boolean;
  isServerSideEnabled?: boolean;
  // Flattened properties for tool call compatibility
  serverEntry?: string;
  serverPort?: number;
  serverEnv?: Record<string, string>;
  metadataCategory?: string;
  metadataAuthor?: string;
  metadataVersion?: string;
  metadataTags?: string[];
  changelogVersion?: string;
  changelogDate?: string;
  changelogNotes?: string;
  changelogBreakingChangesMessages?: string[];
  changelogMigrationGuide?: string;
  // Optional app metadata properties
  dependencies?: string[];
  optionalDependencies?: string[];
  version?: string;
  changelog?: ChangelogEntry[];
  /** Explicit type discriminator */
  type: AppType;
}

/**
 * Unified App interface extending base IApp with runtime state
 */
export interface RuntimeApp extends Omit<IApp, 'reload' | 'emitReload'> {
  id: string;
  name: string;
  description: string;
  faIcon: string;
  order: number;
  componentPath?: string;
  server?: IServerConfig;
  metadata?: AppMetadata;
  isEnabled: boolean;
  isServerSideEnabled: boolean;
  component?: import('vue').Component;
  /** Client-only mount handle (not sent over socket). */
  instance?: { unmount(): void };
  reload?: () => void;
  emitReload?: () => void;

  // Tab-specific properties for multi-app tabs
  isActiveTab?: boolean;        // Is this app the currently selected tab?
  hasCloseButton?: boolean;     // Should show close button (browser and hybrid apps)
  lastLaunched?: number;        // Timestamp for failed launch cleanup
  /** Opened only as a dependency of another app launch (tab may be hidden by user preference) */
  isDependencyLaunch?: boolean;
}

/**
 * Tab state for tracking active tabs
 */
export interface AppTabState {
  appId: string;
  appName: string;
  isRunning: boolean;
  canClose: boolean;            // Browser/hybrid app UI can be closed (server process may persist)
}

export interface AppLaunchResult { 
  appId: string, 
  success: boolean,
  error?: string
}
