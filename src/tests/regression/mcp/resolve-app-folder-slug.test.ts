import { resolveAppFolderSlugFromRecord } from '@/backend/mcp/mcp-servers/apps/utils/resolve-app-folder-slug';
import type { IApp } from '@/shared/types';

describe('resolveAppFolderSlugFromRecord', () => {
  test('reads slug from hybrid componentPath', () => {
    const app = {
      id: 'app-smoke-test',
      type: 'hybrid',
      componentPath: '/src/apps/smoke-test/front-end/App.vue',
    } as IApp;
    expect(resolveAppFolderSlugFromRecord(app)).toBe('smoke-test');
  });

  test('reads slug from server entry', () => {
    const app = {
      id: 'app-example-server',
      type: 'server',
      server: { entry: '/src/apps/example-server/back-end/entry.ts', port: 3001 },
    } as IApp;
    expect(resolveAppFolderSlugFromRecord(app)).toBe('example-server');
  });
});
