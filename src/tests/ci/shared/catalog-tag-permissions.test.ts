import { describe, expect, test } from '@jest/globals';
import type { User } from '@/shared/types/user';
import { userCanModifyCatalogTagsForApp } from '@/shared/utils/catalog-tag-permissions';

function userWithPerms(partial: User['permissions']): User {
  return {
    userId: 1,
    id: 1,
    email: 'u@test',
    name: 'u',
    role: 'member',
    status: 'active',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    permissions: partial,
  };
}

describe('userCanModifyCatalogTagsForApp', () => {
  test('global canModifyTags grants any app', () => {
    const user = userWithPerms({ global: { canModifyTags: true }, app: [] });
    expect(userCanModifyCatalogTagsForApp(user, 'app-lab-crm')).toBe(true);
  });

  test('app-scoped canModifyTags grants only that app', () => {
    const user = userWithPerms({
      global: {},
      app: [{ appId: 'app-lab-crm', canModifyTags: true }],
    });
    expect(userCanModifyCatalogTagsForApp(user, 'app-lab-crm')).toBe(true);
    expect(userCanModifyCatalogTagsForApp(user, 'app-lab-tasklist')).toBe(false);
  });
});
