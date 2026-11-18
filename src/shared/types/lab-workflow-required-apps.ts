/** Why a catalog app appears in a workflow's dependency list. */
export type LabWorkflowRequiredAppRole = 'event_publisher' | 'integration_provider';

/** How connector traffic reaches this app in a workflow run. */
export type LabWorkflowRequiredAppHosting =
  | 'platform_backend'
  | 'catalog_app_server'
  | 'not_required';

export type LabWorkflowRequiredAppReadiness =
  | 'ready'
  | 'stopped'
  | 'disabled'
  | 'browser_only'
  | 'unknown';

export interface LabWorkflowRequiredAppRef {
  appId: string;
  roles: LabWorkflowRequiredAppRole[];
  serviceIds: string[];
}

export interface LabWorkflowRequiredAppStatus {
  appId: string;
  name: string;
  roles: LabWorkflowRequiredAppRole[];
  serviceIds: string[];
  hosting: LabWorkflowRequiredAppHosting;
  readiness: LabWorkflowRequiredAppReadiness;
  /** When true, a manual prepare or enable warm-up may launch this app's server process. */
  launchable: boolean;
}

export interface LabWorkflowRequiredAppsSummary {
  apps: LabWorkflowRequiredAppStatus[];
  /** All launchable catalog servers that must be healthy for a full run. */
  allLaunchableReady: boolean;
}

export interface LabWorkflowPrepareAppsAttempt {
  appId: string;
  success: boolean;
  error?: string;
}

export interface LabWorkflowPrepareAppsResult {
  apps: LabWorkflowRequiredAppStatus[];
  attempts: LabWorkflowPrepareAppsAttempt[];
  allLaunchableReady: boolean;
  message?: string;
}
