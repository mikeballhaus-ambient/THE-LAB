import type { User } from '@/shared/types/user';

export function userHasGlobalCanModifyTags(user: User | null | undefined): boolean {
  return Boolean(user?.permissions?.global?.canModifyTags);
}

export function userHasAppCanModifyTags(
  user: User | null | undefined,
  appId: string,
): boolean {
  const row = user?.permissions?.app?.find((p) => p.appId === appId);
  return Boolean(row?.canModifyTags);
}

/** Global or app-scoped permission to edit catalog tag assignments for one app. */
export function userCanModifyCatalogTagsForApp(
  user: User | null | undefined,
  appId: string,
): boolean {
  return userHasGlobalCanModifyTags(user) || userHasAppCanModifyTags(user, appId);
}
