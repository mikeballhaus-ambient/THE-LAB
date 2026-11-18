export type MaintenanceStatus = 'scheduled' | 'due' | 'done' | 'skipped';
export type MaintenancePriority = 'low' | 'normal' | 'high';

export interface HomeAsset {
  id: number;
  name: string;
  category: string;
  location: string;
  notes: string;
  createdAt: string;
}

export interface MaintenanceTask {
  id: number;
  assetId: number;
  /** Display name when tasks are nested under an asset (API/list only). */
  assetName?: string;
  title: string;
  dueDate: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  completedAt: string | null;
  notes: string;
  /** Optional spend in USD; omitted or null when unknown. */
  cost: number | null;
}

/** Asset with its maintenance tasks. */
export interface AssetWithTasks extends HomeAsset {
  tasks: MaintenanceTask[];
}

export interface UpsertAssetInput {
  name: string;
  category: string;
  location: string;
  notes: string;
}

export interface UpsertMaintenanceTaskInput {
  assetId: number;
  title: string;
  dueDate: string;
  priority: MaintenancePriority;
  notes: string;
  cost?: number | null;
}
