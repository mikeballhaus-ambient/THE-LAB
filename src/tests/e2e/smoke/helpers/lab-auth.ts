import { expect, type Locator, type Page } from '@playwright/test';

const ADMIN_USER = process.env.SMOKE_ADMIN_USER ?? 'Admin';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD ?? 'admin';

const LOGIN_HEADING = 'Sign in to THE-LAB';

function theLabLoginDialog(page: Page): Locator {
  return page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: LOGIN_HEADING }),
  });
}

async function openLoginDialogIfNeeded(page: Page): Promise<void> {
  const loginHeading = page.getByRole('heading', { name: LOGIN_HEADING });
  if (await loginHeading.isVisible().catch(() => false)) {
    return;
  }
  const settingsLogin = page.getByRole('button', { name: 'Login', exact: true });
  if (await settingsLogin.isVisible().catch(() => false)) {
    await settingsLogin.click();
  }
  await expect(loginHeading).toBeVisible({ timeout: 120_000 });
}

async function completeForcedPasswordChangeIfShown(page: Page): Promise<void> {
  const header = page.getByRole('heading', { name: 'Change your password' });
  const visible = await header.isVisible().catch(() => false);
  if (!visible) {
    return;
  }

  const newPassword = process.env.SMOKE_ADMIN_NEW_PASSWORD ?? 'AdminSmoke1!';
  await page.getByLabel('Current password').fill(ADMIN_PASSWORD);
  await page.getByLabel('New password (min 8 characters)').fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(header).toBeHidden({ timeout: 60_000 });
}

async function closeSettingsIfOpen(page: Page): Promise<void> {
  const settingsMask = page.locator('.settings-modal');
  if (!(await settingsMask.isVisible().catch(() => false))) {
    return;
  }
  await page.keyboard.press('Escape');
  await expect(settingsMask).toBeHidden({ timeout: 15_000 }).catch(() => {
    // Settings may stay open when dashboard is not fully enabled; launch is still reachable in DOM.
  });
}

/** Password login via Settings → Login (seed admin unless env overrides). */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/');
  await openLoginDialogIfNeeded(page);

  const loginDialog = theLabLoginDialog(page);
  await loginDialog.getByPlaceholder('Username', { exact: true }).fill(ADMIN_USER);
  await loginDialog.getByPlaceholder('Password', { exact: true }).fill(ADMIN_PASSWORD);
  await loginDialog.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: LOGIN_HEADING })).toBeHidden({ timeout: 60_000 });
  await completeForcedPasswordChangeIfShown(page);

  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 30_000 });

  await closeSettingsIfOpen(page);

  await focusAppsWorkspace(page);

  await page.waitForFunction(
    () => document.documentElement.dataset.labAppsHydrated === '1',
    { timeout: 180_000 },
  );

  await expect(
    page.locator('button[data-app-id="app-ui-component-gallery"]').filter({ hasText: 'Launch' }),
  ).toBeVisible({ timeout: 60_000 });
}

async function focusAppsWorkspace(page: Page): Promise<void> {
  await page.locator('.app-view-container').click({ position: { x: 32, y: 160 } });
}
