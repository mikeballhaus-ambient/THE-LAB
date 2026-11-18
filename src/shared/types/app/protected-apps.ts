import { LAB_PRODUCT_APP_FOLDER_BY_ID } from '@/shared/config/platform-lab-product-app-ids';

/**
 * Platform apps that must never be removed from the registry or filesystem via App Management.
 * Forms Builder is shared infrastructure; CRM, Task List, and Help Desk depend on it as consumers.
 */
/** Canonical registry IDs for system apps (also flagged via apps.is_system). */
export const PROTECTED_PLATFORM_APP_IDS = [
  'app-lab-formsbuilder',
  'app-lab-tasklist',
  'app-lab-crm',
  'app-lab-helpdesk',
  'app-lab-chartbuilder',
  /**
   * rm-64 §30.8 — Knowledge Base is the lab's documentation hub and must always be
   * reachable (humans via the app, agents via the KB MCP server), so it is a platform app.
   */
  'app-knowledge-base',
] as const;

export type ProtectedPlatformAppId = (typeof PROTECTED_PLATFORM_APP_IDS)[number];

export function isAppDeletionProtected(appId: string, isSystem?: boolean): boolean {
  if (isSystem === true) {
    return true;
  }
  return (PROTECTED_PLATFORM_APP_IDS as readonly string[]).includes(appId);
}

export function protectedAppDeletionBlockedMessage(appId: string): string {
  const folder = LAB_PRODUCT_APP_FOLDER_BY_ID[appId] ?? appId.replace(/^app-/, '');
  return (
    `Cannot delete app "${appId}": it is a protected foundational THE-LAB app and cannot be removed. ` +
    `Edit its source under src/apps/${folder}/ instead of deleting the registry entry.`
  );
}
