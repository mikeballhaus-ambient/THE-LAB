import type { User } from '@/shared/types/user';
import { userCanModifyCatalogTagsForApp } from '@/shared/utils/catalog-tag-permissions';

export function assertUserCanSetAppCatalogTags(user: User, appId: string): boolean {
  return userCanModifyCatalogTagsForApp(user, appId);
}
