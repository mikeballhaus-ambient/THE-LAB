import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { CATALOG_HOST_APP_IDS } from '@/shared/lab-integrations/catalog-manifests';

const ROOT = process.cwd();

/** Catalog hosts with Chart Builder report slots (excludes weather + knowledge-base exceptions). */
const REPORTS_HOSTS = CATALOG_HOST_APP_IDS.filter(
  (id) => id !== 'app-weather-dashboard' && id !== 'app-knowledge-base',
);

describe('catalog workspace live chart refresh wiring', () => {
  test.each(REPORTS_HOSTS)('%s App.vue uses workspace refresh + chart context', (hostAppId) => {
    const appFolder = hostAppId.replace(/^app-/, '');
    const appVue = path.join(ROOT, 'src/apps', appFolder, 'front-end/App.vue');
    expect(fs.existsSync(appVue)).toBe(true);
    const source = fs.readFileSync(appVue, 'utf8');
    expect(source).toContain('useCatalogWorkspaceRefresh');
    expect(source).toContain(':chart-context="reportsChartContext"');
    expect(source).toContain('CatalogAppReportsSection');
  });

  test.each(REPORTS_HOSTS)('%s server registers catalog host socket broadcast', (hostAppId) => {
    const appFolder = hostAppId.replace(/^app-/, '');
    const serverTs = path.join(ROOT, 'src/apps', appFolder, 'back-end/server.ts');
    expect(fs.existsSync(serverTs)).toBe(true);
    const source = fs.readFileSync(serverTs, 'utf8');
    expect(source).toMatch(/attachSocketIO:\s*true/);
    expect(source).toContain(`catalogHostAppId: '${hostAppId}'`);
  });
});
