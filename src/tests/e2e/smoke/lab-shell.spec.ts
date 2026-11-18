import { test } from '@playwright/test';
import { loginAsAdmin } from './helpers/lab-auth';
import { launchSmokeCatalogApp, SMOKE_UI_COMPONENT_GALLERY } from './helpers/smoke-catalog-app';

test.describe('lab shell smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('launches UI Component Gallery', async ({ page }) => {
    test.setTimeout(180_000);
    await launchSmokeCatalogApp(page, SMOKE_UI_COMPONENT_GALLERY);
  });
});
