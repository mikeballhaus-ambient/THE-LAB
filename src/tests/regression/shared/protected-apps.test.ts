import { describe, test, expect } from '@jest/globals';

import {

  isAppDeletionProtected,

  protectedAppDeletionBlockedMessage,

  PROTECTED_PLATFORM_APP_IDS,

} from '@/shared/types/app/protected-apps';

import { deleteApp } from '@/backend/mcp/mcp-servers/apps/utils/app-manager-base-handlers';



describe('protected platform apps', () => {

  test('core platform apps are protected by id and isSystem flag', () => {
    for (const appId of ['app-lab-formsbuilder', 'app-lab-tasklist', 'app-lab-crm'] as const) {
      expect(PROTECTED_PLATFORM_APP_IDS).toContain(appId);
      expect(isAppDeletionProtected(appId)).toBe(true);
      expect(isAppDeletionProtected(appId, false)).toBe(true);
    }

    expect(isAppDeletionProtected('app-example-server', true)).toBe(true);
    expect(isAppDeletionProtected('app-example-server', false)).toBe(false);
    expect(isAppDeletionProtected('app-example-server')).toBe(false);
  });



  test('protectedAppDeletionBlockedMessage explains why delete is blocked', () => {

    expect(protectedAppDeletionBlockedMessage('app-lab-formsbuilder')).toContain('app-lab-formsbuilder');

    expect(protectedAppDeletionBlockedMessage('app-lab-formsbuilder')).toContain('protected');

  });



  test('deleteApp rejects protected app without deleting', async () => {

    const result = await deleteApp({ userId: 1, id: 'app-lab-formsbuilder' });

    expect(result.success).toBe(false);

    expect(result.content).toContain('app-lab-formsbuilder');

    expect(result.content).toContain('protected');

  });

});

