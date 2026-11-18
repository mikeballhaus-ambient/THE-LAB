/**
 * Platform app tag definition
 */
export interface PlatformAppTag {
  /** Unique tag identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Tag description */
  description: string;
  /** Sort order for display (lower = first) */
  sortOrder: number;
  /** Whether this is a system-managed tag */
  isSystem?: boolean;
}

export interface PlatformAppTagDeleteBlocked {
  error: 'TAG_IN_USE';
  message: string;
  apps: Array<{ appId: string; appName: string }>;
}

export interface PlatformAppTagsPayload {
  tags: PlatformAppTag[];
}

export interface SetAppCatalogTagsBody {
  appId: string;
  tagIds: string[];
}
