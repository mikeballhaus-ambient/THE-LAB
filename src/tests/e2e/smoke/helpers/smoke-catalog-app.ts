import { expect, type Page } from '@playwright/test';

/** v1 allowlist — browser/hybrid shells only; no chat/MCP (D-07). */
export type SmokeCatalogApp = {
  appId: string;
  displayName: string;
  rootClass: string;
  /** Visible heading after mount — stronger than CSS alone. */
  mountHeading: string;
};

export const SMOKE_UI_COMPONENT_GALLERY: SmokeCatalogApp = {
  appId: 'app-ui-component-gallery',
  displayName: 'UI Component Gallery',
  rootClass: 'ui-component-gallery-app',
  mountHeading: 'PrimeVue Component Gallery',
};

async function focusAppsWorkspace(page: Page): Promise<void> {
  await page.locator('.app-view-container').click({ position: { x: 32, y: 160 } });
}

async function waitForAppRegistryHydrated(page: Page): Promise<void> {
  await page.waitForFunction(
  () => document.documentElement.dataset.labAppsHydrated === '1',
  { timeout: 180_000 },
  );
}

export async function launchSmokeCatalogApp(page: Page, app: SmokeCatalogApp): Promise<void> {
  await focusAppsWorkspace(page);
  await waitForAppRegistryHydrated(page);

  const catalog = page.locator('.app-list-container').first();
  const search = catalog.getByPlaceholder('Search apps…');
  if (await search.isVisible().catch(() => false)) {
    await search.fill(app.displayName);
  }

  const launchButton = page
    .locator(`button[data-app-id="${app.appId}"]`)
    .filter({ hasText: 'Launch' })
    .first();

  await launchButton.scrollIntoViewIfNeeded();
  await expect(launchButton).toBeVisible();
  await expect(launchButton).toBeEnabled();
  await launchButton.click();

  const tabContainer = page.locator(`#tab-container-${app.appId}`);
  await expect(tabContainer).toBeAttached({ timeout: 90_000 });
  await expect(tabContainer).toBeVisible({ timeout: 90_000 });

  const appChrome = tabContainer.locator(`#app-${app.appId}`);
  await expect(appChrome).toBeAttached({ timeout: 120_000 });

  const appRoot = appChrome.locator(`.${app.rootClass}`);
  await expect(appRoot).toBeVisible({ timeout: 120_000 });

  await expect(page.getByRole('heading', { name: app.mountHeading, level: 1 })).toBeVisible();
}
