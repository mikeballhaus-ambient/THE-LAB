import { describe, expect, test, beforeAll } from '@jest/globals';

import { databaseManager } from '@/backend/db/DatabaseManager';

import { authRepository } from '@/backend/db/Auth/auth-repository';



describe('authRepository.updateUser partial updates', () => {

  beforeAll(async () => {

    await databaseManager.initialize();

  });



  test('role-only update does not clear email', async () => {

    const email = `sso-partial-${Date.now()}@lab.local`;

    const name = `sso_user_${Date.now()}`;

    const created = await authRepository.createSsoUser(email, name, 'viewer');

    expect(created.email).toBe(email);



    const updated = authRepository.updateUser(created.userId, { role: 'member' });

    expect(updated?.email).toBe(email);

    expect(updated?.role).toBe('member');

    expect(updated?.name).toBe(name);
  });

  test('isDeveloperMode update persists', async () => {
    const email = `dev-mode-${Date.now()}@lab.local`;
    const name = `dev_user_${Date.now()}`;
    const created = await authRepository.createSsoUser(email, name, 'member');
    expect(created.isDeveloperMode).toBe(false);

    const updated = authRepository.updateUser(created.userId, { isDeveloperMode: true });
    expect(updated?.isDeveloperMode).toBe(true);

    const reloaded = authRepository.findUserById(created.userId);
    expect(reloaded?.isDeveloperMode).toBe(true);
  });
});

