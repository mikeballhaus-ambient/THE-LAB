export type AppSeedPackTier = 'infrastructure' | 'demo';

export type AppSeedAction = 'apply' | 'remove';

export interface AppSeedPackManifest {
  packId: string;
  tier: AppSeedPackTier;
  label: string;
  description: string;
  allowRemove: boolean;
}

export interface AppSeedPackStatus {
  packId: string;
  present: boolean;
  rowCount?: number;
  serverReachable?: boolean;
  message?: string;
}

export interface AppSeedDataManifest {
  appId: string;
  appName: string;
  packs: AppSeedPackManifest[];
}

export interface AppSeedDataOverviewEntry {
  manifest: AppSeedDataManifest;
  status: AppSeedPackStatus[];
}

export interface AppSeedOperationResult {
  success: boolean;
  content: string;
}

export type AppSeedBulkAction = 'remove-demo' | 'apply-demo' | 'repair-infrastructure';

export interface AppSeedBulkPackResult {
  appId: string;
  packId: string;
  action: 'apply' | 'remove';
  success: boolean;
  content: string;
  skipped?: boolean;
}

export interface AppSeedBulkOperationResult {
  success: boolean;
  content: string;
  results: AppSeedBulkPackResult[];
}
